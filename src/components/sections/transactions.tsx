'use client';
import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/stat-card';
import { formatRupiah, getTodayDateString } from '@/lib/utils';
import type { GlobalData, Transaction } from '@/lib/definitions';
import { ArrowDown, ArrowUp, Banknote, CalendarDays } from 'lucide-react';

interface TransactionsProps {
  data: GlobalData;
}

type FilterType = 'all' | 'debit' | 'kredit';

export function Transactions({ data }: TransactionsProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  
  const stats = useMemo(() => {
    const initialBalance = Number(data.settings.modal_awal) || 0;
    let totalDebit = 0;
    let totalCredit = 0;
    
    data.transactions.forEach(t => {
      totalDebit += Number(t.Debit) || 0;
      totalCredit += Number(t.Kredit) || 0;
    });

    const currentBalance = initialBalance + totalDebit - totalCredit;
    const today = getTodayDateString();
    const todayTransactions = data.transactions.filter(t => t.Tanggal === today).length;

    return { totalDebit, totalCredit, currentBalance, todayTransactions };
  }, [data.transactions, data.settings.modal_awal]);

  const filteredData = useMemo(() => {
    return data.transactions.filter(t => {
      if (filter === 'debit') return (t.Debit || 0) > 0;
      if (filter === 'kredit') return (t.Kredit || 0) > 0;
      return true;
    });
  }, [data.transactions, filter]);
  
  let runningBalance = stats.currentBalance;
  const transactionsWithBalance = filteredData.map(t => {
      const transaction = { ...t, balance: runningBalance };
      runningBalance -= ((Number(t.Debit) || 0) - (Number(t.Kredit) || 0));
      return transaction;
  });

  return (
    <div className="space-y-6">
       <div>
        <h2 className="text-3xl font-bold tracking-tight">Transaksi</h2>
        <p className="text-muted-foreground">Lacak semua debit dan kredit dari aktivitas bisnis.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Debit (Pemasukan)" value={formatRupiah(stats.totalDebit)} icon={<ArrowUp />} colorClass="text-green-500" />
        <StatCard title="Total Kredit (Pengeluaran)" value={formatRupiah(stats.totalCredit)} icon={<ArrowDown />} colorClass="text-destructive" />
        <StatCard title="Saldo Saat Ini" value={formatRupiah(stats.currentBalance)} icon={<Banknote />} colorClass="text-primary" />
        <StatCard title="Transaksi Hari Ini" value={stats.todayTransactions.toString()} icon={<CalendarDays />} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Riwayat Transaksi</CardTitle>
            <div className="flex space-x-2">
                <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>Semua</Button>
                <Button variant={filter === 'debit' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('debit')}>Debit</Button>
                <Button variant={filter === 'kredit' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('kredit')}>Kredit</Button>
            </div>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Referensi</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Kredit</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {transactionsWithBalance.length > 0 ? (
                    transactionsWithBalance.map((t) => (
                    <TableRow key={t.id}>
                        <TableCell>{new Date(t.Tanggal).toLocaleDateString('id-ID')}</TableCell>
                        <TableCell className="font-medium">{t.Deskripsi}</TableCell>
                        <TableCell>{t.Referensi}</TableCell>
                        <TableCell>{t.Kategori}</TableCell>
                        <TableCell className="text-right text-green-500">{t.Debit > 0 ? formatRupiah(t.Debit) : '-'}</TableCell>
                        <TableCell className="text-right text-destructive">{t.Kredit > 0 ? formatRupiah(t.Kredit) : '-'}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatRupiah(t.balance)}</TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                    <TableCell colSpan={7} className="text-center h-24">Belum ada transaksi.</TableCell>
                    </TableRow>
                )}
                 {filter === 'all' && (
                    <TableRow className="bg-secondary hover:bg-secondary">
                        <TableCell colSpan={6} className="font-semibold">SALDO AWAL (MODAL)</TableCell>
                        <TableCell className="text-right font-semibold">{formatRupiah(data.settings.modal_awal)}</TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
