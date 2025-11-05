'use client';
import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { StatCard } from '@/components/stat-card';
import { formatRupiah } from '@/lib/utils';
import type { GlobalData, StoreInventoryItem } from '@/lib/definitions';
import { Package, DollarSign, CheckCircle, AlertTriangle, PlusCircle } from 'lucide-react';
import { ManualStockForm } from './manual-stock-form';

interface StoreInventoryProps {
  data: GlobalData;
}

type FilterType = 'all' | 'low' | 'available';

export function StoreInventory({ data }: StoreInventoryProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const lowStockLimit = data.settings.stock_low_limit || 10;

  const stats = useMemo(() => {
    const totalStock = data.storeInventory.reduce((sum, item) => sum + (item.Stock_Kg || 0), 0);
    const totalValue = data.storeInventory.reduce((sum, item) => sum + (item.Total_Value || 0), 0);
    const readyToSell = data.storeInventory.filter(item => (item.Stock_Kg || 0) > 0).length;
    const lowStockCount = data.storeInventory.filter(item => (item.Stock_Kg || 0) > 0 && (item.Stock_Kg || 0) < lowStockLimit).length;
    return { totalStock, totalValue, productCount: data.storeInventory.length, readyToSell, lowStockCount };
  }, [data.storeInventory, lowStockLimit]);

  const filteredData = useMemo(() => {
    return data.storeInventory.filter(item => {
      const stock = item.Stock_Kg || 0;
      if (filter === 'low') return stock > 0 && stock < lowStockLimit;
      if (filter === 'available') return stock > 0;
      return true;
    }).sort((a, b) => b.Stock_Kg - a.Stock_Kg);
  }, [data.storeInventory, filter, lowStockLimit]);
  
  const getStatus = (stock: number): { text: string; variant: 'destructive' | 'outline' | 'secondary', className: string } => {
    if (stock === 0) return { text: 'Habis', variant: 'secondary', className: 'border-gray-400 bg-gray-50 text-gray-600' };
    if (stock < lowStockLimit) return { text: 'Stok Rendah', variant: 'destructive', className: 'border-red-500 bg-red-50 text-red-700' };
    return { text: 'Tersedia', variant: 'outline', className: 'border-green-500 bg-green-50 text-green-700' };
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventaris Toko</h2>
          <p className="text-muted-foreground">Stok siap jual di toko, termasuk merchandise.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Tambah Produk Manual
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah/Update Produk Manual</DialogTitle>
              <DialogDescription>
                Gunakan ini untuk menambahkan item non-roasting seperti merchandise atau untuk menyesuaikan stok.
              </DialogDescription>
            </DialogHeader>
            <ManualStockForm onFormSubmit={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Store Stock" value={`${stats.totalStock.toFixed(2)} kg`} icon={<Package />} description={`${stats.productCount} produk`} />
        <StatCard title="Total Value (HPP)" value={formatRupiah(stats.totalValue)} icon={<DollarSign />} description="Nilai inventaris" />
        <StatCard title="Ready to Sell" value={stats.readyToSell.toString()} icon={<CheckCircle />} description="Produk dengan stok > 0" />
        <StatCard title="Low Stock Alert" value={stats.lowStockCount.toString()} icon={<AlertTriangle />} description={`Stok < ${lowStockLimit} kg`} colorClass="text-destructive" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Daftar Produk Toko</CardTitle>
          <div className="flex space-x-2">
            <Button variant={filter === 'all' ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilter('all')}>Semua</Button>
            <Button variant={filter === 'available' ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilter('available')}>Tersedia</Button>
            <Button variant={filter === 'low' ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilter('low')}>Stok Rendah</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Stok (kg)</TableHead>
                <TableHead className="text-right">HPP/kg</TableHead>
                <TableHead className="text-right">Harga Jual/kg</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length > 0 ? (
                filteredData.map((item: StoreInventoryItem) => {
                   const status = getStatus(item.Stock_Kg);
                   return(
                    <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.Nama_Produk}</TableCell>
                        <TableCell>{item.Kategori}</TableCell>
                        <TableCell className="text-right">{item.Stock_Kg.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{formatRupiah(item.HPP_Per_Kg)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatRupiah(item.Harga_Jual_Kg)}</TableCell>
                        <TableCell className="text-right">{formatRupiah(item.Total_Value)}</TableCell>
                        <TableCell className="text-center">
                            <Badge variant={status.variant} className={status.className}>{status.text}</Badge>
                        </TableCell>
                    </TableRow>
                   )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24">
                    Tidak ada produk di toko.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
