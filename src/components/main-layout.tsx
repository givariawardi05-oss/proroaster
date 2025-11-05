"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
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
import { Bell, Search, Menu } from 'lucide-react';
import { fetchAllData } from '@/lib/data';
import { writeAllData } from '@/lib/local-storage-helpers';

interface MainLayoutProps {
  initialData: GlobalData;
}

export default function MainLayout({ initialData }: MainLayoutProps) {
  const [activeSection, setActiveSection] = useState<SectionName>('dashboard');
  const [data, setData] = useState<GlobalData>(initialData);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const { setOpen } = useSidebar();

  useEffect(() => {
    const loadData = async () => {
      const localData = await fetchAllData();
      setData(localData);
      setIsDataLoaded(true);
    };
    loadData();
  }, []);

  const handleDataChange = useCallback(async (newData: GlobalData) => {
    // Omit calculated/volatile fields before writing to localStorage
    const { nextIds, currentBalance, ...dataToWrite } = newData;
    await writeAllData(dataToWrite);
    
    // Re-fetch to get fresh calculated values
    const reloadedData = await fetchAllData();
    setData(reloadedData);
  }, []);
  
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
    if (!isDataLoaded) {
        return <div className="flex justify-center items-center h-full">Loading data...</div>;
    }
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard data={data} />;
      case 'purchases':
        return <Purchases data={data} onDataChange={handleDataChange} />;
      case 'warehouse':
        return <Warehouse data={data} />;
      case 'roasting':
        return <Roasting data={data} onDataChange={handleDataChange} />;
      case 'roasted-inventory':
        return <RoastedInventory data={data} onDataChange={handleDataChange} />;
      case 'store-inventory':
        return <StoreInventory data={data} onDataChange={handleDataChange} />;
      case 'sales':
        return <Sales data={data} onDataChange={handleDataChange} />;
      case 'transactions':
        return <Transactions data={data} />;
      case 'reports':
        return <Reports />;
      case 'assets':
        return <Assets data={data} onDataChange={handleDataChange} />;
      case 'balance-sheet':
        return <BalanceSheet data={data} />;
      case 'settings':
        return <Settings data={data} onDataChange={handleDataChange}/>;
      case 'sync':
        return <Sync currentData={data} onDataChange={handleDataChange} />;
      default:
        return <Dashboard data={data} />;
    }
  };

  return (
    <>
      <AppSidebar activeSection={activeSection} setActiveSection={setActiveSection} />
      <div className='flex-1 flex flex-col'>
         <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
            <Button variant="ghost" size="icon" onClick={() => setOpen(true)} className='lg:hidden'>
                <Menu className='h-6 w-6' />
                <span className='sr-only'>Open Sidebar</span>
            </Button>
            <div className="flex-1">
                <h1 className="text-xl font-semibold">{sectionTitles[activeSection]}</h1>
            </div>
            <div className='relative w-full max-w-xs'>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Cari..." className="pl-9 bg-input" />
            </div>
            <div className='ml-auto flex items-center gap-2'>
                <Button variant="ghost" size="icon" className="rounded-full">
                    <Bell className="h-5 w-5"/>
                </Button>
            </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {renderSection()}
        </main>
      </div>
    </>
  );
}

    