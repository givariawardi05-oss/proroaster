import { db } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import type { 
    WarehouseItem, 
    RoastedInventoryItem, 
    StoreInventoryItem, 
    Transaction, 
    SalesInvoice, 
    Asset, 
    PurchaseInvoice, 
    RoastingBatch,
    Settings,
    GlobalData,
} from './definitions';

async function getCollectionData<T>(collectionName: string): Promise<T[]> {
    const snapshot = await getDocs(collection(db, collectionName));
    const data: T[] = [];
    snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as T);
    });
    return data;
}

export async function fetchAllData(): Promise<GlobalData> {
    console.log("Starting data fetch from Firestore...");

    const settingsSnapshot = await getDocs(collection(db, "settings"));
    let settings: Settings = {};
    settingsSnapshot.forEach(doc => {
        settings[doc.data().key] = doc.data().value;
    });

    const [
        warehouseData, 
        roastedInventory, 
        storeInventory, 
        transactions, 
        salesInvoices, 
        assetsData, 
        purchaseInvoices, 
        roastingBatches
    ] = await Promise.all([
        getCollectionData<WarehouseItem>('warehouse_gb'),
        getCollectionData<RoastedInventoryItem>('inventory_roasted'),
        getCollectionData<StoreInventoryItem>('inventory_store'),
        getCollectionData<Transaction>('transactions'),
        getCollectionData<SalesInvoice>('sales_invoices'),
        getCollectionData<Asset>('assets'),
        getCollectionData<PurchaseInvoice>('purchase_invoices'),
        getCollectionData<RoastingBatch>('roasting_batches')
    ]);

    const initialBalance = Number(settings.modal_awal) || 0;
    const currentBalance = transactions.reduce((balance, t) => {
        return balance + (Number(t.Debit) || 0) - (Number(t.Kredit) || 0);
    }, initialBalance);
    
    // Simple ID generation for forms
    const timestamp = Date.now();
    const nextIds = {
        purchaseInvoice: `FP-${timestamp}`,
        roastingBatch: `RB-${timestamp}`,
        salesInvoice: `INV-${timestamp}`,
    };

    console.log("Data fetch complete.");

    return {
        warehouseData, 
        roastedInventory, 
        storeInventory, 
        transactions: transactions.sort((a, b) => new Date(b.Tanggal).getTime() - new Date(a.Tanggal).getTime()), 
        salesInvoices: salesInvoices.sort((a, b) => new Date(b.Tanggal).getTime() - new Date(a.Tanggal).getTime()),
        purchaseInvoices: purchaseInvoices.sort((a, b) => new Date(b.Tanggal).getTime() - new Date(a.Tanggal).getTime()),
        roastingBatches: roastingBatches.sort((a, b) => new Date(b.Tanggal).getTime() - new Date(a.Tanggal).getTime()),
        assetsData, 
        settings,
        currentBalance,
        nextIds,
    };
}
