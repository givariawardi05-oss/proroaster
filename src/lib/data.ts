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

    return {
        ...data,
        transactions: data.transactions.sort((a, b) => new Date(b.Tanggal).getTime() - new Date(a.Tanggal).getTime()), 
        salesInvoices: data.salesInvoices.sort((a, b) => new Date(b.Tanggal).getTime() - new Date(a.Tanggal).getTime()),
        purchaseInvoices: data.purchaseInvoices.sort((a, b) => new Date(b.Tanggal).getTime() - new Date(a.Tanggal).getTime()),
        roastingBatches: data.roastingBatches.sort((a, b) => new Date(b.Tanggal).getTime() - new Date(a.Tanggal).getTime()),
        currentBalance,
        nextIds,
    };
}
