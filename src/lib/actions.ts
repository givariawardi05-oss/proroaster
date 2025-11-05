"use server";
import { revalidatePath } from 'next/cache';
import { db } from '@/firebase';
import { collection, addDoc, runTransaction, doc, writeBatch, getDocs, deleteDoc, setDoc } from 'firebase/firestore';
import { z } from 'zod';
import type { PurchaseItem, SalesItem, GlobalData } from './definitions';

// Utility to parse numbers safely
const safeParseFloat = (val: any): number => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
};

// --- Purchase Invoice Action ---
export async function createPurchase(prevState: any, formData: FormData) {
    const items = JSON.parse(formData.get('items') as string) as PurchaseItem[];
    const totalFaktur = safeParseFloat(formData.get('total'));

    const purchaseData = {
        No_Faktur: formData.get('invoiceNumber') as string,
        Supplier: formData.get('supplier') as string,
        Tanggal: formData.get('date') as string,
        Total_Faktur: totalFaktur,
        Status: 'Completed',
        items,
    };
    
    try {
        await runTransaction(db, async (transaction) => {
            // 1. Add purchase invoice
            const purchaseRef = await addDoc(collection(db, 'purchase_invoices'), purchaseData);

            // 2. Add transaction record
            const transactionData = {
                Tanggal: purchaseData.Tanggal,
                Deskripsi: `Pembelian dari ${purchaseData.Supplier}`,
                Referensi: purchaseData.No_Faktur,
                Kategori: 'Pembelian/Kredit',
                Debit: 0,
                Kredit: purchaseData.Total_Faktur,
            };
            await addDoc(collection(db, 'transactions'), transactionData);

            // 3. Update warehouse stock
            for (const item of items) {
                const warehouseRef = doc(db, 'warehouse_gb', item.name.replace(/\s+/g, '-').toLowerCase());
                const warehouseDoc = await transaction.get(warehouseRef);
                
                const qty = safeParseFloat(item.qty);
                const price = safeParseFloat(item.price);
                const totalValueItem = qty * price;

                if (warehouseDoc.exists()) {
                    const oldStock = safeParseFloat(warehouseDoc.data().Stock_Kg);
                    const oldTotalValue = safeParseFloat(warehouseDoc.data().Total_Value);
                    
                    const newStock = oldStock + qty;
                    const newTotalValue = oldTotalValue + totalValueItem;
                    const newAvgHPP = newStock > 0 ? newTotalValue / newStock : 0;
                    
                    transaction.update(warehouseRef, {
                        Stock_Kg: newStock,
                        Total_Value: newTotalValue,
                        Avg_HPP: newAvgHPP,
                        Last_Update: purchaseData.Tanggal,
                    });
                } else {
                    transaction.set(warehouseRef, {
                        Nama_Green_Beans: item.name,
                        Stock_Kg: qty,
                        Avg_HPP: price,
                        Total_Value: totalValueItem,
                        Last_Update: purchaseData.Tanggal,
                    });
                }
            }
        });
        
        revalidatePath('/');
        return { message: 'Faktur pembelian berhasil dibuat!', status: 'success' };
    } catch (e: any) {
        console.error("Error creating purchase:", e);
        return { message: `Gagal membuat faktur: ${e.message}`, status: 'error' };
    }
}


