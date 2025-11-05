"use client";
import React, { useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useActionState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/submit-button';
import { saveSettings } from '@/lib/actions';
import { toast } from '@/hooks/use-toast';
import type { GlobalData } from '@/lib/definitions';

interface SettingsProps {
  data: GlobalData;
  onDataChange: (data: GlobalData) => void;
}

const settingsSchema = z.object({
  company_name: z.string().min(1, 'Nama perusahaan wajib diisi'),
  stock_low_limit: z.coerce.number().min(0, 'Batas stok tidak boleh negatif'),
  modal_awal: z.coerce.number().min(0, 'Modal awal tidak boleh negatif'),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export function Settings({ data, onDataChange }: SettingsProps) {
  const [state, formAction, isPending] = useActionState(saveSettings.bind(null, data), null);
  const [isTransitioning, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      company_name: data.settings.company_name || 'BlackHorse Roastery',
      stock_low_limit: data.settings.stock_low_limit || 10,
      modal_awal: data.settings.modal_awal || 0,
    },
  });

  useEffect(() => {
    if (!state) return;
    if (state.status === 'success' && state.data) {
      toast({ title: 'Sukses!', description: state.message });
      onDataChange(state.data);
    } else if (state.status === 'error') {
      toast({
        title: 'Error!',
        description: state.message || 'Terjadi kesalahan saat menyimpan.',
        variant: 'destructive',
      });
    }
  }, [state, onDataChange]);

  const onFormSubmitWithData = (data: SettingsFormValues) => {
    startTransition(() => {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            formData.append(key, String(value));
        });
        formAction(formData);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Pengaturan</h2>
        <p className="text-muted-foreground">Konfigurasi sistem dan informasi perusahaan.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi &amp; Konfigurasi Sistem</CardTitle>
          <CardDescription>Perubahan pada pengaturan akan mempengaruhi kalkulasi di seluruh sistem.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onFormSubmitWithData)} className="space-y-6 max-w-2xl">
            <div>
              <Label htmlFor="company_name">Nama Perusahaan</Label>
              <Input id="company_name" {...register('company_name')} />
              {errors.company_name && <p className="text-sm text-destructive mt-1">{errors.company_name.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="stock_low_limit">Batas Stok Rendah (kg)</Label>
                <Input id="stock_low_limit" type="number" {...register('stock_low_limit')} />
                {errors.stock_low_limit && <p className="text-sm text-destructive mt-1">{errors.stock_low_limit.message}</p>}
                <p className="text-xs text-muted-foreground mt-1">Peringatan akan muncul jika stok di bawah nilai ini.</p>
              </div>
              <div>
                <Label htmlFor="modal_awal">Modal Awal (Rp)</Label>
                <Input id="modal_awal" type="number" {...register('modal_awal')} />
                {errors.modal_awal && <p className="text-sm text-destructive mt-1">{errors.modal_awal.message}</p>}
                 <p className="text-xs text-muted-foreground mt-1">Hanya diisi 1x di awal, mempengaruhi Neraca.</p>
              </div>
            </div>

            <div className="pt-4">
              <SubmitButton pending={isPending || isTransitioning} pendingText="Menyimpan...">Simpan Pengaturan</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
