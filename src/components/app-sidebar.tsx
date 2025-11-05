"use client";

import React from 'react';
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import {
    LayoutDashboard,
    ShoppingCart,
    Warehouse,
    Flame,
    Package,
    Store,
    FileText,
    CreditCard,
    BarChart3,
    Building2,
    Scale,
    Settings,
    Database,
    Coffee
} from 'lucide-react';
import type { SectionName } from '@/lib/definitions';

interface AppSidebarProps {
  activeSection: SectionName;
  setActiveSection: (section: SectionName) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'purchases', label: 'Pembelanjaan', icon: ShoppingCart },
  { id: 'warehouse', label: 'Gudang Green Bean', icon: Warehouse },
  { id: 'roasting', label: 'Roasting', icon: Flame },
  { id: 'roasted-inventory', label: 'Gudang Roasted', icon: Package },
  { id: 'store-inventory', label: 'Inventaris Toko', icon: Store },
  { id: 'sales', label: 'Penjualan', icon: FileText },
  { id: 'transactions', label: 'Transaksi', icon: CreditCard },
  { id: 'reports', label: 'Laporan', icon: BarChart3 },
  { id: 'assets', label: 'Aset', icon: Building2 },
  { id: 'balance-sheet', label: 'Neraca', icon: Scale },
];

export function AppSidebar({ activeSection, setActiveSection }: AppSidebarProps) {
  const { setOpen } = useSidebar();
  
  const handleSectionClick = (section: SectionName) => {
    setActiveSection(section);
    setOpen(false); // Close sidebar on mobile after clicking an item
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-600">
                <Coffee className="size-6 text-primary-foreground" />
            </div>
            <div>
                <h1 className="font-bold text-xl text-sidebar-foreground">BlackHorse</h1>
                <p className="text-sm text-sidebar-foreground/70 -mt-1">Roastery</p>
            </div>
        </div>
      </SidebarHeader>
      <SidebarMenu>
        {navItems.map((item) => (
          <SidebarMenuItem key={item.id}>
            <SidebarMenuButton
              onClick={() => handleSectionClick(item.id as SectionName)}
              isActive={activeSection === item.id}
              className='justify-start'
            >
              <item.icon className="size-5" />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenuItem>
            <SidebarMenuButton
                onClick={() => handleSectionClick('settings')}
                isActive={activeSection === 'settings'}
                className='justify-start'
            >
                <Settings className="size-5" />
                <span>Pengaturan</span>
            </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
            <SidebarMenuButton
                onClick={() => handleSectionClick('sync')}
                isActive={activeSection === 'sync'}
                className='justify-start'
            >
                <Database className="size-5" />
                <span>Sinkronisasi</span>
            </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarSeparator />
         <div className='p-4 text-center text-xs text-sidebar-foreground/50'>
            <p>&copy; 2024 BlackHorse Roastery</p>
         </div>
      </SidebarFooter>
    </Sidebar>
  );
}