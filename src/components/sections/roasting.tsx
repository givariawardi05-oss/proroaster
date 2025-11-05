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
import type { GlobalData, RoastingBatch } from '@/lib/definitions';
import { PlusCircle } from 'lucide-react';
import { RoastingForm } from './roasting-form';

interface RoastingProps {
  data: GlobalData;
}

export function Roasting({ data }: RoastingProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const availableBeans = data.warehouseData.filter(item => item.Stock_Kg > 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-start">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Buat Batch Roasting
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Batch Roasting Baru</DialogTitle>
            </DialogHeader>
            <RoastingForm
              nextBatchId={data.nextIds.roastingBatch}
              availableBeans={availableBeans}
              onFormSubmit={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Riwayat Batch Roasting</CardTitle>
        </CardHeader>
        <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch ID</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Green Beans</TableHead>
              <TableHead className="text-right">Input</TableHead>
              <TableHead className="text-right">Output</TableHead>
              <TableHead>Profil</TableHead>
              <TableHead className="text-right">HPP/kg</TableHead>
              <TableHead className="text-right">Jual/kg</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.roastingBatches.length > 0 ? (
              data.roastingBatches.map((batch: RoastingBatch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-medium">{batch.Batch_ID}</TableCell>
                  <TableCell>{new Date(batch.Tanggal).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell>{batch.Green_Beans}</TableCell>
                  <TableCell className="text-right">{batch.Input_Kg.toFixed(1)} kg</TableCell>
                  <TableCell className="text-right">{batch.Output_Kg.toFixed(2)} kg</TableCell>
                  <TableCell>{batch.Profile} ({batch.Yield_Persen})</TableCell>
                  <TableCell className="text-right">{formatRupiah(batch.HPP_Per_Kg)}</TableCell>
                  <TableCell className="text-right">{formatRupiah(batch.Harga_Jual_Kg)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {batch.Status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center h-24">
                  Belum ada batch roasting.
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
