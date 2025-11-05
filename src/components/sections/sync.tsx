'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTransition } from 'react';
import { resetAllData } from '@/lib/actions';
import { toast } from '@/hooks/use-toast';
import { AlertTriangle, Download, Upload } from 'lucide-react';
import { getAllData, writeAllData } from '@/lib/local-storage-helpers';

export function Sync() {
  const [isPending, startTransition] = useTransition();

  const handleReset = () => {
    startTransition(async () => {
      const result = await resetAllData();
      if (result.status === 'success') {
        toast({
          title: 'Reset Berhasil',
          description: result.message,
        });
        window.location.reload();
      } else {
        toast({
          title: 'Reset Gagal',
          description: result.message,
          variant: 'destructive',
        });
      }
    });
  };

  const handleExport = async () => {
    const data = await getAllData();
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `blackhorse_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    toast({ title: "Ekspor Berhasil", description: "Data Anda telah diekspor ke file JSON." });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const text = e.target?.result;
            if (typeof text !== 'string') throw new Error("File is not a valid text file.");
            const data = JSON.parse(text);
            // Basic validation
            if (data.settings && Array.isArray(data.transactions)) {
                await writeAllData(data);
                toast({ title: "Impor Berhasil", description: "Data berhasil dipulihkan. Halaman akan dimuat ulang." });
                setTimeout(() => window.location.reload(), 1500);
            } else {
                throw new Error("Invalid data structure in JSON file.");
            }
        } catch (err: any) {
            toast({ title: "Impor Gagal", description: err.message, variant: "destructive" });
        }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Impor, Ekspor & Reset</h2>
        <p className="text-muted-foreground">Pengelolaan Data Lokal.</p>
      </div>

       <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Impor / Ekspor Data</CardTitle>
          <CardDescription>Simpan cadangan data Anda atau pulihkan dari file.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button onClick={handleExport}>
                <Download className='mr-2 h-4 w-4' /> Ekspor Data ke JSON
            </Button>
            <Button asChild>
                <label htmlFor="import-file">
                    <Upload className="mr-2 h-4 w-4" /> Impor Data dari JSON
                    <input type="file" id="import-file" accept=".json" className="sr-only" onChange={handleImport} />
                </label>
            </Button>
        </CardContent>
      </Card>


      <Card className="max-w-2xl border-destructive">
        <CardHeader>
          <CardTitle className='text-destructive'>Zona Berbahaya</CardTitle>
          <CardDescription>Gunakan alat ini dengan hati-hati. Tidak ada undo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <AlertTriangle className="mr-2 h-4 w-4" /> Reset SEMUA Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Apakah Anda Benar-Benar Yakin?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tindakan ini akan menghapus SEMUA data dari penyimpanan lokal browser Anda (transaksi, inventori, dll). Pengaturan akan tetap ada. Tindakan ini TIDAK DAPAT DIBATALKAN.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset} disabled={isPending}>
                  {isPending ? 'Mereset...' : 'Ya, Hapus Semua Data'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
