'use client';
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatRupiah, cn } from '@/lib/utils';
import type { GlobalData, SalesInvoice, StoreInventoryItem } from '@/lib/definitions';
import { PlusCircle } from 'lucide-react';
import { SalesForm } from './sales-form';

interface SalesProps {
  data: GlobalData;
  onDataChange: (data: GlobalData | Omit<GlobalData, 'nextIds' | 'currentBalance'>) => void;
}

const statusVariant: { [key: string]: 'destructive' | 'secondary' | 'outline' } = {
    'Draft': 'secondary',
    'Sent': 'outline',
    'Paid': 'outline',
    'Lunas': 'outline',
    'Overdue': 'destructive'
};

const statusColor: { [key: string]: string } = {
    'Paid': 'border-green-500 bg-green-50 text-green-700',
    'Lunas': 'border-green-500 bg-green-50 text-green-700',
    'Sent': 'border-blue-500 bg-blue-50 text-blue-700',
    'Overdue': 'border-red-500 bg-red-50 text-red-700',
    'Draft': 'border-gray-400 bg-gray-50 text-gray-600',
}


export function Sales({ data, onDataChange }: SalesProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const availableProducts: StoreInventoryItem[] = (data.storeInventory || []).filter(item => item.Stock_Kg > 0);
  
  const handleFormSubmit = (newData: GlobalData | Omit<GlobalData, 'nextIds' | 'currentBalance'>) => {
    onDataChange(newData);
    setIsDialogOpen(false);
  }

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Invoice Penjualan</h2>
          <p className="text-muted-foreground">Buat dan kelola invoice untuk pelanggan.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Buat Invoice Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Invoice Penjualan Baru</DialogTitle>
              <DialogDescription>
                Pilih produk dari inventaris toko. Stok akan otomatis terpotong saat invoice disimpan.
              </DialogDescription>
            </DialogHeader>
            <SalesForm
              nextInvoiceNumber={data.nextIds.salesInvoice}
              availableProducts={availableProducts}
              onFormSubmit={handleFormSubmit}
              currentData={data}
            />
          </DialogContent>
        </Dialog>
      </header>

      <Card>
        <CardHeader>
            <CardTitle>Riwayat Invoice Penjualan</CardTitle>
        </CardHeader>
        <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Jatuh Tempo</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.salesInvoices.length > 0 ? (
              data.salesInvoices.map((inv: SalesInvoice) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.No_Invoice}</TableCell>
                  <TableCell>{inv.Customer}</TableCell>
                  <TableCell>{new Date(inv.Tanggal).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell>{new Date(inv.Jatuh_Tempo).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell className="text-right">{formatRupiah(inv.Total_Invoice)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={statusVariant[inv.Status_Bayar] || 'secondary'} className={cn(statusColor[inv.Status_Bayar])}>
                      {inv.Status_Bayar}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">Detail</Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24">
                  Belum ada invoice penjualan.
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
