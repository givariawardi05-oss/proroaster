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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  onDataChange: (data: GlobalData) => void;
}

export function Purchases({ data, onDataChange }: PurchasesProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const handleFormSubmit = (newData: GlobalData) => {
      onDataChange(newData);
      setIsDialogOpen(false);
  }

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Faktur Pembelanjaan</h2>
          <p className="text-muted-foreground">Catat semua pembelian green beans dari supplier.</p>
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
              <DialogDescription>
                Isi detail pembelian di bawah ini. Stok akan otomatis masuk ke Gudang Green Beans.
              </DialogDescription>
            </DialogHeader>
            <PurchaseForm
              nextInvoiceNumber={data.nextIds.purchaseInvoice}
              onFormSubmit={handleFormSubmit}
              currentData={data}
            />
          </DialogContent>
        </Dialog>
      </header>
      
      <Card>
        <CardHeader>
          <CardTitle>Daftar Faktur Pembelian</CardTitle>
        </CardHeader>
        <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Faktur</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.purchaseInvoices.length > 0 ? (
                data.purchaseInvoices.map((inv: PurchaseInvoice) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.No_Faktur}</TableCell>
                    <TableCell>{inv.Supplier}</TableCell>
                    <TableCell>{new Date(inv.Tanggal).toLocaleDateString('id-ID')}</TableCell>
                    <TableCell className="text-right">{formatRupiah(inv.Total_Faktur)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="border-green-500 bg-green-50 text-green-700">
                        {inv.Status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm">
                        Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    Belum ada faktur pembelian.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        </CardContent>
      </Card>
    </div>
  );
}

    