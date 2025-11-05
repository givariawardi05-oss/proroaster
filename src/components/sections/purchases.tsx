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
import type { GlobalData, PurchaseInvoice } from '@/lib/definitions';
import { PlusCircle } from 'lucide-react';
import { PurchaseForm } from './purchase-form';

interface PurchasesProps {
  data: GlobalData;
}

export function Purchases({ data }: PurchasesProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Faktur Pembelanjaan</h2>
          <p className="text-muted-foreground">Kelola pembelian green beans Anda.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Buat Faktur Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Faktur Pembelanjaan Baru</DialogTitle>
            </DialogHeader>
            <PurchaseForm
              nextInvoiceNumber={data.nextIds.purchaseInvoice}
              onFormSubmit={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Faktur</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.purchaseInvoices.length > 0 ? (
                data.purchaseInvoices.map((inv: PurchaseInvoice) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.No_Faktur}</TableCell>
                    <TableCell>{inv.Supplier}</TableCell>
                    <TableCell>{new Date(inv.Tanggal).toLocaleDateString('id-ID')}</TableCell>
                    <TableCell>{formatRupiah(inv.Total_Faktur)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        {inv.Status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        Cetak
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Belum ada faktur pembelian.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
