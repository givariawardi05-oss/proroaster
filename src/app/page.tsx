import { SidebarProvider } from '@/components/ui/sidebar';
import MainLayout from '@/components/main-layout';
import type { GlobalData } from '@/lib/definitions';

// Dummy data is now the initial state before client-side localStorage hydration
const getInitialData = (): GlobalData => ({
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


export default function Home() {
  const data = getInitialData();

  return (
    <SidebarProvider>
      <MainLayout initialData={data} />
    </SidebarProvider>
  );
}
