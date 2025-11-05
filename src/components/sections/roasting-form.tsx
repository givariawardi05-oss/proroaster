"use client";

import React, { useEffect, useMemo, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useActionState } from "react";
import { createRoastingBatch } from "@/lib/actions";
import { toast } from "@/hooks/use-toast";
import { formatRupiah, getTodayDateString } from "@/lib/utils";
import type { WarehouseItem } from "@/lib/definitions";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";

const roastingSchema = z.object({
  batchId: z.string(),
  date: z.string().min(1, "Tanggal wajib diisi"),
  greenBeans: z.string().min(1, "Green beans wajib dipilih"),
  inputQty: z.coerce.number().min(0.1, "Qty harus lebih dari 0"),
  profile: z.string().min(1, "Profil roasting wajib dipilih"),
  yieldPercent: z.coerce.number().min(1).max(100),
  sellPrice: z.coerce.number().min(1, "Harga jual wajib diisi"),
  gasCost: z.coerce.number().min(0),
  laborCost: z.coerce.number().min(0),
  otherCost: z.coerce.number().min(0),
  hppPerKg: z.coerce.number(),
});

type RoastingFormValues = z.infer<typeof roastingSchema>;

interface RoastingFormProps {
  nextBatchId: string;
  availableBeans: WarehouseItem[];
  onFormSubmit: () => void;
}

export function RoastingForm({ nextBatchId, availableBeans, onFormSubmit }: RoastingFormProps) {
  const [state, formAction] = useActionState(createRoastingBatch, null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<RoastingFormValues>({
    resolver: zodResolver(roastingSchema),
    defaultValues: {
      batchId: nextBatchId,
      date: getTodayDateString(),
      yieldPercent: 85,
      gasCost: 50000,
      laborCost: 100000,
      otherCost: 25000,
    },
  });

  const watchedValues = watch();

  const calculations = useMemo(() => {
    const selectedBean = availableBeans.find(b => b.Nama_Green_Beans === watchedValues.greenBeans);
    if (!selectedBean) return { gbHpp: 0, output: 0, totalCost: 0, hppPerKg: 0, margin: 0 };
    
    const inputQty = watchedValues.inputQty || 0;
    const yieldPercent = watchedValues.yieldPercent || 0;
    
    const gbHpp = (selectedBean.Avg_HPP || 0) * inputQty;
    const output = inputQty * (yieldPercent / 100);
    const opCosts = (watchedValues.gasCost || 0) + (watchedValues.laborCost || 0) + (watchedValues.otherCost || 0);
    const totalCost = gbHpp + opCosts;
    const hppPerKg = output > 0 ? totalCost / output : 0;
    
    const sellPrice = watchedValues.sellPrice || 0;
    const margin = sellPrice > 0 ? ((sellPrice - hppPerKg) / sellPrice) * 100 : 0;
    
    return { gbHpp, output, totalCost, hppPerKg, margin };
  }, [watchedValues, availableBeans]);

  useEffect(() => {
    setValue('hppPerKg', calculations.hppPerKg);
  }, [calculations.hppPerKg, setValue]);

  useEffect(() => {
    if (state?.status === "success") {
      toast({ title: "Sukses!", description: state.message });
      reset();
      onFormSubmit();
    } else if (state?.status === "error") {
      toast({
        title: "Error!",
        description: state.message,
        variant: "destructive",
      });
    }
  }, [state, onFormSubmit, reset]);
  
  const onSubmit = (data: RoastingFormValues) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
        formData.append(key, (data as any)[key]);
    });
    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register('hppPerKg')} />
      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div><Label>Batch ID</Label><Input {...register("batchId")} readOnly /></div>
        <div><Label>Tanggal</Label><Input type="date" {...register("date")} /></div>
        <div>
          <Label>Green Beans</Label>
          <Controller
            name="greenBeans"
            control={control}
            render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger><SelectValue placeholder="Pilih Green Beans" /></SelectTrigger>
                    <SelectContent>
                    {availableBeans.map(bean => (
                        <SelectItem key={bean.id} value={bean.Nama_Green_Beans}>
                        {bean.Nama_Green_Beans} ({bean.Stock_Kg.toFixed(1)} kg)
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
            )}
          />
          {errors.greenBeans && <p className="text-destructive text-sm mt-1">{errors.greenBeans.message}</p>}
        </div>
        <div>
            <Label>Qty Input (kg)</Label>
            <Input type="number" step="0.1" {...register("inputQty")} />
            {errors.inputQty && <p className="text-destructive text-sm mt-1">{errors.inputQty.message}</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Roasting Profile</Label>
          <Controller
             name="profile"
             control={control}
             render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger><SelectValue placeholder="Pilih Profile" /></SelectTrigger>
                    <SelectContent>
                    <SelectItem value="Light">Light Roast</SelectItem>
                    <SelectItem value="Medium">Medium Roast</SelectItem>
                    <SelectItem value="Medium-Dark">Medium Dark Roast</SelectItem>
                    <SelectItem value="Dark">Dark Roast</SelectItem>
                    </SelectContent>
                </Select>
             )}
          />
           {errors.profile && <p className="text-destructive text-sm mt-1">{errors.profile.message}</p>}
        </div>
        <div>
          <Label>Expected Yield (%)</Label>
          <Input type="number" {...register("yieldPercent")} />
        </div>
        <div>
          <Label>Harga Jual/kg</Label>
          <Input type="number" {...register("sellPrice")} />
          {errors.sellPrice && <p className="text-destructive text-sm mt-1">{errors.sellPrice.message}</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
        <div><Label>Biaya Gas (Rp)</Label><Input type="number" {...register("gasCost")} /></div>
        <div><Label>Biaya Tenaga Kerja (Rp)</Label><Input type="number" {...register("laborCost")} /></div>
        <div><Label>Biaya Lainnya (Rp)</Label><Input type="number" {...register("otherCost")} /></div>
      </div>
      
      {/* Calculations Display */}
      <div className="bg-secondary p-4 rounded-lg">
        <h4 className="font-semibold mb-2">Kalkulasi Otomatis</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div><span className="text-muted-foreground">Green Beans HPP:</span><p className="font-semibold">{formatRupiah(calculations.gbHpp)}</p></div>
          <div><span className="text-muted-foreground">Expected Output:</span><p className="font-semibold">{calculations.output.toFixed(2)} kg</p></div>
          <div><span className="text-muted-foreground">Total Cost Batch:</span><p className="font-semibold">{formatRupiah(calculations.totalCost)}</p></div>
          <div><span className="text-muted-foreground">HPP/kg Hasil:</span><p className="font-semibold">{formatRupiah(calculations.hppPerKg)}</p></div>
          <div><span className="text-muted-foreground">Profit Margin:</span><p className="font-semibold">{calculations.margin.toFixed(1)}%</p></div>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <SubmitButton pending={isPending} pendingText="Memproses...">Proses Roasting</SubmitButton>
      </div>
    </form>
  );
}
