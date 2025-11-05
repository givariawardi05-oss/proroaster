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
import { AlertTriangle } from 'lucide-react';

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
      } else {
        toast({
          title: 'Reset Gagal',
          description: result.message,
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Firebase Sync</h2>
        <p className="text-muted-foreground">Pengelolaan Database dan Alat Darurat.</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Database Tools</CardTitle>
          <CardDescription>Gunakan alat ini dengan hati-hati. Tidak ada undo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className='p-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-r-lg'>
                <h4 className='font-semibold text-blue-800 dark:text-blue-300'>Snapshot Database</h4>
                <p className='text-sm text-blue-700 dark:text-blue-400'>
                Database Firestore Anda secara otomatis dicadangkan oleh Google Cloud. Anda dapat mengelola snapshot dan pemulihan dari Google Cloud Console.
                </p>
            </div>

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
                  Tindakan ini akan menghapus SEMUA data transaksi, pembelian, roasting, dan inventori dari database Firestore. Tindakan ini TIDAK DAPAT DIBATALKAN. Data pengaturan tidak akan dihapus.
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
