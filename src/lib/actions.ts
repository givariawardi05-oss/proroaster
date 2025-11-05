"use server";
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { GlobalData, PurchaseItem, SalesItem, Asset, Settings, StorableGlobalData, BlendComponent } from './definitions';

const safeParseFloat = (val: any): number => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
};

type ActionState = {
  message: string;
  status: 'success' | 'error';
  data?: StorableGlobalData;
  errors?: any;
} | null;


// --- Purchase Invoice Action ---
export async function createPurchase(prevState: ActionState, formData: FormData): Promise<ActionState> {
    try {
        const db: GlobalData = JSON.parse(formData.get('currentData') as string);
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
    
        let updatedDb: StorableGlobalData = {
            purchaseInvoices: [...db.purchaseInvoices, purchaseData],
            transactions: [...db.transactions],
            warehouseData: [...db.warehouseData],
            roastingBatches: db.roastingBatches,
            roastedInventory: db.roastedInventory,
            storeInventory: db.storeInventory,
            salesInvoices: db.salesInvoices,
            assetsData: db.assetsData,
            settings: db.settings,
        };

        // 2. Add transaction record
        const transactionData = {
            id: `trx-${Date.now()}`,
            Tanggal: purchaseData.Tanggal,
            Deskripsi: `Pembelian dari ${purchaseData.Supplier}`,
            Referensi: purchaseData.No_Faktur,
            Kategori: 'Pembelian/Kredit',
            Debit: 0,
            Kredit: purchaseData.Total_Faktur,
        };
        updatedDb.transactions.push(transactionData);

        // 3. Update warehouse stock
        for (const item of items) {
            const warehouseItemIndex = updatedDb.warehouseData.findIndex(wh => wh.Nama_Green_Beans === item.name);
            
            const qty = safeParseFloat(item.qty);
            const price = safeParseFloat(item.price);
            const totalValueItem = qty * price;

            if (warehouseItemIndex > -1) {
                const warehouseItem = updatedDb.warehouseData[warehouseItemIndex];
                const oldStock = safeParseFloat(warehouseItem.Stock_Kg);
                const oldTotalValue = safeParseFloat(warehouseItem.Total_Value);
                
                const newStock = oldStock + qty;
                const newTotalValue = oldTotalValue + totalValueItem;
                const newAvgHPP = newStock > 0 ? newTotalValue / newStock : 0;
                
                warehouseItem.Stock_Kg = newStock;
                warehouseItem.Total_Value = newTotalValue;
                warehouseItem.Avg_HPP = newAvgHPP;
                warehouseItem.Last_Update = purchaseData.Tanggal;
            } else {
                updatedDb.warehouseData.push({
                    id: item.name.replace(/\s+/g, '-').toLowerCase(),
                    Nama_Green_Beans: item.name,
                    Stock_Kg: qty,
                    Avg_HPP: price,
                    Total_Value: totalValueItem,
                    Last_Update: purchaseData.Tanggal,
                });
            }
        }
        
        revalidatePath('/');
        return { message: 'Faktur pembelian berhasil dibuat!', status: 'success', data: updatedDb };
    } catch (e: any) {
        console.error("Error creating purchase:", e);
        return { message: `Gagal membuat faktur: ${e.message}`, status: 'error' };
    }
}


