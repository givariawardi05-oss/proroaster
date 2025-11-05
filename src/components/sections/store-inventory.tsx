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
  
  const getStatus = (stock: number): { text: string; variant: 'destructive' | 'warning' | 'secondary' | 'default' | 'outline' } => {
    if (stock === 0) return { text: 'Habis', variant: 'secondary' };
    if (stock < lowStockLimit) return { text: 'Stok Rendah', variant: 'destructive' };
    return { text: 'Tersedia', variant: 'default' };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inventory Store</h2>
          <p className="text-muted-foreground">Stok siap jual di toko.</p>
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
            </DialogHeader>
            <ManualStockForm onFormSubmit={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Store Stock" value={`${stats.totalStock.toFixed(2)} kg`} icon={<Package />} description={`${stats.productCount} produk`} />
        <StatCard title="Total Value (HPP)" value={formatRupiah(stats.totalValue)} icon={<DollarSign />} description="Nilai inventory" />
        <StatCard title="Ready to Sell" value={stats.readyToSell.toString()} icon={<CheckCircle />} description="Produk dengan stok > 0" />
        <StatCard title="Low Stock Alert" value={stats.lowStockCount.toString()} icon={<AlertTriangle />} description="Item di bawah batas" colorClass="text-destructive" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Stok Toko</CardTitle>
          <div className="flex space-x-2">
            <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>Semua</Button>
            <Button variant={filter === 'available' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('available')}>Tersedia</Button>
            <Button variant={filter === 'low' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('low')}>Stok Rendah</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Stok (kg)</TableHead>
                <TableHead>HPP/kg</TableHead>
                <TableHead>Harga Jual/kg</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Status</TableHead>
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
                        <TableCell>{item.Stock_Kg.toFixed(2)}</TableCell>
                        <TableCell>{formatRupiah(item.HPP_Per_Kg)}</TableCell>
                        <TableCell>{formatRupiah(item.Harga_Jual_Kg)}</TableCell>
                        <TableCell>{formatRupiah(item.Total_Value)}</TableCell>
                        <TableCell>
                            <Badge variant={status.variant}>{status.text}</Badge>
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
