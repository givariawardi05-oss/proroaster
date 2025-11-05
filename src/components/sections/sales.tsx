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
import { formatRupiah } from '@/lib/utils';
import type { GlobalData, SalesInvoice, StoreInventoryItem } from '@/lib/definitions';
import { PlusCircle } from 'lucide-react';
import { SalesForm } from './sales-form';
import { cn } from '@/lib/utils';

interface SalesProps {
  data: GlobalData;
}

const statusVariant: { [key: string]: 'destructive' | 'secondary' | 'default' } = {
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
    'Overdue': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    'Draft': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
}


export function Sales({ data }: SalesProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const availableProducts: StoreInventoryItem[] = data.storeInventory.filter(item => item.Stock_Kg > 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-start">
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
