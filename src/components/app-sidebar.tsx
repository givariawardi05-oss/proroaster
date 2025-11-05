"use client";

import React from 'react';
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
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
    Github,
} from 'lucide-react';
import type { SectionName } from '@/lib/definitions';

interface AppSidebarProps {
  activeSection: SectionName;
  setActiveSection: (section: SectionName) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'purchases', label: 'Faktur Pembelanjaan', icon: ShoppingCart },
  { id: 'warehouse', label: 'Warehouse Green Beans', icon: Warehouse },
  { id: 'roasting', label: 'Management Roasting', icon: Flame },
  { id: 'roasted-inventory', label: 'Inventory Hasil Roasting', icon: Package },
  { id: 'store-inventory', label: 'Inventory Store', icon: Store },
  { id: 'sales', label: 'Invoice Penjualan', icon: FileText },
  { id: 'transactions', label: 'Transaksi', icon: CreditCard },
  { id: 'reports', label: 'Laporan', icon: BarChart3 },
  { id: 'assets', label: 'Data Aset', icon: Building2 },
  { id: 'balance-sheet', label: 'Neraca', icon: Scale },
  { id: 'settings', label: 'Pengaturan', icon: Settings },
  { id: 'sync', label: 'Firebase Sync', icon: Database },
];

export function AppSidebar({ activeSection, setActiveSection }: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader className='p-4'>
        <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
                <Github className="size-6 text-primary-foreground" />
            </div>
            <div>
                <h1 className="font-semibold text-lg text-sidebar-foreground">BlackHorse</h1>
                <p className="text-xs text-sidebar-foreground/70">Roastery System</p>
            </div>
        </div>
      </SidebarHeader>
      <SidebarMenu className="flex-1 overflow-y-auto px-2">
        {navItems.map((item) => (
          <SidebarMenuItem key={item.id}>
            <SidebarMenuButton
              onClick={() => setActiveSection(item.id as SectionName)}
              isActive={activeSection === item.id}
              tooltip={item.label}
              className='justify-start'
            >
              <item.icon className="size-4" />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </Sidebar>
  );
}
