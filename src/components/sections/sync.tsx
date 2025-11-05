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
import { useActionState, useTransition } from 'react';
import { resetAllData } from '@/lib/actions';
import { toast } from '@/hooks/use-toast';
import { AlertTriangle, Download, Upload } from 'lucide-react';
import { getAllData, writeAllData } from '@/lib/local-storage-helpers';
import type { GlobalData } from '@/lib/definitions';

interface SyncProps {
  currentData: GlobalData;
  onDataChange: (data: GlobalData) => void;
}

export function Sync({ currentData, onDataChange }: SyncProps) {
  const [state, formAction, isPending] = useActionState(resetAllData.bind(null, currentData), null);

 React.useEffect(() => {
    if (!state) return;
    if (state.status === 'success' && state.data) {
        toast({
          title: 'Reset Berhasil',
          description: state.message,
        });
        onDataChange(state.data);
    } else if (state.status === 'error') {
        toast({
          title: 'Reset Gagal',
          description: state.message,
          variant: 'destructive',
        });
    }
 }, [state, onDataChange]);


  const handleExport = async () => {
    // We use currentData from props to ensure we export the latest state
    const dataToExport = {
      ...currentData,
      nextIds: undefined, // Don't export volatile state
      currentBalance: undefined, // Don't export calculated state
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(dataToExport, null, 2)
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
                await writeAllData(data); // Write the imported data to localStorage
                const freshData = await getAllData(true); // Force reload from localStorage
                onDataChange(freshData as GlobalData); // Update the main state
                toast({ title: "Impor Berhasil", description: "Data berhasil dipulihkan." });
            } else {
                throw new Error("Invalid data structure in JSON file.");
            }
        } catch (err: any) {
            toast({ title: "Impor Gagal", description: err.message, variant: "destructive" });
        }
    };
    reader.readAsText(file);
    // Reset file input to allow importing the same file again
    event.target.value = '';
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
                <form action={formAction}>
                    <SubmitButton variant="destructive" pending={isPending} pendingText="Mereset...">
                        Ya, Hapus Semua Data
                    </SubmitButton>
                </form>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

    