// --- Roasting Batch Action ---
export async function createRoastingBatch(prevState: ActionState, formData: FormData): Promise<ActionState> {
    try {
        const db: GlobalData = JSON.parse(formData.get('currentData') as string);
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

        let updatedDb: StorableGlobalData = {
            purchaseInvoices: db.purchaseInvoices,
            transactions: [...db.transactions],
            warehouseData: [...db.warehouseData],
            roastingBatches: [...db.roastingBatches],
            roastedInventory: [...db.roastedInventory],
            storeInventory: db.storeInventory,
            salesInvoices: db.salesInvoices,
            assetsData: db.assetsData,
            settings: db.settings,
        };
        
        // 1. Check warehouse stock
        const warehouseItemIndex = updatedDb.warehouseData.findIndex(b => b.Nama_Green_Beans === batchData.Green_Beans);

        if (warehouseItemIndex === -1 || safeParseFloat(updatedDb.warehouseData[warehouseItemIndex].Stock_Kg) < batchData.Input_Kg) {
            throw new Error(`Stok ${batchData.Green_Beans} tidak mencukupi.`);
        }
        
        // 2. Add roasting batch
        updatedDb.roastingBatches.push(batchData);

        // 3. Update warehouse stock (deduct)
        const warehouseItem = updatedDb.warehouseData[warehouseItemIndex];
        const oldStock = safeParseFloat(warehouseItem.Stock_Kg);
        const avgHPP = warehouseItem.Avg_HPP;

        const newStock = oldStock - batchData.Input_Kg;
        const newTotalValue = newStock * avgHPP;
        
        warehouseItem.Stock_Kg = newStock;
        warehouseItem.Total_Value = newTotalValue;
        warehouseItem.Last_Update = batchData.Tanggal;

        // 4. Update/create roasted inventory
        const roastedProductName = `${batchData.Green_Beans} - ${batchData.Profile}`;
        const roastedInvItemIndex = updatedDb.roastedInventory.findIndex(item => item.Produk_Roasting === roastedProductName);
        
        if (roastedInvItemIndex > -1) {
            const roastedInvItem = updatedDb.roastedInventory[roastedInvItemIndex];
            const oldRoastedStock = safeParseFloat(roastedInvItem.Stock_Kg);
            const oldRoastedValue = safeParseFloat(roastedInvItem.Total_Value);

            const newRoastedStock = oldRoastedStock + batchData.Output_Kg;
            const newRoastedValue = oldRoastedValue + (batchData.HPP_Per_Kg * batchData.Output_Kg);
            const newRoastedAvgHPP = newRoastedStock > 0 ? newRoastedValue / newRoastedStock : batchData.HPP_Per_Kg;

            roastedInvItem.Stock_Kg = newRoastedStock;
            roastedInvItem.Total_Value = newRoastedValue;
            roastedInvItem.HPP_Per_Kg = newRoastedAvgHPP;
            roastedInvItem.Harga_Jual_Kg = batchData.Harga_Jual_Kg;
        } else {
            updatedDb.roastedInventory.push({
                id: roastedProductName.replace(/\s+/g, '-').toLowerCase(),
                Produk_Roasting: roastedProductName,
                Stock_Kg: batchData.Output_Kg,
                HPP_Per_Kg: batchData.HPP_Per_Kg,
                Harga_Jual_Kg: batchData.Harga_Jual_Kg,
                Total_Value: batchData.HPP_Per_Kg * batchData.Output_Kg,
            });
        }

        // 5. Add operational costs to transactions
        const totalOpCost = safeParseFloat(formData.get('gasCost')) + safeParseFloat(formData.get('laborCost')) + safeParseFloat(formData.get('otherCost'));
        if (totalOpCost > 0) {
            updatedDb.transactions.push({
                id: `trx-${Date.now()}-op`,
                Tanggal: batchData.Tanggal,
                Deskripsi: `Biaya operasional untuk batch ${batchData.Batch_ID}`,
                Referensi: batchData.Batch_ID,
                Kategori: 'Biaya Operasional',
                Debit: 0,
                Kredit: totalOpCost,
            });
        }
        
        revalidatePath('/');
        return { message: 'Batch roasting berhasil diproses!', status: 'success', data: updatedDb };
    } catch (e: any) {
        console.error("Error creating roasting batch:", e);
        return { message: `Gagal memproses batch: ${e.message}`, status: 'error' };
    }
}