// --- Roasting Batch Action ---
export async function createRoastingBatch(prevState: any, formData: FormData) {
    const inputKg = safeParseFloat(formData.get('inputQty'));
    const yieldPercent = safeParseFloat(formData.get('yieldPercent'));
    const outputKg = inputKg * (yieldPercent / 100);

    const batchData = {
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
        await runTransaction(db, async (transaction) => {
            // 1. Check warehouse stock
            const greenBeanId = batchData.Green_Beans.replace(/\s+/g, '-').toLowerCase();
            const warehouseRef = doc(db, 'warehouse_gb', greenBeanId);
            const warehouseDoc = await transaction.get(warehouseRef);

            if (!warehouseDoc.exists() || safeParseFloat(warehouseDoc.data().Stock_Kg) < batchData.Input_Kg) {
                throw new Error(`Stok ${batchData.Green_Beans} tidak mencukupi.`);
            }
            
            // 2. Add roasting batch
            await addDoc(collection(db, 'roasting_batches'), batchData);

            // 3. Update warehouse stock (deduct)
            const oldStock = safeParseFloat(warehouseDoc.data().Stock_Kg);
            const oldTotalValue = safeParseFloat(warehouseDoc.data().Total_Value);
            const avgHPP = oldStock > 0 ? oldTotalValue / oldStock : 0;

            const newStock = oldStock - batchData.Input_Kg;
            const newTotalValue = newStock * avgHPP;
            
            transaction.update(warehouseRef, {
                Stock_Kg: newStock,
                Total_Value: newTotalValue,
                Last_Update: batchData.Tanggal,
            });

            // 4. Update/create roasted inventory
            const roastedProductName = `${batchData.Green_Beans} - ${batchData.Profile}`;
            const roastedProductId = roastedProductName.replace(/\s+/g, '-').toLowerCase();
            const roastedInvRef = doc(db, 'inventory_roasted', roastedProductId);
            const roastedInvDoc = await transaction.get(roastedInvRef);
            
            if (roastedInvDoc.exists()) {
                const oldRoastedStock = safeParseFloat(roastedInvDoc.data().Stock_Kg);
                const oldRoastedValue = safeParseFloat(roastedInvDoc.data().Total_Value);

                const newRoastedStock = oldRoastedStock + batchData.Output_Kg;
                const newRoastedValue = oldRoastedValue + (batchData.HPP_Per_Kg * batchData.Output_Kg);
                const newRoastedAvgHPP = newRoastedStock > 0 ? newRoastedValue / newRoastedStock : batchData.HPP_Per_Kg;

                transaction.update(roastedInvRef, {
                    Stock_Kg: newRoastedStock,
                    Total_Value: newRoastedValue,
                    HPP_Per_Kg: newRoastedAvgHPP,
                    Harga_Jual_Kg: batchData.Harga_Jual_Kg, // Update with latest price
                });

            } else {
                transaction.set(roastedInvRef, {
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
                 await addDoc(collection(db, 'transactions'), {
                     Tanggal: batchData.Tanggal,
                     Deskripsi: `Biaya operasional untuk batch ${batchData.Batch_ID}`,
                     Referensi: batchData.Batch_ID,
                     Kategori: 'Biaya Operasional',
                     Debit: 0,
                     Kredit: totalOpCost,
                 });
             }
        });
        
        revalidatePath('/');
        return { message: 'Batch roasting berhasil diproses!', status: 'success' };
    } catch (e: any) {
        console.error("Error creating roasting batch:", e);
        return { message: `Gagal memproses batch: ${e.message}`, status: 'error' };
    }
}


// --- Transfer to Store Action ---
export async function transferToStore(itemsToTransfer: { id: string }[]) {
    if (!itemsToTransfer || itemsToTransfer.length === 0) {
        return { message: 'Tidak ada item yang dipilih untuk ditransfer.', status: 'error' };
    }
    
    try {
        await runTransaction(db, async (transaction) => {
            for (const item of itemsToTransfer) {
                const roastedInvRef = doc(db, 'inventory_roasted', item.id);
                const roastedDoc = await transaction.get(roastedInvRef);

                if (!roastedDoc.exists()) continue;
                
                const roastedData = roastedDoc.data();
                const stockToTransfer = safeParseFloat(roastedData.Stock_Kg);

                if (stockToTransfer <= 0) continue;

                // Move to store inventory
                const storeProductId = roastedData.Produk_Roasting.replace(/\s+/g, '-').toLowerCase();
                const storeInvRef = doc(db, 'inventory_store', storeProductId);
                const storeDoc = await transaction.get(storeInvRef);

                const hpp = safeParseFloat(roastedData.HPP_Per_Kg);
                const valueToTransfer = stockToTransfer * hpp;

                if (storeDoc.exists()) {
                    const oldStoreStock = safeParseFloat(storeDoc.data().Stock_Kg);
                    const oldStoreValue = safeParseFloat(storeDoc.data().Total_Value);
                    
                    const newStoreStock = oldStoreStock + stockToTransfer;
                    const newStoreValue = oldStoreValue + valueToTransfer;
                    const newAvgHPP = newStoreStock > 0 ? newStoreValue / newStoreStock : 0;
                    
                    transaction.update(storeInvRef, {
                        Stock_Kg: newStoreStock,
                        Total_Value: newStoreValue,
                        HPP_Per_Kg: newAvgHPP,
                        Harga_Jual_Kg: roastedData.Harga_Jual_Kg,
                    });

                } else {
                    transaction.set(storeInvRef, {
                        Nama_Produk: roastedData.Produk_Roasting,
                        Kategori: 'Roasted Beans',
                        Stock_Kg: stockToTransfer,
                        HPP_Per_Kg: hpp,
                        Harga_Jual_Kg: roastedData.Harga_Jual_Kg,
                        Total_Value: valueToTransfer,
                    });
                }
                
                // Set roasted inventory stock to 0
                transaction.update(roastedInvRef, {
                    Stock_Kg: 0,
                    Total_Value: 0
                });
            }
        });
        
        revalidatePath('/');
        return { message: `${itemsToTransfer.length} item berhasil ditransfer ke toko.`, status: 'success' };
    } catch (e: any) {
        console.error("Error transferring to store:", e);
        return { message: `Gagal mentransfer: ${e.message}`, status: 'error' };
    }
}

// --- Sales Invoice Action ---
export async function createSale(prevState: any, formData: FormData) {
    const items = JSON.parse(formData.get('items') as string) as SalesItem[];
    const totalInvoice = safeParseFloat(formData.get('total'));
    const paymentStatus = formData.get('paymentStatus') as string;

    const salesData = {
        No_Invoice: formData.get('invoiceNumber') as string,
        Customer: formData.get('customerName') as string,
        Tanggal: formData.get('date') as string,
        Jatuh_Tempo: formData.get('dueDate') as string,
        Total_Invoice: totalInvoice,
        Status_Bayar: paymentStatus,
        Metode_Pembayaran: formData.get('paymentMethod') as string,
        items,
    };
    
    try {
        await runTransaction(db, async (transaction) => {
            // 1. Add sales invoice
            await addDoc(collection(db, 'sales_invoices'), salesData);

            // 2. Add transaction if payment is made
            if (paymentStatus === 'Paid' || salesData.Metode_Pembayaran !== 'Credit') {
                const transactionData = {
                    Tanggal: salesData.Tanggal,
                    Deskripsi: `Penjualan kepada ${salesData.Customer}`,
                    Referensi: salesData.No_Invoice,
                    Kategori: 'Penjualan/Debit',
                    Debit: salesData.Total_Invoice,
                    Kredit: 0,
                };
                await addDoc(collection(db, 'transactions'), transactionData);
            }

            // 3. Deduct store inventory and calculate COGS
            let totalCOGS = 0;
            for (const item of items) {
                const productId = item.name.replace(/\s+/g, '-').toLowerCase();
                const storeInvRef = doc(db, 'inventory_store', productId);
                const storeDoc = await transaction.get(storeInvRef);

                if (!storeDoc.exists()) throw new Error(`Produk ${item.name} tidak ditemukan di toko.`);
                
                const storeData = storeDoc.data();
                const qtySold = safeParseFloat(item.qty);
                const oldStock = safeParseFloat(storeData.Stock_Kg);

                if (oldStock < qtySold) throw new Error(`Stok ${item.name} tidak cukup.`);
                
                const avgHPP = safeParseFloat(storeData.HPP_Per_Kg);
                totalCOGS += qtySold * avgHPP;

                const newStock = oldStock - qtySold;
                const newTotalValue = newStock * avgHPP;
                
                transaction.update(storeInvRef, {
                    Stock_Kg: newStock,
                    Total_Value: newTotalValue,
                });
            }

            // 4. Add COGS transaction
            if (totalCOGS > 0) {
                const cogsTransaction = {
                    Tanggal: salesData.Tanggal,
                    Deskripsi: `Beban Pokok Penjualan untuk ${salesData.No_Invoice}`,
                    Referensi: salesData.No_Invoice,
                    Kategori: 'COGS/Kredit',
                    Debit: 0,
                    Kredit: totalCOGS,
                };
                await addDoc(collection(db, 'transactions'), cogsTransaction);
            }
        });
        
        revalidatePath('/');
        return { message: 'Invoice penjualan berhasil dibuat!', status: 'success' };
    } catch (e: any) {
        console.error("Error creating sale:", e);
        return { message: `Gagal membuat invoice: ${e.message}`, status: 'error' };
    }
}


// --- Add Manual Stock Action ---
export async function addManualStock(prevState: any, formData: FormData) {
     const stockData = {
        Nama_Produk: formData.get('productName') as string,
        Kategori: formData.get('category') as string,
        Stock_Kg: safeParseFloat(formData.get('stock')),
        HPP_Per_Kg: safeParseFloat(formData.get('hpp')),
        Harga_Jual_Kg: safeParseFloat(formData.get('sellPrice')),
    };
    
    try {
        const productId = stockData.Nama_Produk.replace(/\s+/g, '-').toLowerCase();
        const storeInvRef = doc(db, "inventory_store", productId);

        await setDoc(storeInvRef, {
            ...stockData,
            Total_Value: stockData.Stock_Kg * stockData.HPP_Per_Kg,
        }, { merge: true });

        revalidatePath('/');
        return { message: 'Stok manual berhasil ditambahkan/diupdate!', status: 'success' };
    } catch (e: any) {
        console.error("Error adding manual stock:", e);
        return { message: `Gagal menambahkan stok: ${e.message}`, status: 'error' };
    }
}

// --- Asset Action ---
export async function createAsset(prevState: any, formData: FormData) {
    const value = safeParseFloat(formData.get('value'));
    const assetData = {
        Nama_Aset: formData.get('name') as string,
        Kategori: formData.get('category') as string,
        Tgl_Perolehan: formData.get('date') as string,
        Nilai_Perolehan: value,
        Penyusutan_Tahun: safeParseFloat(formData.get('depreciation')),
        Nilai_Buku: value // Initial book value
    };

    try {
        await addDoc(collection(db, "assets"), assetData);
        revalidatePath('/');
        return { message: 'Aset berhasil dicatat!', status: 'success' };
    } catch (e: any) {
        console.error("Error saving asset:", e);
        return { message: `Gagal mencatat aset: ${e.message}`, status: 'error' };
    }
}

// --- Settings Action ---
export async function saveSettings(prevState: any, formData: FormData) {
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

    const settingsData = parsed.data;

    try {
        const batch = writeBatch(db);
        for (const key in settingsData) {
            const settingRef = doc(db, "settings", key);
            batch.set(settingRef, { key, value: (settingsData as any)[key] });
        }
        await batch.commit();

        revalidatePath('/');
        return { message: 'Pengaturan berhasil disimpan!', status: 'success' };
    } catch (e: any) {
        console.error("Error saving settings:", e);
        return { message: `Gagal menyimpan pengaturan: ${e.message}`, status: 'error' };
    }
}


// --- Reset Data Action ---
export async function resetAllData() {
    const collectionsToReset = [
        'purchase_invoices', 'warehouse_gb', 
        'roasting_batches', 'inventory_roasted', 'inventory_store', 
        'sales_invoices', 'transactions', 'assets'
    ];
    
    try {
        for (const collectionName of collectionsToReset) {
            const snapshot = await getDocs(collection(db, collectionName));
            const batch = writeBatch(db);
            snapshot.docs.forEach(docSnap => {
                batch.delete(docSnap.ref);
            });
            await batch.commit();
            console.log(`Collection ${collectionName} has been reset.`);
        }
        
        revalidatePath('/');
        return { message: 'Semua data transaksi berhasil direset! Pengaturan tidak berubah.', status: 'success' };
    } catch (e: any) {
        console.error("Error resetting data:", e);
        return { message: `Reset gagal: ${e.message}`, status: 'error' };
    }
}
