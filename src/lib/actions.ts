"use server";
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { GlobalData, PurchaseItem, SalesItem, Asset, Settings } from './definitions';

const safeParseFloat = (val: any): number => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
};

type ActionState = {
  message: string;
  status: 'success' | 'error';
  data?: GlobalData | null;
} | null;


// --- Purchase Invoice Action ---
export async function createPurchase(db: GlobalData, formData: FormData): Promise<ActionState> {
    const items = JSON.parse(formData.get('items') as string) as PurchaseItem[];
    const totalFaktur = safeParseFloat(formData.get('total'));

    const purchaseData = {
        id: `pur-${Date.now()}`,
        No_Faktur: formData.get('invoiceNumber') as string,
        Supplier: formData.get('supplier') as string,
        Tanggal: formData.get('date') as string,
        Total_Faktur: totalFaktur,
        Status: 'Completed',
        items,
    };
    
    try {
        let updatedDb = { ...db };

        // 1. Add purchase invoice
        updatedDb.purchaseInvoices = [...updatedDb.purchaseInvoices, purchaseData];

        // 2. Add transaction record
        const transactionData = {
            id: `trx-${Date.now()}`,
            Tanggal: purchaseData.Tanggal,
            Deskripsi: `Pembelian dari ${purchaseData.Supplier}`,
            Referensi: purchaseData.No_Faktur,
            Kategori: 'Pembelian/Kredit',
            Debit: 0,
            Kredit: purchaseData.Total_Faktur,
            balance: 0, // placeholder
        };
        updatedDb.transactions = [...updatedDb.transactions, transactionData];

        // 3. Update warehouse stock
        let newWarehouseData = [...updatedDb.warehouseData];
        for (const item of items) {
            const warehouseItemIndex = newWarehouseData.findIndex(wh => wh.Nama_Green_Beans === item.name);
            
            const qty = safeParseFloat(item.qty);
            const price = safeParseFloat(item.price);
            const totalValueItem = qty * price;

            if (warehouseItemIndex > -1) {
                const warehouseItem = { ...newWarehouseData[warehouseItemIndex] };
                const oldStock = safeParseFloat(warehouseItem.Stock_Kg);
                const oldTotalValue = safeParseFloat(warehouseItem.Total_Value);
                
                const newStock = oldStock + qty;
                const newTotalValue = oldTotalValue + totalValueItem;
                const newAvgHPP = newStock > 0 ? newTotalValue / newStock : 0;
                
                warehouseItem.Stock_Kg = newStock;
                warehouseItem.Total_Value = newTotalValue;
                warehouseItem.Avg_HPP = newAvgHPP;
                warehouseItem.Last_Update = purchaseData.Tanggal;
                newWarehouseData[warehouseItemIndex] = warehouseItem;
            } else {
                newWarehouseData.push({
                    id: item.name.replace(/\s+/g, '-').toLowerCase(),
                    Nama_Green_Beans: item.name,
                    Stock_Kg: qty,
                    Avg_HPP: price,
                    Total_Value: totalValueItem,
                    Last_Update: purchaseData.Tanggal,
                });
            }
        }
        updatedDb.warehouseData = newWarehouseData;
        
        revalidatePath('/');
        return { message: 'Faktur pembelian berhasil dibuat!', status: 'success', data: updatedDb };
    } catch (e: any) {
        console.error("Error creating purchase:", e);
        return { message: `Gagal membuat faktur: ${e.message}`, status: 'error', data: db };
    }
}


