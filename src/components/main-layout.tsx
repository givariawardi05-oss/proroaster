"use client";

import React, { useState } from 'react';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import type { GlobalData, SectionName } from '@/lib/definitions';
import { Dashboard } from './sections/dashboard';
import { Purchases } from './sections/purchases';
import { Warehouse } from './sections/warehouse';
import { Roasting } from './sections/roasting';
import { RoastedInventory } from './sections/roasted-inventory';
import { StoreInventory } from './sections/store-inventory';
import { Sales } from './sections/sales';
import { Transactions } from './sections/transactions';
import { Reports } from './sections/reports';
import { Assets } from './sections/assets';
import { BalanceSheet } from './sections/balance-sheet';
import { Settings } from './sections/settings';
import { Sync } from './sections/sync';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Bell, Search } from 'lucide-react';

interface MainLayoutProps {
  initialData: GlobalData;
}

export default function MainLayout({ initialData }: MainLayoutProps) {
  const [activeSection, setActiveSection] = useState<SectionName>('dashboard');
  
  const sectionTitles: Record<SectionName, string> = {
    dashboard: 'Dashboard',
    purchases: 'Faktur Pembelanjaan',
    warehouse: 'Gudang Green Beans',
    roasting: 'Manajemen Roasting',
    'roasted-inventory': 'Inventaris Hasil Roasting',
    'store-inventory': 'Inventaris Toko',
    sales: 'Invoice Penjualan',
    transactions: 'Transaksi',
    reports: 'Laporan',
    assets: 'Data Aset',
    'balance-sheet': 'Neraca',
    settings: 'Pengaturan',
    sync: 'Sinkronisasi & Alat',
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard data={initialData} />;
      case 'purchases':
        return <Purchases data={initialData} />;
      case 'warehouse':
        return <Warehouse data={initialData} />;
      case 'roasting':
        return <Roasting data={initialData} />;
      case 'roasted-inventory':
        return <RoastedInventory data={initialData} />;
      case 'store-inventory':
        return <StoreInventory data={initialData} />;
      case 'sales':
        return <Sales data={initialData} />;
      case 'transactions':
        return <Transactions data={initialData} />;
      case 'reports':
        return <Reports />;
      case 'assets':
        return <Assets data={initialData} />;
      case 'balance-sheet':
        return <BalanceSheet data={initialData} />;
      case 'settings':
        return <Settings data={initialData} />;
      case 'sync':
        return <Sync />;
      default:
        return <Dashboard data={initialData} />;
    }
  };

  return (
    <>
      <AppSidebar activeSection={activeSection} setActiveSection={setActiveSection} />
      <SidebarInset className="max-h-screen overflow-y-auto bg-background">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-6 backdrop-blur-sm">
            <SidebarTrigger className="lg:hidden" />
            <div className='relative w-full max-w-sm'>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Cari..." className="pl-9 bg-input" />
            </div>
            <div className='ml-auto flex items-center gap-4'>
                <p className='text-sm text-muted-foreground hidden md:block'>
                    {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <Button variant="ghost" size="icon" className="rounded-full">
                    <Bell className="h-5 w-5"/>
                </Button>
            </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">
                  {sectionTitles[activeSection]}
                </h1>
                <p className="text-muted-foreground">
                  {activeSection === 'dashboard' ? `Halo! 👋 Ini yang terjadi di roastery Anda bulan ini.` : 'Kelola data dan lihat informasi terkait.'}
                </p>
            </div>
            {renderSection()}
        </main>
      </SidebarInset>
    </>
  );
}
