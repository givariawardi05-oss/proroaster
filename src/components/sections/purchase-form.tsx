"use client";

import React, { useEffect, useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useActionState } from "react";
import { createPurchase } from "@/lib/actions";
import { toast } from "@/hooks/use-toast";
import { formatRupiah, getTodayDateString } from "@/lib/utils";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash2, PlusCircle } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";

const purchaseItemSchema = z.object({
  name: z.string().min(1, "Nama item tidak boleh kosong"),
  qty: z.coerce.number().min(0.01, "Qty harus lebih dari 0"),
  price: z.coerce.number().min(1, "Harga harus lebih dari 0"),
});

const purchaseSchema = z.object({
  supplier: z.string().min(1, "Supplier tidak boleh kosong"),
  date: z.string().min(1, "Tanggal tidak boleh kosong"),
  invoiceNumber: z.string(),
  items: z.array(purchaseItemSchema).min(1, "Harus ada minimal 1 item"),
  total: z.coerce.number(),
});

type PurchaseFormValues = z.infer<typeof purchaseSchema>;

interface PurchaseFormProps {
  nextInvoiceNumber: string;
  onFormSubmit: () => void;
}

export function PurchaseForm({ nextInvoiceNumber, onFormSubmit }: PurchaseFormProps) {
  const [state, formAction, isPending] = useActionState(createPurchase, null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      invoiceNumber: nextInvoiceNumber,
      date: getTodayDateString(),
      items: [{ name: "", qty: 0, price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items");
  const total = watchedItems.reduce((acc, item) => acc + (item.qty || 0) * (item.price || 0), 0);
  
  useEffect(() => {
    setValue('total', total);
  }, [total, setValue]);

  useEffect(() => {
    if (state?.status === "success") {
      toast({ title: "Sukses!", description: state.message });
      reset({
        invoiceNumber: `FP-${Date.now()}`,
        date: getTodayDateString(),
        supplier: '',
        items: [{ name: "", qty: 0, price: 0 }],
      });
      onFormSubmit();
    } else if (state?.status === "error") {
      toast({
        title: "Error!",
        description: state.message,
        variant: "destructive",
      });
    }
  }, [state, onFormSubmit, reset]);
  
  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="supplier">Supplier</Label>
          <Input id="supplier" {...register("supplier")} />
          {errors.supplier && <p className="text-destructive text-sm mt-1">{errors.supplier.message}</p>}
        </div>
        <div>
          <Label htmlFor="date">Tanggal</Label>
          <Input type="date" id="date" {...register("date")} />
          {errors.date && <p className="text-destructive text-sm mt-1">{errors.date.message}</p>}
        </div>
        <div>
          <Label htmlFor="invoiceNumber">No. Faktur</Label>
          <Input id="invoiceNumber" {...register("invoiceNumber")} readOnly />
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
        <h4 className="font-semibold">Item Pembelian</h4>
        <input type="hidden" {...register('total')} />
        <input type="hidden" name="items" value={JSON.stringify(watchedItems)} />

        {fields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
            <div className="col-span-4">
              <Label htmlFor={`items.${index}.name`} className="sr-only">Nama Green Beans</Label>
              <Input placeholder="Nama Green Beans" {...register(`items.${index}.name`)} />
              {errors.items?.[index]?.name && <p className="text-destructive text-sm mt-1">{errors.items[index].name.message}</p>}
            </div>
            <div className="col-span-2">
              <Label htmlFor={`items.${index}.qty`} className="sr-only">Qty (kg)</Label>
              <Input type="number" step="0.1" placeholder="Qty (kg)" {...register(`items.${index}.qty`)} />
               {errors.items?.[index]?.qty && <p className="text-destructive text-sm mt-1">{errors.items[index].qty.message}</p>}
            </div>
            <div className="col-span-2">
              <Label htmlFor={`items.${index}.price`} className="sr-only">Harga/kg</Label>
              <Input type="number" placeholder="Harga/kg" {...register(`items.${index}.price`)} />
              {errors.items?.[index]?.price && <p className="text-destructive text-sm mt-1">{errors.items[index].price.message}</p>}
            </div>
            <div className="col-span-3">
                <Label className="sr-only">Total</Label>
                <Input value={formatRupiah((watchedItems[index]?.qty || 0) * (watchedItems[index]?.price || 0))} readOnly className="font-mono bg-background"/>
            </div>
            <div className="col-span-1">
              <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
         {errors.items?.root && <p className="text-destructive text-sm mt-1">{errors.items.root.message}</p>}

        <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", qty: 0, price: 0 })}>
          <PlusCircle className="mr-2 h-4 w-4" /> Tambah Item
        </Button>
      </div>

      <div className="flex justify-end">
        <div className="w-full max-w-sm space-y-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatRupiah(total)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total:</span>
            <span>{formatRupiah(total)}</span>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
         <SubmitButton pending={isPending} pendingText="Menyimpan...">Simpan & Masuk Warehouse</SubmitButton>
      </div>
    </form>
  );
}