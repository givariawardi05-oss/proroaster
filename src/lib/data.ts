import type { 
    GlobalData,
} from './definitions';
import { getAllData } from './local-storage-helpers';

export async function fetchAllData(): Promise<GlobalData> {
    const data = await getAllData();

    const initialBalance = Number(data.settings.modal_awal) || 0;
    const currentBalance = data.transactions.reduce((balance, t) => {
        return balance + (Number(t.Debit) || 0) - (Number(t.Kredit) || 0);
    }, initialBalance);
    
    const timestamp = Date.now();
    const nextIds = {
        purchaseInvoice: `FP-${timestamp}`,
        roastingBatch: `RB-${timestamp}`,
        salesInvoice: `INV-${timestamp}`,
    };

    // Make sure all data arrays exist
    const safeData = {
        warehouseData: data.warehouseData || [],
        roastingBatches: data.roastingBatches || [],
        roastedInventory: data.roastedInventory || [],
        storeInventory: data.storeInventory || [],
        salesInvoices: data.salesInvoices || [],
        purchaseInvoices: data.purchaseInvoices || [],
        transactions: data.transactions || [],
        assetsData: data.assetsData || [],
        settings: data.settings || {},
    }

    return {
        ...safeData,
        transactions: safeData.transactions.sort((a, b) => new Date(b.Tanggal).getTime() - new Date(a.Tanggal).getTime()), 
        salesInvoices: safeData.salesInvoices.sort((a, b) => new Date(b.Tanggal).getTime() - new Date(a.Tanggal).getTime()),
        purchaseInvoices: safeData.purchaseInvoices.sort((a, b) => new Date(b.Tanggal).getTime() - new Date(a.Tanggal).getTime()),
        roastingBatches: safeData.roastingBatches.sort((a, b) => new Date(b.Tanggal).getTime() - new Date(a.Tanggal).getTime()),
        currentBalance,
        nextIds,
    };
}