// --- Roasting Batch Action ---
export async function createRoastingBatch(db: GlobalData, formData: FormData): Promise<ActionState> {
    const inputKg = safeParseFloat(formData.get('inputQty'));
    const yieldPercent = safeParseFloat(formData.get('yieldPercent'));
    const outputKg = inputKg * (yieldPercent / 100);

    const batchData = {
        id: `rb-${Date.now()}`,
        Batch_ID: formData.get('batchId') as string,
        Tanggal: formData.get('date') as string,
        Green_Beans: formData.get('greenBeans') as string,
        Input_Kg: inputKg,
        Output_Kg: outputKg,
        Yield_Persen: `${yieldPercent}%`,
        Profile: formData.get('profile') as string,
        HPP_Per_Kg: safeParseFloat(formData.get('hppPerKg')),
        Harga_Jual_Kg: safeParseFloat(formData.get('sellPrice')),
        Status: 'Completed',
    };

    try {
        let updatedDb = { ...db };
        
        // 1. Check warehouse stock
        const warehouseItemIndex = updatedDb.warehouseData.findIndex(b => b.Nama_Green_Beans === batchData.Green_Beans);

        if (warehouseItemIndex === -1 || safeParseFloat(updatedDb.warehouseData[warehouseItemIndex].Stock_Kg) < batchData.Input_Kg) {
            throw new Error(`Stok ${batchData.Green_Beans} tidak mencukupi.`);
        }
        
        // 2. Add roasting batch
        updatedDb.roastingBatches = [...updatedDb.roastingBatches, batchData];

        // 3. Update warehouse stock (deduct)
        const warehouseItem = { ...updatedDb.warehouseData[warehouseItemIndex] };
        const oldStock = safeParseFloat(warehouseItem.Stock_Kg);
        const oldTotalValue = safeParseFloat(warehouseItem.Total_Value);
        const avgHPP = oldStock > 0 ? oldTotalValue / oldStock : 0;

        const newStock = oldStock - batchData.Input_Kg;
        const newTotalValue = newStock * avgHPP;
        
        warehouseItem.Stock_Kg = newStock;
        warehouseItem.Total_Value = newTotalValue;
        warehouseItem.Last_Update = batchData.Tanggal;
        updatedDb.warehouseData[warehouseItemIndex] = warehouseItem;

        // 4. Update/create roasted inventory
        let newRoastedInventory = [...updatedDb.roastedInventory];
        const roastedProductName = `${batchData.Green_Beans} - ${batchData.Profile}`;
        const roastedInvItemIndex = newRoastedInventory.findIndex(item => item.Produk_Roasting === roastedProductName);
        
        if (roastedInvItemIndex > -1) {
            const roastedInvItem = { ...newRoastedInventory[roastedInvItemIndex] };
            const oldRoastedStock = safeParseFloat(roastedInvItem.Stock_Kg);
            const oldRoastedValue = safeParseFloat(roastedInvItem.Total_Value);

            const newRoastedStock = oldRoastedStock + batchData.Output_Kg;
            const newRoastedValue = oldRoastedValue + (batchData.HPP_Per_Kg * batchData.Output_Kg);
            const newRoastedAvgHPP = newRoastedStock > 0 ? newRoastedValue / newRoastedStock : batchData.HPP_Per_Kg;

            roastedInvItem.Stock_Kg = newRoastedStock;
            roastedInvItem.Total_Value = newRoastedValue;
            roastedInvItem.HPP_Per_Kg = newRoastedAvgHPP;
            roastedInvItem.Harga_Jual_Kg = batchData.Harga_Jual_Kg;
            newRoastedInventory[roastedInvItemIndex] = roastedInvItem;
        } else {
            newRoastedInventory.push({
                id: roastedProductName.replace(/\s+/g, '-').toLowerCase(),
                Produk_Roasting: roastedProductName,
                Stock_Kg: batchData.Output_Kg,
                HPP_Per_Kg: batchData.HPP_Per_Kg,
                Harga_Jual_Kg: batchData.Harga_Jual_Kg,
                Total_Value: batchData.HPP_Per_Kg * batchData.Output_Kg,
            });
        }
        updatedDb.roastedInventory = newRoastedInventory;

        // 5. Add operational costs to transactions
        const totalOpCost = safeParseFloat(formData.get('gasCost')) + safeParseFloat(formData.get('laborCost')) + safeParseFloat(formData.get('otherCost'));
        if (totalOpCost > 0) {
            updatedDb.transactions = [...updatedDb.transactions, {
                id: `trx-${Date.now()}-op`,
                Tanggal: batchData.Tanggal,
                Deskripsi: `Biaya operasional untuk batch ${batchData.Batch_ID}`,
                Referensi: batchData.Batch_ID,
                Kategori: 'Biaya Operasional',
                Debit: 0,
                Kredit: totalOpCost,
                balance: 0, // placeholder
            }];
        }
        
        revalidatePath('/');
        return { message: 'Batch roasting berhasil diproses!', status: 'success', data: updatedDb };
    } catch (e: any) {
        console.error("Error creating roasting batch:", e);
        return { message: `Gagal memproses batch: ${e.message}`, status: 'error', data: db };
    }
}


