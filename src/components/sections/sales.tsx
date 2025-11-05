'use client';
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatRupiah } from '@/lib/utils';
import type { GlobalData, SalesInvoice, StoreInventoryItem } from '@/lib/definitions';
import { PlusCircle } from 'lucide-react';
import { SalesForm } from './sales-form';

interface SalesProps {
  data: GlobalData;
}

const statusVariant: { [key: string]: 'destructive' | 'warning' | 'secondary' | 'default' } = {
    'Draft': 'secondary',
    'Sent': 'default',
    'Paid': 'default',
    'Lunas': 'default',
    'Overdue': 'destructive'
};

const statusColor: { [key: string]: string } = {
    'Paid': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'Lunas': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'Sent': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
}


export function Sales({ data }: SalesProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const availableProducts: StoreInventoryItem[] = data.storeInventory.filter(item => item.Stock_Kg > 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Invoice Penjualan</h2>
          <p className="text-muted-foreground">Kelola invoice penjualan dan kurangi stok toko.</p>
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
            </DialogHeader>
            <SalesForm
              nextInvoiceNumber={data.nextIds.salesInvoice}
              availableProducts={availableProducts}
              onFormSubmit={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Jatuh Tempo</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Aksi</TableHead>
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
                  <TableCell>{formatRupiah(inv.Total_Invoice)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[inv.Status_Bayar] || 'secondary'} className={statusColor[inv.Status_Bayar]}>
                      {inv.Status_Bayar}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">Cetak</Button>
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
      </Card>
    </div>
  );
}
