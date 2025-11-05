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

interface MainLayoutProps {
  initialData: GlobalData;
}

export default function MainLayout({ initialData }: MainLayoutProps) {
  const [activeSection, setActiveSection] = useState<SectionName>('dashboard');

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
      <SidebarInset className="max-h-screen overflow-y-auto">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-6 backdrop-blur-md">
            <SidebarTrigger className="lg:hidden" />
            <h1 className="text-xl font-semibold capitalize">{activeSection.replace('-', ' ')}</h1>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
            {renderSection()}
        </main>
      </SidebarInset>
    </>
  );
}