// --- Transfer to Store Action ---
export async function transferToStore(db: GlobalData, itemsToTransfer: { id: string }[]): Promise<ActionState> {
    if (!itemsToTransfer || itemsToTransfer.length === 0) {
        return { message: 'Tidak ada item yang dipilih untuk ditransfer.', status: 'error', data: db };
    }
    
    try {
        let updatedDb = { ...db };
        let newRoastedInventory = [...updatedDb.roastedInventory];
        let newStoreInventory = [...updatedDb.storeInventory];

        for (const item of itemsToTransfer) {
            const roastedIndex = newRoastedInventory.findIndex(i => i.id === item.id);
            if (roastedIndex === -1) continue;
            
            const roastedDoc = newRoastedInventory[roastedIndex];
            const stockToTransfer = safeParseFloat(roastedDoc.Stock_Kg);

            if (stockToTransfer <= 0) continue;

            // Move to store inventory
            const storeInvIndex = newStoreInventory.findIndex(si => si.Nama_Produk === roastedDoc.Produk_Roasting);
            const hpp = safeParseFloat(roastedDoc.HPP_Per_Kg);
            const valueToTransfer = stockToTransfer * hpp;

            if (storeInvIndex > -1) {
                const storeInvItem = { ...newStoreInventory[storeInvIndex] };
                const oldStoreStock = safeParseFloat(storeInvItem.Stock_Kg);
                const oldStoreValue = safeParseFloat(storeInvItem.Total_Value);
                
                const newStoreStock = oldStoreStock + stockToTransfer;
                const newStoreValue = oldStoreValue + valueToTransfer;
                const newAvgHPP = newStoreStock > 0 ? newStoreValue / newStoreStock : 0;
                
                storeInvItem.Stock_Kg = newStoreStock;
                storeInvItem.Total_Value = newStoreValue;
                storeInvItem.HPP_Per_Kg = newAvgHPP;
                storeInvItem.Harga_Jual_Kg = roastedDoc.Harga_Jual_Kg;
                newStoreInventory[storeInvIndex] = storeInvItem;
            } else {
                newStoreInventory.push({
                    id: roastedDoc.Produk_Roasting.replace(/\s+/g, '-').toLowerCase(),
                    Nama_Produk: roastedDoc.Produk_Roasting,
                    Kategori: 'Roasted Beans',
                    Stock_Kg: stockToTransfer,
                    HPP_Per_Kg: hpp,
                    Harga_Jual_Kg: roastedDoc.Harga_Jual_Kg,
                    Total_Value: valueToTransfer,
                });
            }
            
            // Set roasted inventory stock to 0
            roastedDoc.Stock_Kg = 0;
            roastedDoc.Total_Value = 0;
            newRoastedInventory[roastedIndex] = roastedDoc;
        }

        updatedDb.roastedInventory = newRoastedInventory;
        updatedDb.storeInventory = newStoreInventory;

        revalidatePath('/');
        return { message: `${itemsToTransfer.length} item berhasil ditransfer ke toko.`, status: 'success', data: updatedDb };
    } catch (e: any) {
        console.error("Error transferring to store:", e);
        return { message: `Gagal mentransfer: ${e.message}`, status: 'error', data: db };
    }
}

