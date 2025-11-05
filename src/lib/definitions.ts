export type PurchaseItem = {
    id: string;
    name: string;
    qty: number;
    price: number;
    total: number;
};

export type SalesItem = {
    id: string;
    name: string;
    qty: number;
    price: number;
    discount: number;
    total: number;
};

export type WarehouseItem = {
    id: string;
    Nama_Green_Beans: string;
    Stock_Kg: number;
    Avg_HPP: number;
    Total_Value: number;
    Last_Update: string;
};

export type RoastingBatch = {
    id: string;
    Batch_ID: string;
    Tanggal: string;
    Green_Beans: string;
    Input_Kg: number;
    Output_Kg: number;
    Yield_Persen: string;
    Profile: string;
    HPP_Per_Kg: number;
    Harga_Jual_Kg: number;
    Status: string;
};

export type RoastedInventoryItem = {
    id: string;
    Produk_Roasting: string;
    Stock_Kg: number;
    HPP_Per_Kg: number;
    Harga_Jual_Kg: number;
    Total_Value: number;
};

export type StoreInventoryItem = {
    id: string;
    Nama_Produk: string;
    Kategori: string;
    Stock_Kg: number;
    HPP_Per_Kg: number;
    Harga_Jual_Kg: number;
    Total_Value: number;
};

export type SalesInvoice = {
    id: string;
    No_Invoice: string;
    Customer: string;
    Tanggal: string;
    Jatuh_Tempo: string;
    Total_Invoice: number;
    Status_Bayar: 'Draft' | 'Sent' | 'Paid' | 'Lunas' | 'Overdue';
    items: SalesItem[];
};

export type PurchaseInvoice = {
    id: string;
    No_Faktur: string;
    Supplier: string;
    Tanggal: string;
    Total_Faktur: number;
    Status: string;
    items: PurchaseItem[];
};

export type Transaction = {
    id: string;
    Tanggal: string;
    Deskripsi: string;
    Referensi: string;
    Kategori: string;
    Debit: number;
    Kredit: number;
};

export type Asset = {
    id: string;
    Nama_Aset: string;
    Kategori: string;
    Tgl_Perolehan: string;
    Nilai_Perolehan: number;
    Penyusutan_Tahun: number;
    Nilai_Buku: number;
};

export type Settings = {
    [key: string]: any;
};

export type NextIds = {
    purchaseInvoice: string;
    roastingBatch: string;
    salesInvoice: string;
}

export type GlobalData = {
    warehouseData: WarehouseItem[];
    roastingBatches: RoastingBatch[];
    roastedInventory: RoastedInventoryItem[];
    storeInventory: StoreInventoryItem[];
    salesInvoices: SalesInvoice[];
    purchaseInvoices: PurchaseInvoice[];
    transactions: Transaction[];
    assetsData: Asset[];
    settings: Settings;
    nextIds: NextIds;
    currentBalance: number;
};

export type SectionName = 
    | 'dashboard'
    | 'purchases'
    | 'warehouse'
    | 'roasting'
    | 'roasted-inventory'
    | 'store-inventory'
    | 'sales'
    | 'transactions'
    | 'reports'
    | 'assets'
    | 'balance-sheet'
    | 'settings'
    | 'sync';
