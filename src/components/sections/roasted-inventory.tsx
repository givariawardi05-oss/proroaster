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
import type { GlobalData, RoastedInventoryItem } from '@/lib/definitions';
import { Package, DollarSign, Scale, ArrowRight, Blend } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SubmitButton } from '../submit-button';
import { BlendForm } from './blend-form';

interface RoastedInventoryProps {
  data: GlobalData;
  onDataChange: (data: GlobalData | Omit<GlobalData, 'nextIds' | 'currentBalance'>) => void;
}

export function RoastedInventory({ data, onDataChange }: RoastedInventoryProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [isBlendDialogOpen, setIsBlendDialogOpen] = useState(false);

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
  
    const handleBlendFormSubmit = (newData: GlobalData | Omit<GlobalData, 'nextIds' | 'currentBalance'>) => {
    onDataChange(newData);
    setIsBlendDialogOpen(false);
  }

  const handleTransfer = () => {
    startTransition(async () => {
        const itemsToTransfer = Array.from(selectedItems).map(id => ({ id }));
        const formData = new FormData();
        formData.append('currentData', JSON.stringify(data));
        formData.append('itemsToTransfer', JSON.stringify(itemsToTransfer));
        
        // This is a placeholder for a server action that doesn't exist yet.
        // To make this functional, you would replace this with:
        // const result = await transferToStoreAction(null, formData);
        // For now, we simulate the logic client-side to demonstrate UI changes.
        
        try {
            const db: GlobalData = JSON.parse(formData.get('currentData') as string);
            const itemsToTransfer: { id: string }[] = JSON.parse(formData.get('itemsToTransfer') as string);

            if (!itemsToTransfer || itemsToTransfer.length === 0) {
                 toast({ title: 'Error', description: 'Tidak ada item yang dipilih untuk ditransfer.', variant: 'destructive' });
                 return;
            }

            let updatedDb = { ...db, roastedInventory: [...db.roastedInventory], storeInventory: [...db.storeInventory] };

            for (const item of itemsToTransfer) {
                const roastedIndex = updatedDb.roastedInventory.findIndex(i => i.id === item.id);
                if (roastedIndex === -1) continue;
                
                const roastedDoc = updatedDb.roastedInventory[roastedIndex];
                const stockToTransfer = roastedDoc.Stock_Kg;

                if (stockToTransfer <= 0) continue;

                const storeInvIndex = updatedDb.storeInventory.findIndex(si => si.Nama_Produk === roastedDoc.Produk_Roasting);
                const hpp = roastedDoc.HPP_Per_Kg;
                const valueToTransfer = stockToTransfer * hpp;
                const sellPrice = roastedDoc.Harga_Jual_Kg > 0 ? roastedDoc.Harga_Jual_Kg : hpp * 1.5; // Use existing or default
                const category = roastedDoc.Kategori || 'Roasted Beans';

                if (storeInvIndex > -1) {
                    const storeInvItem = updatedDb.storeInventory[storeInvIndex];
                    const newStoreStock = storeInvItem.Stock_Kg + stockToTransfer;
                    const newStoreValue = storeInvItem.Total_Value + valueToTransfer;
                    storeInvItem.Stock_Kg = newStoreStock;
                    storeInvItem.Total_Value = newStoreValue;
                    storeInvItem.HPP_Per_Kg = newStoreStock > 0 ? newStoreValue / newStoreStock : 0;
                    storeInvItem.Harga_Jual_Kg = storeInvItem.Harga_Jual_Kg > 0 ? storeInvItem.Harga_Jual_Kg : sellPrice;
                } else {
                    updatedDb.storeInventory.push({
                        id: roastedDoc.Produk_Roasting.replace(/\s+/g, '-').toLowerCase() + `-${Date.now()}`,
                        Nama_Produk: roastedDoc.Produk_Roasting,
                        Kategori: category,
                        Stock_Kg: stockToTransfer,
                        HPP_Per_Kg: hpp,
                        Harga_Jual_Kg: sellPrice,
                        Total_Value: valueToTransfer,
                    });
                }
                
                roastedDoc.Stock_Kg = 0;
                roastedDoc.Total_Value = 0;
            }
             toast({ title: 'Sukses', description: `${itemsToTransfer.length} item berhasil ditransfer ke toko.` });
             onDataChange(updatedDb);
             setSelectedItems(new Set());
        } catch (e: any) {
            toast({ title: 'Error', description: e.message, variant: 'destructive' });
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
        <div className="flex gap-2">
            <Dialog open={isBlendDialogOpen} onOpenChange={setIsBlendDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Blend className="mr-2 h-4 w-4" />
                  Buat Blend Produk
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Buat Produk Blend Baru</DialogTitle>
                  <DialogDescription>
                    Campurkan beberapa produk dari inventaris roasted untuk membuat produk baru.
                  </DialogDescription>
                </DialogHeader>
                <BlendForm onFormSubmit={handleBlendFormSubmit} currentData={data} />
              </DialogContent>
            </Dialog>

            <SubmitButton onClick={handleTransfer} disabled={selectedItems.size === 0 || isPending} pending={isPending} pendingText="Mentransfer...">
            {`Transfer ${selectedItems.size} Item`}
            <ArrowRight className="ml-2 h-4 w-4" />
            </SubmitButton>
        </div>
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
                <TableHead>Kategori</TableHead>
                <TableHead>Stok (kg)</TableHead>
                <TableHead>HPP/kg</TableHead>
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
                    <TableCell>
                        <Badge variant={item.Kategori === 'Blend' ? 'default' : 'secondary'}>{item.Kategori || 'Roasted Beans'}</Badge>
                    </TableCell>
                    <TableCell>{item.Stock_Kg.toFixed(2)}</TableCell>
                    <TableCell>{formatRupiah(item.HPP_Per_Kg)}</TableCell>
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