// --- Sales Invoice Action ---
export async function createSale(db: GlobalData, formData: FormData): Promise<ActionState> {
    const items = JSON.parse(formData.get('items') as string) as SalesItem[];
    const totalInvoice = safeParseFloat(formData.get('total'));
    const paymentStatus = formData.get('paymentStatus') as string;

    const salesData = {
        id: `sale-${Date.now()}`,
        No_Invoice: formData.get('invoiceNumber') as string,
        Customer: formData.get('customerName') as string,
        Tanggal: formData.get('date') as string,
        Jatuh_Tempo: formData.get('dueDate') as string,
        Total_Invoice: totalInvoice,
        Status_Bayar: paymentStatus as any,
        Metode_Pembayaran: formData.get('paymentMethod') as string,
        items,
    };
    
    try {
        let updatedDb = { ...db };
        let newTransactions = [...updatedDb.transactions];
        let newStoreInventory = [...updatedDb.storeInventory];

        // 1. Add sales invoice
        updatedDb.salesInvoices = [...updatedDb.salesInvoices, salesData];

        // 2. Add transaction if payment is made
        if (paymentStatus === 'Paid' || salesData.Metode_Pembayaran !== 'Credit') {
            newTransactions.push({
                id: `trx-${Date.now()}-sale`,
                Tanggal: salesData.Tanggal,
                Deskripsi: `Penjualan kepada ${salesData.Customer}`,
                Referensi: salesData.No_Invoice,
                Kategori: 'Penjualan/Debit',
                Debit: salesData.Total_Invoice,
                Kredit: 0,
                balance: 0, // placeholder
            });
        }

        // 3. Deduct store inventory and calculate COGS
        let totalCOGS = 0;
        for (const item of items) {
            const storeItemIndex = newStoreInventory.findIndex(si => si.Nama_Produk === item.name);

            if (storeItemIndex === -1) throw new Error(`Produk ${item.name} tidak ditemukan di toko.`);
            
            const storeItem = { ...newStoreInventory[storeItemIndex] };
            const qtySold = safeParseFloat(item.qty);
            const oldStock = safeParseFloat(storeItem.Stock_Kg);

            if (oldStock < qtySold) throw new Error(`Stok ${item.name} tidak cukup.`);
            
            const avgHPP = safeParseFloat(storeItem.HPP_Per_Kg);
            totalCOGS += qtySold * avgHPP;

            const newStock = oldStock - qtySold;
            const newTotalValue = newStock * avgHPP;
            
            storeItem.Stock_Kg = newStock;
            storeItem.Total_Value = newTotalValue;
            newStoreInventory[storeItemIndex] = storeItem;
        }

        // 4. Add COGS transaction
        if (totalCOGS > 0) {
            newTransactions.push({
                id: `trx-${Date.now()}-cogs`,
                Tanggal: salesData.Tanggal,
                Deskripsi: `Beban Pokok Penjualan untuk ${salesData.No_Invoice}`,
                Referensi: salesData.No_Invoice,
                Kategori: 'COGS/Kredit',
                Debit: 0,
                Kredit: totalCOGS,
                balance: 0, // placeholder
            });
        }
        
        updatedDb.transactions = newTransactions;
        updatedDb.storeInventory = newStoreInventory;
        
        revalidatePath('/');
        return { message: 'Invoice penjualan berhasil dibuat!', status: 'success', data: updatedDb };
    } catch (e: any) {
        console.error("Error creating sale:", e);
        return { message: `Gagal membuat invoice: ${e.message}`, status: 'error', data: db };
    }
}


