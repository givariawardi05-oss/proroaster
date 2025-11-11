'use client';
import React, { useState, useMemo, useEffect } from 'react';
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
import { StatCard } from '@/components/stat-card';
import { formatRupiah } from '@/lib/utils';
// Kita butuh tipe Asset dari Prisma, bukan definitions
import type { Asset } from '@/generated/prisma/client';
import { PlusCircle, DollarSign, Building, Loader2 } from 'lucide-react';
import { AssetForm } from './asset-form';
import { getAssets } from '@/lib/actions'; // <-- Import fungsi getAssets

// Komponen ini tidak lagi menerima props 'data' atau 'onDataChange'
export function Assets() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // State lokal untuk menyimpan data dari database
  const [assetsData, setAssetsData] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fungsi untuk mengambil data
  const loadAssets = async () => {
    setIsLoading(true);
    const data = await getAssets();
    setAssetsData(data);
    setIsLoading(false);
  };

  // Ambil data saat komponen pertama kali dimuat
  useEffect(() => {
    loadAssets();
  }, []);

  // Logika 'useMemo' ini di-update untuk menggunakan field Prisma
  const processedAssets = useMemo(
    () =>
      (assetsData || []).map((asset) => {
        // NAMA FIELD BARU DARI PRISMA
        const purchaseValue = asset.purchaseValue || 0;
        const depreciationAnnual = asset.depreciationPerYear || 0;
        if (depreciationAnnual === 0) return { ...asset, bookValue: purchaseValue };

        const acquisitionDate = new Date(asset.purchaseDate);
        const today = new Date();
        const yearsHeld = (today.getTime() - acquisitionDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        const accumulatedDepreciation = depreciationAnnual * yearsHeld;
        const bookValue = Math.max(0, purchaseValue - accumulatedDepreciation);
        return { ...asset, bookValue };
      }),
    [assetsData],
  );

  const stats = useMemo(() => {
    let totalCurrentAssets = 0;
    let totalFixedAssets = 0;
    processedAssets.forEach((asset) => {
      // NAMA FIELD BARU DARI PRISMA
      if (asset.category.toLowerCase().includes('tetap')) {
        totalFixedAssets += asset.bookValue;
      } else {
        totalCurrentAssets += asset.bookValue;
      }
    });
    return { totalCurrentAssets, totalFixedAssets, totalAllAssets: totalCurrentAssets + totalFixedAssets };
  }, [processedAssets]);

  // INI DIA "CARA LAPOR" YANG HILANG
  const handleSaveSuccess = () => {
    setIsDialogOpen(false); // 1. Tutup dialog
    loadAssets(); // 2. Ambil ulang data dari database
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Data Aset</h2>
          <p className="text-muted-foreground">Kelola semua aset perusahaan dan hitung penyusutan.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Tambah Aset
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Tambah Aset Baru</DialogTitle>
              <DialogDescription>Isi formulir di bawah ini untuk menambahkan aset baru ke dalam sistem.</DialogDescription>
            </DialogHeader>
            {/* INI DIA PERBAIKANNYA: 
              Kita memberikan 'handleSaveSuccess' ke 'AssetForm' 
            */}
            <AssetForm onSaveSuccess={handleSaveSuccess} />
          </DialogContent>
        </Dialog>
      </header>

      {/* ... (StatCard tetap sama) ... */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Aset Lancar" value={formatRupiah(stats.totalCurrentAssets)} icon={<DollarSign />} colorClass="text-green-500" />
        <StatCard title="Total Aset Tetap (Nilai Buku)" value={formatRupiah(stats.totalFixedAssets)} icon={<Building />} colorClass="text-orange-500" />
        <StatCard title="Total Semua Aset" value={formatRupiah(stats.totalAllAssets)} icon={<DollarSign />} colorClass="text-blue-500" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Aset</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Aset</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Tgl Perolehan</TableHead>
                  <TableHead>Nilai Perolehan</TableHead>
                  <TableHead>Penyusutan/Tahun</TableHead>
                  <TableHead>Nilai Buku</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedAssets.length > 0 ? (
                  processedAssets.map((asset) => (
                    <TableRow key={asset.id}>
                      {/* NAMA FIELD BARU DARI PRISMA */}
                      <TableCell className="font-medium">{asset.name}</TableCell>
                      <TableCell>{asset.category}</TableCell>
                      <TableCell>{new Date(asset.purchaseDate).toLocaleDateString('id-ID')}</TableCell>
                      <TableCell className="text-right">{formatRupiah(asset.purchaseValue)}</TableCell>
                      <TableCell className="text-right">{formatRupiah(asset.depreciationPerYear)}</TableCell>
                      <TableCell className="font-semibold text-right">{formatRupiah(asset.bookValue)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                      Belum ada data aset.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );

}
