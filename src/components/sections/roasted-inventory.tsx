'use client';
import React, { useState, useMemo, useTransition } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/stat-card';
import { formatRupiah } from '@/lib/utils';
import type { GlobalData, RoastedInventoryItem } from '@/lib/definitions';
import { Package, DollarSign, Scale, ArrowRight } from 'lucide-react';
import { transferToStore } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { SubmitButton } from '../submit-button';

interface RoastedInventoryProps {
  data: GlobalData;
  onDataChange: (data: GlobalData | Omit<GlobalData, 'nextIds' | 'currentBalance'>) => void;
}

export function RoastedInventory({ data, onDataChange }: RoastedInventoryProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const stats = useMemo(() => {
    const totalStock = (data.roastedInventory || []).reduce((sum, item) => sum + (item.Stock_Kg || 0), 0);
    const totalValue = (data.roastedInventory || []).reduce((sum, item) => sum + (item.Total_Value || 0), 0);
    const avgHpp = totalStock > 0 ? totalValue / totalStock : 0;
    return { totalStock, totalValue, avgHpp, productCount: (data.roastedInventory || []).length };
  }, [data.roastedInventory]);

  const handleSelectAll = (checked: boolean | string) => {
    if (checked) {
      const allIds = new Set((data.roastedInventory || []).filter(i => i.Stock_Kg > 0).map(item => item.id));
      setSelectedItems(allIds);
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (id: string, checked: boolean | string) => {
    const newSelection = new Set(selectedItems);
    if (checked) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    setSelectedItems(newSelection);
  };
  
  const handleTransfer = () => {
    startTransition(async () => {
        const itemsToTransfer = Array.from(selectedItems).map(id => ({ id }));
        const result = await transferToStore(data, itemsToTransfer);
        if (result.status === 'success' && result.data) {
            toast({ title: 'Sukses', description: result.message });
            onDataChange(result.data);
            setSelectedItems(new Set());
        } else {
            toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
    });
  }

  const itemsWithStock = (data.roastedInventory || []).filter(item => item.Stock_Kg > 0);
  const isAllSelected = itemsWithStock.length > 0 && selectedItems.size === itemsWithStock.length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inventory Hasil Roasting</h2>
          <p className="text-muted-foreground">Stok hasil roasting yang siap dipindah ke toko.</p>
        </div>
        <SubmitButton onClick={handleTransfer} disabled={selectedItems.size === 0} pending={isPending} pendingText="Mentransfer...">
          {`Transfer ${selectedItems.size} Item`}
          <ArrowRight className="ml-2 h-4 w-4" />
        </SubmitButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Total Roasted Stock" value={`${stats.totalStock.toFixed(2)} kg`} icon={<Package />} description={`${stats.productCount} jenis produk`} />
        <StatCard title="Total Value (HPP)" value={formatRupiah(stats.totalValue)} icon={<DollarSign />} description="Nilai inventory" />
        <StatCard title="Avg HPP" value={formatRupiah(stats.avgHpp)} icon={<Scale />} description="Per kilogram" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stok Hasil Roasting</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox 
                    checked={isAllSelected} 
                    onCheckedChange={handleSelectAll} 
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Produk</TableHead>
                <TableHead>Stok (kg)</TableHead>
                <TableHead>HPP/kg</TableHead>
                <TableHead>Harga Jual/kg</TableHead>
                <TableHead>Total Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsWithStock.length > 0 ? (
                itemsWithStock.map((item: RoastedInventoryItem) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={(checked) => handleSelectItem(item.id, checked)}
                        aria-label={`Select ${item.Produk_Roasting}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{item.Produk_Roasting}</TableCell>
                    <TableCell>{item.Stock_Kg.toFixed(2)}</TableCell>
                    <TableCell>{formatRupiah(item.HPP_Per_Kg)}</TableCell>
                    <TableCell>{formatRupiah(item.Harga_Jual_Kg)}</TableCell>
                    <TableCell>{formatRupiah(item.Total_Value)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    Tidak ada stok hasil roasting yang tersedia.
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
