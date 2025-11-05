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
    CircleHelp,
    LogOut,
    Coffee
} from 'lucide-react';
import type { SectionName } from '@/lib/definitions';
import { Button } from './ui/button';

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
  return (
    <Sidebar>
      <SidebarHeader className='p-4'>
        <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-500">
                <Coffee className="size-6 text-primary-foreground" />
            </div>
            <div>
                <h1 className="font-semibold text-lg text-sidebar-foreground">BlackHorse</h1>
                <p className="text-xs text-sidebar-foreground/70">Roastery</p>
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
      <SidebarFooter className='px-2'>
        <SidebarSeparator />
        <SidebarMenuItem>
            <SidebarMenuButton
                onClick={() => setActiveSection('settings')}
                isActive={activeSection === 'settings'}
                tooltip="Pengaturan"
                className='justify-start'
            >
                <Settings className="size-4" />
                <span>Pengaturan</span>
            </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
            <SidebarMenuButton
                onClick={() => setActiveSection('sync')}
                isActive={activeSection === 'sync'}
                tooltip="Sinkronisasi"
                className='justify-start'
            >
                <Database className="size-4" />
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
