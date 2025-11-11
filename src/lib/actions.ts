"use server";

// 1. GABUNGAN SEMUA IMPORT
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db'; // Import Prisma DB Client
import { Prisma } from '@prisma/client';
import type { 
  GlobalData, 
  PurchaseItem, 
  SalesItem, 
  Settings, 
  StorableGlobalData, 
  BlendComponent, 
  PurchaseInvoice, 
  StoreInventoryItem 
} from './definitions';
// Mengganti nama tipe lama 'Asset' untuk menghindari konflik
import type { Asset as OldAsset } from './definitions'; 

// 2. FUNGSI HELPER
const safeParseFloat = (val: any): number => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
};

type ActionState = {
  message: string;
  status: 'success' | 'error';
  data?: StorableGlobalData; // Tipe data lama untuk fungsi lama
  errors?: any;
} | null;

type ActionStateWithData<T> = {
  message: string;
  status: 'success' | 'error';
  data?: T;
  errors?: any;
}

// ===============================================
// MODUL ASET (BARU - TERHUBUNG KE PRISMA)
// ===============================================

// --- Asset Action (VERSI BARU PRISMA) ---
export async function createAsset(prevState: ActionState, formData: FormData): Promise<ActionState> {
    try {
        // 1. Ambil data mentah dari form
        const value = safeParseFloat(formData.get('value'));
        const depreciation = safeParseFloat(formData.get('depreciation'));
        const date = formData.get('date') as string;
        const name = formData.get('name') as string;
        const category = formData.get('category') as string;

        // 2. Validasi data
        if (!name || !category || !date || value <= 0) {
            return { message: 'Data tidak valid. Pastikan semua field terisi.', status: 'error' };
        }

        // 3. Tentukan Akun Akuntansi (PENTING!)
        // Nama akun ini HARUS ada di tabel 'Account' Anda di pgAdmin.
        const debitAccountName = "Aset Tetap"; // Sesuaikan jika nama akun Anda berbeda
        const kreditAccountName = "Cash (Kas)"; // Sesuaikan jika nama akun Anda berbeda

        // 4. Cari ID Akun di database
        const debitAccount = await db.account.findUnique({ where: { name: debitAccountName } });
        const kreditAccount = await db.account.findUnique({ where: { name: kreditAccountName } });

        // 5. Cek apakah akun ditemukan
        if (!debitAccount) {
            return { message: `Akun akuntansi "${debitAccountName}" tidak ditemukan di database.`, status: 'error' };
        }
        if (!kreditAccount) {
            return { message: `Akun akuntansi "${kreditAccountName}" tidak ditemukan di database.`, status: 'error' };
        }

        // 6. Simpan ke Database menggunakan Prisma Transaction
        await db.$transaction(async (tx: Prisma.TransactionClient) => {
            // a. Buat Aset baru di tabel 'Asset'
            await tx.asset.create({
                data: {
                    name: name,
                    category: category === 'fixed' ? 'Aset Tetap' : 'Aset Lancar', // Sesuaikan
                    purchaseDate: new Date(date),
                    purchaseValue: value,
                    depreciationPerYear: depreciation,
                }
            });

            // b. Buat 'Transaction' (header jurnal)
            await tx.transaction.create({
                data: {
                    date: new Date(date),
                    description: `Pembelian Aset: ${name}`,
                    // Buat 'JournalEntry' (baris debit/kredit) secara bersamaan
                    entries: {
                        create: [
                            // Entri Debit: Aset Tetap bertambah
                            {
                                accountId: debitAccount.id,
                                debit: value,
                                credit: 0,
                            },
                            // Entri Kredit: Kas/Bank berkurang
                            {
                                accountId: kreditAccount.id,
                                debit: 0,
                                credit: value,
                            },
                        ]
                    }
                }
            });
            
            // c. Update saldo akun (Opsional, tapi praktik yang baik)
            await tx.account.update({ where: { id: debitAccount.id }, data: { balance: { increment: value } } });
            await tx.account.update({ where: { id: kreditAccount.id }, data: { balance: { decrement: value } } });
        });

        // 7. Beri tahu Next.js untuk me-refresh data di halaman
        revalidatePath('/');
        revalidatePath('/aset'); // Spesifik untuk halaman aset

        // 8. Kembalikan respons sukses
        return { message: 'Aset berhasil dicatat di database!', status: 'success' };

    } catch (e: any) {
        console.error("Error saving asset to DB:", e);
        return { message: `Gagal mencatat aset: ${e.message}`, status: 'error' };
    }
}

