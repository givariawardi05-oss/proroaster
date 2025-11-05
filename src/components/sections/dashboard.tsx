import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { formatRupiah } from '@/lib/utils';
import type { GlobalData } from '@/lib/definitions';
import { DollarSign, Package, Warehouse, Store } from 'lucide-react';

interface DashboardProps {
  data: GlobalData;
}

export function Dashboard({ data }: DashboardProps) {
  const totalSales = data.transactions.filter(t => t.Kategori === 'Penjualan/Debit').reduce((sum, t) => sum + (t.Debit || 0), 0);
  const warehouseStock = data.warehouseData.reduce((sum, item) => sum + (item.Stock_Kg || 0), 0);
  const roastedStock = data.roastedInventory.reduce((sum, item) => sum + (item.Stock_Kg || 0), 0);
  const storeStock = data.storeInventory.reduce((sum, item) => sum + (item.Stock_Kg || 0), 0);
  
  const workflowSteps = [
    { text: "Faktur Pembelanjaan → Warehouse" },
    { text: "Warehouse → Management Roasting" },
    { text: "Roasting → Inventory Hasil Roasting" },
    { text: "Inventory Roasting → Inventory Store" },
    { text: "Store → Invoice Penjualan" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Ringkasan aktivitas bisnis roastery Anda.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Penjualan" value={formatRupiah(totalSales)} icon={<DollarSign />} colorClass="text-green-500" />
        <StatCard title="Warehouse Stock" value={`${warehouseStock.toFixed(1)} kg`} icon={<Warehouse />} colorClass="text-orange-500" />
        <StatCard title="Roasted Stock" value={`${roastedStock.toFixed(1)} kg`} icon={<Package />} colorClass="text-cyan-500" />
        <StatCard title="Store Stock" value={`${storeStock.toFixed(1)} kg`} icon={<Store />} colorClass="text-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Alur Kerja Sistem</CardTitle>
            <CardDescription>Langkah-langkah utama dalam proses bisnis dari hulu ke hilir.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workflowSteps.map((step, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="flex-shrink-0 size-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">{index + 1}</div>
                  <span className="text-sm font-medium">{step.text}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Aktivitas Terbaru</CardTitle>
                <CardDescription>Log singkat dari aktivitas terakhir dalam sistem.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {data.transactions.slice(0, 3).map(t => (
                        <div key={t.id} className="flex items-start space-x-3">
                             <div className="flex-shrink-0 size-6 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                                {t.Debit > 0 ? 'D' : 'K'}
                            </div>
                            <div>
                                <p className="text-sm font-medium">{t.Deskripsi}</p>
                                <p className="text-xs text-muted-foreground">{new Date(t.Tanggal).toLocaleDateString('id-ID')} - {t.Debit > 0 ? formatRupiah(t.Debit) : formatRupiah(t.Kredit)}</p>
                            </div>
                        </div>
                    ))}
                    {data.transactions.length === 0 && (
                         <div className="text-center text-muted-foreground py-8">
                            <p>Belum ada aktivitas.</p>
                         </div>
                    )}
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
