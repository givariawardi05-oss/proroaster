import { SidebarProvider } from '@/components/ui/sidebar';
import MainLayout from '@/components/main-layout';
import { fetchAllData } from '@/lib/data';
import type { GlobalData } from '@/lib/definitions';

// Dummy data for when fetch fails or in dev environment without DB
const getDummyData = (): GlobalData => ({
  warehouseData: [],
  roastingBatches: [],
  roastedInventory: [],
  storeInventory: [],
  salesInvoices: [],
  purchaseInvoices: [],
  transactions: [],
  assetsData: [],
  settings: {
    modal_awal: 0,
    company_name: 'BlackHorse Roastery',
    stock_low_limit: 10,
  },
  nextIds: {
    purchaseInvoice: 'FP-001',
    roastingBatch: 'RB-001',
    salesInvoice: 'INV-001',
  },
  currentBalance: 0,
});


export default async function Home() {
  let data: GlobalData;
  try {
    data = await fetchAllData();
  } catch (error) {
    console.error("Failed to fetch initial data:", error);
    // Fallback to dummy data if Firestore fetch fails
    data = getDummyData();
  }

  return (
    <SidebarProvider>
      <MainLayout initialData={data} />
    </SidebarProvider>
  );
}