// --- Transfer to Store Action ---
export async function transferToStore(prevState: ActionState, formData: FormData): Promise<ActionState> {
    
    try {
        const db: GlobalData = JSON.parse(formData.get('currentData') as string);
        const itemsToTransfer: { id: string }[] = JSON.parse(formData.get('itemsToTransfer') as string);

        if (!itemsToTransfer || itemsToTransfer.length === 0) {
            return { message: 'Tidak ada item yang dipilih untuk ditransfer.', status: 'error' };
        }

        let updatedDb: StorableGlobalData = {
            purchaseInvoices: [...db.purchaseInvoices],
            transactions: [...db.transactions],
            warehouseData: [...db.warehouseData],
            roastingBatches: [...db.roastingBatches],
            roastedInventory: [...db.roastedInventory],
            storeInventory: [...db.storeInventory],
            salesInvoices: [...db.salesInvoices],
            assetsData: [...db.assetsData],
            settings: db.settings,
        };

        for (const item of itemsToTransfer) {
            const roastedIndex = updatedDb.roastedInventory.findIndex(i => i.id === item.id);
            if (roastedIndex === -1) continue;
            
            const roastedDoc = updatedDb.roastedInventory[roastedIndex];
            const stockToTransfer = safeParseFloat(roastedDoc.Stock_Kg);

            if (stockToTransfer <= 0) continue;

            // Move to store inventory
            const storeInvIndex = updatedDb.storeInventory.findIndex(si => si.Nama_Produk === roastedDoc.Produk_Roasting);
            const hpp = safeParseFloat(roastedDoc.HPP_Per_Kg);
            const valueToTransfer = stockToTransfer * hpp;

            if (storeInvIndex > -1) {
                const storeInvItem = updatedDb.storeInventory[storeInvIndex];
                const oldStoreStock = safeParseFloat(storeInvItem.Stock_Kg);
                const oldStoreValue = safeParseFloat(storeInvItem.Total_Value);
                
                const newStoreStock = oldStoreStock + stockToTransfer;
                const newStoreValue = oldStoreValue + valueToTransfer;
                const newAvgHPP = newStoreStock > 0 ? newStoreValue / newStoreStock : 0;
                
                storeInvItem.Stock_Kg = newStoreStock;
                storeInvItem.Total_Value = newStoreValue;
                storeInvItem.HPP_Per_Kg = newAvgHPP;
                storeInvItem.Harga_Jual_Kg = roastedDoc.Harga_Jual_Kg;
            } else {
                updatedDb.storeInventory.push({
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
        }

        revalidatePath('/');
        return { message: `${itemsToTransfer.length} item berhasil ditransfer ke toko.`, status: 'success', data: updatedDb };
    } catch (e: any) {
        console.error("Error transferring to store:", e);
        return { message: `Gagal mentransfer: ${e.message}`, status: 'error' };
    }
}

// --- Sales Invoice Action ---
export async function createSale(prevState: ActionState, formData: FormData): Promise<ActionState> {
    try {
        const db: GlobalData = JSON.parse(formData.get('currentData') as string);
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
        
        let updatedDb: StorableGlobalData = {
            purchaseInvoices: db.purchaseInvoices,
            transactions: [...db.transactions],
            warehouseData: db.warehouseData,
            roastingBatches: db.roastingBatches,
            roastedInventory: db.roastedInventory,
            storeInventory: [...db.storeInventory],
            salesInvoices: [...db.salesInvoices, salesData],
            assetsData: db.assetsData,
            settings: db.settings,
        };

        // 2. Add transaction if payment is made
        if (paymentStatus === 'Paid' || salesData.Metode_Pembayaran !== 'Credit') {
            updatedDb.transactions.push({
                id: `trx-${Date.now()}-sale`,
                Tanggal: salesData.Tanggal,
                Deskripsi: `Penjualan kepada ${salesData.Customer}`,
                Referensi: salesData.No_Invoice,
                Kategori: 'Penjualan/Debit',
                Debit: salesData.Total_Invoice,
                Kredit: 0,
            });
        }

        // 3. Deduct store inventory and calculate COGS
        let totalCOGS = 0;
        for (const item of items) {
            const storeItemIndex = updatedDb.storeInventory.findIndex(si => si.Nama_Produk === item.name);

            if (storeItemIndex === -1) throw new Error(`Produk ${item.name} tidak ditemukan di toko.`);
            
            const storeItem = updatedDb.storeInventory[storeItemIndex];
            const qtySold = safeParseFloat(item.qty);
            const oldStock = safeParseFloat(storeItem.Stock_Kg);

            if (oldStock < qtySold) throw new Error(`Stok ${item.name} tidak cukup.`);
            
            const avgHPP = safeParseFloat(storeItem.HPP_Per_Kg);
            totalCOGS += qtySold * avgHPP;

            const newStock = oldStock - qtySold;
            const newTotalValue = newStock * avgHPP;
            
            storeItem.Stock_Kg = newStock;
            storeItem.Total_Value = newTotalValue;
        }

        // 4. Add COGS transaction
        if (totalCOGS > 0) {
            updatedDb.transactions.push({
                id: `trx-${Date.now()}-cogs`,
                Tanggal: salesData.Tanggal,
                Deskripsi: `Beban Pokok Penjualan untuk ${salesData.No_Invoice}`,
                Referensi: salesData.No_Invoice,
                Kategori: 'COGS/Kredit',
                Debit: 0,
                Kredit: totalCOGS,
            });
        }
        
        revalidatePath('/');
        return { message: 'Invoice penjualan berhasil dibuat!', status: 'success', data: updatedDb };
    } catch (e: any) {
        console.error("Error creating sale:", e);
        return { message: `Gagal membuat invoice: ${e.message}`, status: 'error' };
    }
}


// --- Add Manual Stock Action ---
export async function addManualStock(prevState: ActionState, formData: FormData): Promise<ActionState> {
    try {
        const db: GlobalData = JSON.parse(formData.get('currentData') as string);
        const stockData = {
            Nama_Produk: formData.get('productName') as string,
            Kategori: formData.get('category') as string,
            Stock_Kg: safeParseFloat(formData.get('stock')),
            HPP_Per_Kg: safeParseFloat(formData.get('hpp')),
            Harga_Jual_Kg: safeParseFloat(formData.get('sellPrice')),
        };
        
        let updatedDb: StorableGlobalData = {
            ...db,
            storeInventory: [...db.storeInventory],
        };
        const storeItemIndex = updatedDb.storeInventory.findIndex(si => si.Nama_Produk === stockData.Nama_Produk);

        if (storeItemIndex > -1) {
            let storeItem = updatedDb.storeInventory[storeItemIndex];
            storeItem.Stock_Kg = stockData.Stock_Kg;
            storeItem.HPP_Per_Kg = stockData.HPP_Per_Kg;
            storeItem.Harga_Jual_Kg = stockData.Harga_Jual_Kg;
            storeItem.Total_Value = stockData.Stock_Kg * stockData.HPP_Per_Kg;
            storeItem.Kategori = stockData.Kategori;
        } else {
            updatedDb.storeInventory.push({
                id: stockData.Nama_Produk.replace(/\s+/g, '-').toLowerCase(),
                ...stockData,
                Total_Value: stockData.Stock_Kg * stockData.HPP_Per_Kg,
            });
        }

        revalidatePath('/');
        return { message: 'Stok manual berhasil ditambahkan/diupdate!', status: 'success', data: updatedDb };
    } catch (e: any) {
        console.error("Error adding manual stock:", e);
        return { message: `Gagal menambahkan stok: ${e.message}`, status: 'error' };
    }
}

// --- Asset Action ---
export async function createAsset(prevState: ActionState, formData: FormData): Promise<ActionState> {
    try {
        const db: GlobalData = JSON.parse(formData.get('currentData') as string);
        const value = safeParseFloat(formData.get('value'));
        const assetData: Asset = {
            id: `asset-${Date.now()}`,
            Nama_Aset: formData.get('name') as string,
            Kategori: formData.get('category') as string,
            Tgl_Perolehan: formData.get('date') as string,
            Nilai_Perolehan: value,
            Penyusutan_Tahun: safeParseFloat(formData.get('depreciation')),
        };

        const updatedDb: StorableGlobalData = {
            ...db,
            assetsData: [...db.assetsData, assetData],
            transactions: [...db.transactions]
        };

        updatedDb.transactions.push({
            id: `trx-${Date.now()}-asset`,
            Tanggal: assetData.Tgl_Perolehan,
            Deskripsi: `Pembelian Aset: ${assetData.Nama_Aset}`,
            Referensi: assetData.id,
            Kategori: 'Pembelian Aset',
            Debit: 0,
            Kredit: assetData.Nilai_Perolehan,
        });


        revalidatePath('/');
        return { message: 'Aset berhasil dicatat!', status: 'success', data: updatedDb };
    } catch (e: any) {
        console.error("Error saving asset:", e);
        return { message: `Gagal mencatat aset: ${e.message}`, status: 'error' };
    }
}

// --- Settings Action ---
export async function saveSettings(prevState: ActionState, formData: FormData): Promise<ActionState> {
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
        return { message: 'Data tidak valid.', status: 'error', errors: parsed.error.flatten().fieldErrors };
    }

    try {
        const db: GlobalData = JSON.parse(formData.get('currentData') as string);
        const updatedDb: StorableGlobalData = {
            ...db,
            settings: { ...db.settings, ...parsed.data }
        };
        
        revalidatePath('/');
        return { message: 'Pengaturan berhasil disimpan!', status: 'success', data: updatedDb };
    } catch (e: any) {
        console.error("Error saving settings:", e);
        return { message: `Gagal menyimpan pengaturan: ${e.message}`, status: 'error' };
    }
}


// --- Reset Data Action ---
export async function resetAllData(prevState: ActionState, formData: FormData): Promise<ActionState> {
    try {
        const db: GlobalData = JSON.parse(formData.get('currentData') as string);
        const newDb: StorableGlobalData = {
            warehouseData: [],
            roastingBatches: [],
            roastedInventory: [],
            storeInventory: [],
            salesInvoices: [],
            purchaseInvoices: [],
            transactions: [],
            assetsData: [],
            settings: db.settings, // keep old settings
        };
        
        revalidatePath('/');
        return { message: 'Semua data transaksi berhasil direset! Pengaturan tidak berubah.', status: 'success', data: newDb };
    } catch (e: any) {
        console.error("Error resetting data:", e);
        return { message: `Reset gagal: ${e.message}`, status: 'error' };
    }
}


// --- Create Blend Action ---
export async function createBlend(prevState: ActionState, formData: FormData): Promise<ActionState> {
    try {
        const db: GlobalData = JSON.parse(formData.get('currentData') as string);
        const blendData = {
            name: formData.get('blendName') as string,
            totalQty: safeParseFloat(formData.get('totalQty')),
            sellPrice: safeParseFloat(formData.get('sellPrice')),
            components: JSON.parse(formData.get('components') as string) as BlendComponent[],
        };

        if (!blendData.name || blendData.totalQty <= 0 || blendData.sellPrice <= 0 || blendData.components.length === 0) {
            throw new Error("Data blend tidak lengkap. Harap isi semua field.");
        }

        const totalPercentage = blendData.components.reduce((sum, c) => sum + c.percentage, 0);
        if (Math.round(totalPercentage) !== 100) {
            throw new Error(`Total persentase harus 100%, saat ini ${totalPercentage}%.`);
        }

        let updatedDb: StorableGlobalData = {
            ...db,
            roastedInventory: [...db.roastedInventory],
            storeInventory: [...db.storeInventory],
            transactions: [...db.transactions],
        };

        let calculatedHpp = 0;

        // Check stock and prepare deductions
        for (const component of blendData.components) {
            const componentQtyNeeded = blendData.totalQty * (component.percentage / 100);
            const roastedIndex = updatedDb.roastedInventory.findIndex(r => r.id === component.id);
            if (roastedIndex === -1) throw new Error(`Komponen ${component.name} tidak ditemukan di inventaris roasted.`);

            const roastedItem = updatedDb.roastedInventory[roastedIndex];
            if (roastedItem.Stock_Kg < componentQtyNeeded) throw new Error(`Stok ${roastedItem.Produk_Roasting} tidak mencukupi. Butuh ${componentQtyNeeded.toFixed(2)} kg, tersedia ${roastedItem.Stock_Kg.toFixed(2)} kg.`);
            
            // Deduct stock
            roastedItem.Stock_Kg -= componentQtyNeeded;
            roastedItem.Total_Value = roastedItem.Stock_Kg * roastedItem.HPP_Per_Kg;

            // Add to weighted HPP
            calculatedHpp += (componentQtyNeeded * roastedItem.HPP_Per_Kg);
        }

        const finalHppPerKg = blendData.totalQty > 0 ? calculatedHpp / blendData.totalQty : 0;
        const totalValue = blendData.totalQty * finalHppPerKg;

        // Add or update blend in store inventory
        const storeIndex = updatedDb.storeInventory.findIndex(s => s.Nama_Produk === blendData.name);
        if (storeIndex > -1) {
            const storeItem = updatedDb.storeInventory[storeIndex];
            const oldStock = storeItem.Stock_Kg;
            const oldValue = storeItem.Total_Value;

            const newStock = oldStock + blendData.totalQty;
            const newValue = oldValue + totalValue;
            
            storeItem.Stock_Kg = newStock;
            storeItem.Total_Value = newValue;
            storeItem.HPP_Per_Kg = newStock > 0 ? newValue / newStock : 0;
            storeItem.Harga_Jual_Kg = blendData.sellPrice;
            storeItem.Kategori = 'Blend';
        } else {
            updatedDb.storeInventory.push({
                id: blendData.name.replace(/\s+/g, '-').toLowerCase(),
                Nama_Produk: blendData.name,
                Kategori: 'Blend',
                Stock_Kg: blendData.totalQty,
                HPP_Per_Kg: finalHppPerKg,
                Harga_Jual_Kg: blendData.sellPrice,
                Total_Value: totalValue,
            });
        }

        updatedDb.transactions.push({
            id: `trx-${Date.now()}-blend`,
            Tanggal: new Date().toISOString().split('T')[0],
            Deskripsi: `Pembuatan blend: ${blendData.name}`,
            Referensi: `BLND-${Date.now()}`,
            Kategori: 'Produksi Internal',
            Debit: 0,
            Kredit: 0, // Internal transfer, no immediate monetary transaction
        });

        revalidatePath('/');
        return { message: `Blend '${blendData.name}' berhasil dibuat!`, status: 'success', data: updatedDb };
    } catch (e: any) {
        console.error("Error creating blend:", e);
        return { message: `Gagal membuat blend: ${e.message}`, status: 'error' };
    }
}