// --- Add Manual Stock Action ---
export async function addManualStock(db: GlobalData, formData: FormData): Promise<ActionState> {
     const stockData = {
        Nama_Produk: formData.get('productName') as string,
        Kategori: formData.get('category') as string,
        Stock_Kg: safeParseFloat(formData.get('stock')),
        HPP_Per_Kg: safeParseFloat(formData.get('hpp')),
        Harga_Jual_Kg: safeParseFloat(formData.get('sellPrice')),
    };
    
    try {
        let updatedDb = { ...db };
        let newStoreInventory = [...updatedDb.storeInventory];
        const storeItemIndex = newStoreInventory.findIndex(si => si.Nama_Produk === stockData.Nama_Produk);

        if (storeItemIndex > -1) {
            let storeItem = { ...newStoreInventory[storeItemIndex] };
            storeItem.Stock_Kg = stockData.Stock_Kg;
            storeItem.HPP_Per_Kg = stockData.HPP_Per_Kg;
            storeItem.Harga_Jual_Kg = stockData.Harga_Jual_Kg;
            storeItem.Total_Value = stockData.Stock_Kg * stockData.HPP_Per_Kg;
            storeItem.Kategori = stockData.Kategori;
            newStoreInventory[storeItemIndex] = storeItem;
        } else {
            newStoreInventory.push({
                id: stockData.Nama_Produk.replace(/\s+/g, '-').toLowerCase(),
                ...stockData,
                Total_Value: stockData.Stock_Kg * stockData.HPP_Per_Kg,
            });
        }
        updatedDb.storeInventory = newStoreInventory;

        revalidatePath('/');
        return { message: 'Stok manual berhasil ditambahkan/diupdate!', status: 'success', data: updatedDb };
    } catch (e: any) {
        console.error("Error adding manual stock:", e);
        return { message: `Gagal menambahkan stok: ${e.message}`, status: 'error', data: db };
    }
}

// --- Asset Action ---
export async function createAsset(db: GlobalData, formData: FormData): Promise<ActionState> {
    const value = safeParseFloat(formData.get('value'));
    const assetData: Asset = {
        id: `asset-${Date.now()}`,
        Nama_Aset: formData.get('name') as string,
        Kategori: formData.get('category') as string,
        Tgl_Perolehan: formData.get('date') as string,
        Nilai_Perolehan: value,
        Penyusutan_Tahun: safeParseFloat(formData.get('depreciation')),
    };

    try {
        let updatedDb = { ...db };
        updatedDb.assetsData = [...updatedDb.assetsData, assetData];

        revalidatePath('/');
        return { message: 'Aset berhasil dicatat!', status: 'success', data: updatedDb };
    } catch (e: any) {
        console.error("Error saving asset:", e);
        return { message: `Gagal mencatat aset: ${e.message}`, status: 'error', data: db };
    }
}

// --- Settings Action ---
export async function saveSettings(db: GlobalData, formData: FormData): Promise<ActionState> {
    const SettingsSchema = z.object({
        company_name: z.string().min(1, "Nama perusahaan wajib diisi"),
        stock_low_limit: z.coerce.number().min(0, "Batas stok tidak boleh negatif"),
        modal_awal: z.coerce.number().min(0, "Modal awal tidak boleh negatif"),
    });

    const parsed = SettingsSchema.safeParse({
        company_name: formData.get('company_name'),
        stock_low_limit: formData.get('stock_low_limit'),
        modal_awal: formData.get('modal_awal'),
    });

    if (!parsed.success) {
        return { message: 'Data tidak valid.', status: 'error', errors: parsed.error.flatten().fieldErrors, data: db };
    }

    try {
        let updatedDb = { ...db };
        updatedDb.settings = { ...updatedDb.settings, ...parsed.data };
        
        revalidatePath('/');
        return { message: 'Pengaturan berhasil disimpan!', status: 'success', data: updatedDb };
    } catch (e: any) {
        console.error("Error saving settings:", e);
        return { message: `Gagal menyimpan pengaturan: ${e.message}`, status: 'error', data: db };
    }
}


// --- Reset Data Action ---
export async function resetAllData(db: GlobalData): Promise<ActionState> {
    try {
        // preserve settings
        const settings = db.settings; 
        
        const newDb: GlobalData = {
            warehouseData: [],
            roastingBatches: [],
            roastedInventory: [],
            storeInventory: [],
            salesInvoices: [],
            purchaseInvoices: [],
            transactions: [],
            assetsData: [],
            settings: settings, // keep old settings
            nextIds: db.nextIds, // keep nextids
            currentBalance: settings.modal_awal || 0
        };
        
        revalidatePath('/');
        return { message: 'Semua data transaksi berhasil direset! Pengaturan tidak berubah.', status: 'success', data: newDb };
    } catch (e: any) {
        console.error("Error resetting data:", e);
        return { message: `Reset gagal: ${e.message}`, status: 'error', data: db };
    }
}

    