// --- Fungsi GET Aset (VERSI BARU PRISMA) ---
export async function getAssets() {
  try {
    const assets = await db.asset.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    return assets;
  } catch (error) {
    console.error('Failed to fetch assets:', error);
    return [];
  }
}

// ===============================================
// SEMUA FUNGSI LAMA (MASIH MENGGUNAKAN CACHE)
// Kita akan ganti ini satu per satu
// ===============================================

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
                    id: `wh-${item.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
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
            Harga_Jual_Kg: 0,
            Status: 'Completed',
        };

        let updatedDb: StorableGlobalData = {
            purchaseInvoices: db.purchaseInvoices,
            transactions: [...db.transactions],
            warehouseData: [...db.warehouseData],
            roastingBatches: [...db.roastingBatches, batchData],
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
        
        // 2. Update warehouse stock (deduct)
        const warehouseItem = updatedDb.warehouseData[warehouseItemIndex];
        const oldStock = safeParseFloat(warehouseItem.Stock_Kg);
        const avgHPP = warehouseItem.Avg_HPP;

        const newStock = oldStock - batchData.Input_Kg;
        const newTotalValue = newStock * avgHPP;
        
        warehouseItem.Stock_Kg = newStock;
        warehouseItem.Total_Value = newTotalValue;
        warehouseItem.Last_Update = batchData.Tanggal;

        // 3. Update/create roasted inventory
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
        } else {
            updatedDb.roastedInventory.push({
                id: `ri-${roastedProductName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
                Kategori: 'Roasted Beans',
                Produk_Roasting: roastedProductName,
                Stock_Kg: batchData.Output_Kg,
                HPP_Per_Kg: batchData.HPP_Per_Kg,
                Harga_Jual_Kg: 0,
                Total_Value: batchData.HPP_Per_Kg * batchData.Output_Kg,
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
            const category = roastedDoc.Kategori || 'Roasted Beans';

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
                // Keep existing sell price in store or set a default
                storeInvItem.Harga_Jual_Kg = storeInvItem.Harga_Jual_Kg > 0 ? storeInvItem.Harga_Jual_Kg : hpp * 1.5;
            } else {
                updatedDb.storeInventory.push({
                    id: `si-${roastedDoc.Produk_Roasting.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
                    Nama_Produk: roastedDoc.Produk_Roasting,
                    Kategori: category,
                    Stock_Kg: stockToTransfer,
                    HPP_Per_Kg: hpp,
                    // Set a default sell price, can be updated manually later
                    Harga_Jual_Kg: hpp * 1.5,
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
               id: `si-${stockData.Nama_Produk.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
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

// --- Settings Action ---
export async function saveSettings(prevState: ActionState, formData: FormData): Promise<ActionState> {
    const SettingsSchema = z.object({
        company_name: z.string().min(1, "Nama perusahaan wajib diisi"),
        stock_low_limit: z.coerce.number().min(0, "Batas stok tidak boleh negatif"),
        modal_awal: z.coerce.number().min(0, "Modal awal tidak boleh negatif"),
        company_address: z.string().optional(),
        invoice_notes: z.string().optional(),
        company_logo: z.string().optional(),
    });

    const parsed = SettingsSchema.safeParse({
        company_name: formData.get('company_name'),
        stock_low_limit: formData.get('stock_low_limit'),
        modal_awal: formData.get('modal_awal'),
        company_address: formData.get('company_address'),
       invoice_notes: formData.get('invoice_notes'),
        company_logo: formData.get('company_logo'),
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
        const components: Omit<BlendComponent, 'name'>[] = JSON.parse(formData.get('components') as string);

        const blendData = {
            name: formData.get('blendName') as string,
            totalQty: safeParseFloat(formData.get('totalQty')),
            components,
        };

        if (!blendData.name || blendData.totalQty <= 0 || blendData.components.length === 0) {
            throw new Error("Data blend tidak lengkap. Harap isi semua field.");
        }

        const totalPercentage = blendData.components.reduce((sum, c) => sum + safeParseFloat(c.percentage), 0);
        if (Math.round(totalPercentage) !== 100) {
            throw new Error(`Total persentase harus 100%, saat ini ${totalPercentage}%.`);
        }

        let updatedDb: StorableGlobalData = {
            ...db,
            roastedInventory: [...db.roastedInventory],
            transactions: [...db.transactions],
        };

        let calculatedHpp = 0;

        // Check stock and prepare deductions
        for (const component of blendData.components) {
            const componentQtyNeeded = blendData.totalQty * (safeParseFloat(component.percentage) / 100);
            const roastedIndex = updatedDb.roastedInventory.findIndex(r => r.id === component.id);
            
            if (roastedIndex === -1) {
                const componentName = db.roastedInventory.find(r => r.id === component.id)?.Produk_Roasting || 'Unknown';
                throw new Error(`Komponen ${componentName} tidak ditemukan di inventaris roasted.`);
            }

            const roastedItem = updatedDb.roastedInventory[roastedIndex];
               if (roastedItem.Stock_Kg < componentQtyNeeded) {
                throw new Error(`Stok ${roastedItem.Produk_Roasting} tidak mencukupi. Butuh ${componentQtyNeeded.toFixed(2)} kg, tersedia ${roastedItem.Stock_Kg.toFixed(2)} kg.`);
            }
            
            // Deduct stock
            roastedItem.Stock_Kg -= componentQtyNeeded;
            roastedItem.Total_Value = roastedItem.Stock_Kg * roastedItem.HPP_Per_Kg;

            // Add to weighted HPP
            calculatedHpp += (componentQtyNeeded * roastedItem.HPP_Per_Kg);
        }

        const finalHppPerKg = blendData.totalQty > 0 ? calculatedHpp / blendData.totalQty : 0;
        const totalValue = blendData.totalQty * finalHppPerKg;

        // Add or update blend in ROASTED inventory
        const roastedIndex = updatedDb.roastedInventory.findIndex(s => s.Produk_Roasting === blendData.name);
        if (roastedIndex > -1) {
            const roastedItem = updatedDb.roastedInventory[roastedIndex];
            const oldStock = roastedItem.Stock_Kg;
            const oldValue = roastedItem.Total_Value;

            const newStock = oldStock + blendData.totalQty;
            const newValue = oldValue + totalValue;
            
            roastedItem.Stock_Kg = newStock;
            roastedItem.Total_Value = newValue;
            roastedItem.HPP_Per_Kg = newStock > 0 ? newValue / newStock : 0;
            roastedItem.Kategori = 'Blend';
        } else {
            updatedDb.roastedInventory.push({
                id: `ri-${blendData.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
                Produk_Roasting: blendData.name,
                Kategori: 'Blend',
                Stock_Kg: blendData.totalQty,
                HPP_Per_Kg: finalHppPerKg,
                Harga_Jual_Kg: 0, // Sell price is set when moved to store
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


// --- Delete Purchase Invoice Action ---
export async function deletePurchase(prevState: ActionState, formData: FormData): Promise<ActionState> {
    try {
        const db: GlobalData = JSON.parse(formData.get('currentData') as string);
        const invoiceId = formData.get('invoiceId') as string;
        
        const invoiceToDelete = db.purchaseInvoices.find(inv => inv.id === invoiceId);
        if (!invoiceToDelete) {
            throw new Error("Faktur tidak ditemukan.");
        }

        // 1. Remove purchase invoice
        const updatedPurchaseInvoices = db.purchaseInvoices.filter(inv => inv.id !== invoiceId);

        // 2. Remove transaction
        const updatedTransactions = db.transactions.filter(t => t.Referensi !== invoiceToDelete.No_Faktur);

        // 3. Revert warehouse stock
        const updatedWarehouseData = [...db.warehouseData];
        for (const item of invoiceToDelete.items) {
            const warehouseItemIndex = updatedWarehouseData.findIndex(wh => wh.Nama_Green_Beans === item.name);
            if (warehouseItemIndex > -1) {
                const whItem = updatedWarehouseData[warehouseItemIndex];
                const itemQty = safeParseFloat(item.qty);
                const itemValue = itemQty * safeParseFloat(item.price);

                const newStock = whItem.Stock_Kg - itemQty;
                const newTotalValue = whItem.Total_Value - itemValue;
                
                whItem.Stock_Kg = newStock < 0 ? 0 : newStock;
                whItem.Total_Value = newTotalValue < 0 ? 0 : newTotalValue;
                whItem.Avg_HPP = whItem.Stock_Kg > 0 ? whItem.Total_Value / whItem.Stock_Kg : 0;
            }
        }
        
        const updatedDb: StorableGlobalData = {
            ...db,
            purchaseInvoices: updatedPurchaseInvoices,
            transactions: updatedTransactions,
            warehouseData: updatedWarehouseData,
        };

        revalidatePath('/');
        return { message: 'Faktur pembelian berhasil dihapus!', status: 'success', data: updatedDb };

    } catch (e: any) {
        console.error("Error deleting purchase:", e);
        return { message: `Gagal menghapus faktur: ${e.message}`, status: 'error' };
    }
}

// --- Update Purchase Invoice Action ---
export async function updatePurchase(prevState: ActionState, formData: FormData): Promise<ActionState> {
     try {
        const db: GlobalData = JSON.parse(formData.get('currentData') as string);
        const invoiceId = formData.get('invoiceId') as string;
        
        const oldInvoice = db.purchaseInvoices.find(inv => inv.id === invoiceId);
        if (!oldInvoice) {
            throw new Error("Faktur lama tidak ditemukan untuk diperbarui.");
        }

        // --- First, revert the old state ---
        
        // 1. Revert transaction
        let updatedTransactions = db.transactions.filter(t => t.Referensi !== oldInvoice.No_Faktur);

        // 2. Revert warehouse stock
        let updatedWarehouseData = [...db.warehouseData];
        for (const item of oldInvoice.items) {
            const warehouseItemIndex = updatedWarehouseData.findIndex(wh => wh.Nama_Green_Beans === item.name);
            if (warehouseItemIndex > -1) {
                const whItem = updatedWarehouseData[warehouseItemIndex];
                const itemQty = safeParseFloat(item.qty);
                const itemValue = itemQty * safeParseFloat(item.price);

                const newStock = whItem.Stock_Kg - itemQty;
                const newTotalValue = whItem.Total_Value - itemValue;
                
                whItem.Stock_Kg = newStock < 0 ? 0 : newStock;
                whItem.Total_Value = newTotalValue < 0 ? 0 : newTotalValue;
                whItem.Avg_HPP = whItem.Stock_Kg > 0 ? whItem.Total_Value / whItem.Stock_Kg : 0;
            }
        }

        // --- Second, apply the new state ---
        
        const newItems = JSON.parse(formData.get('items') as string) as PurchaseItem[];
        const newTotalFaktur = safeParseFloat(formData.get('total'));
        
        const updatedInvoiceData: PurchaseInvoice = {
            ...oldInvoice,
            Supplier: formData.get('supplier') as string,
            Tanggal: formData.get('date') as string,
            Total_Faktur: newTotalFaktur,
            items: newItems,
         };

        // 1. Add new transaction record
        updatedTransactions.push({
            id: `trx-${Date.now()}`,
            Tanggal: updatedInvoiceData.Tanggal,
            Deskripsi: `Pembelian dari ${updatedInvoiceData.Supplier}`,
            Referensi: updatedInvoiceData.No_Faktur,
            Kategori: 'Pembelian/Kredit',
            Debit: 0,
            Kredit: updatedInvoiceData.Total_Faktur,
        });

        // 2. Update warehouse stock with new data
        for (const item of newItems) {
            const warehouseItemIndex = updatedWarehouseData.findIndex(wh => wh.Nama_Green_Beans === item.name);
            
            const qty = safeParseFloat(item.qty);
            const price = safeParseFloat(item.price);
            const totalValueItem = qty * price;

            if (warehouseItemIndex > -1) {
                const warehouseItem = updatedWarehouseData[warehouseItemIndex];
                const oldStock = safeParseFloat(warehouseItem.Stock_Kg);
                const oldTotalValue = safeParseFloat(warehouseItem.Total_Value);
                
                const newStock = oldStock + qty;
                const newTotalValue = oldTotalValue + totalValueItem;
                const newAvgHPP = newStock > 0 ? newTotalValue / newStock : 0;
                
                warehouseItem.Stock_Kg = newStock;
                warehouseItem.Total_Value = newTotalValue;
                warehouseItem.Avg_HPP = newAvgHPP;
                warehouseItem.Last_Update = updatedInvoiceData.Tanggal;
            } else {
                updatedWarehouseData.push({
                    id: `wh-${item.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
                    Nama_Green_Beans: item.name,
                    Stock_Kg: qty,
                    Avg_HPP: price,
                    Total_Value: totalValueItem,
                    Last_Update: updatedInvoiceData.Tanggal,
              });
            }
        }

        // 3. Update the invoice in the main array
        const updatedPurchaseInvoices = db.purchaseInvoices.map(inv => 
            inv.id === invoiceId ? updatedInvoiceData : inv
        );

        const updatedDb: StorableGlobalData = {
            ...db,
            purchaseInvoices: updatedPurchaseInvoices,
            transactions: updatedTransactions,
            warehouseData: updatedWarehouseData,
        };

        revalidatePath('/');
        return { message: 'Faktur pembelian berhasil diperbarui!', status: 'success', data: updatedDb };

    } catch (e: any) {
        console.error("Error updating purchase:", e);
        return { message: `Gagal memperbarui faktur: ${e.message}`, status: 'error' };
    }
}


// --- Store Item Actions ---
export async function updateStoreItem(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const schema = z.object({
    itemId: z.string(),
    Nama_Produk: z.string().min(3, "Nama produk minimal 3 karakter"),
    Kategori: z.string().min(1, "Kategori wajib diisi"),
    Harga_Jual_Kg: z.coerce.number().min(0, "Harga jual tidak boleh negatif"),
  });
  
  try {
    const db: GlobalData = JSON.parse(formData.get('currentData') as string);
    const parsed = schema.parse({
        itemId: formData.get('itemId'),
        Nama_Produk: formData.get('Nama_Produk'),
        Kategori: formData.get('Kategori'),
        Harga_Jual_Kg: formData.get('Harga_Jual_Kg'),
    });

    const updatedStoreInventory = db.storeInventory.map(item => {
      if (item.id === parsed.itemId) {
        return {
          ...item,
          Nama_Produk: parsed.Nama_Produk,
          Kategori: parsed.Kategori,
          Harga_Jual_Kg: parsed.Harga_Jual_Kg,
        };
      }
      return item;
    });
    
    const updatedDb: StorableGlobalData = { ...db, storeInventory: updatedStoreInventory };
    revalidatePath('/');
    return { message: 'Produk berhasil diupdate!', status: 'success', data: updatedDb };

  } catch (e: any) {
    if (e instanceof z.ZodError) {
        return { message: 'Data tidak valid', status: 'error', errors: e.flatten().fieldErrors };
    }
    return { message: `Gagal mengupdate produk: ${e.message}`, status: 'error' };
  }
}

export async function deleteStoreItem(prevState: ActionState, { currentData, itemId }: { currentData: GlobalData, itemId: string }): Promise<ActionStateWithData<StorableGlobalData>> {
    try {
        const itemToDelete = currentData.storeInventory.find(item => item.id === itemId);

        if (!itemToDelete) {
            throw new Error("Produk tidak ditemukan.");
      }
        if (itemToDelete.Stock_Kg > 0) {
            throw new Error("Tidak dapat menghapus produk dengan stok lebih dari nol.");
        }

        const updatedStoreInventory = currentData.storeInventory.filter(item => item.id !== itemId);
        const updatedDb: StorableGlobalData = { ...currentData, storeInventory: updatedStoreInventory };

        revalidatePath('/');
        return { message: 'Produk berhasil dihapus.', status: 'success', data: updatedDb };
    } catch (e: any) {
        return { message: `Gagal menghapus produk: ${e.message}`, status: 'error' };
    }
    }