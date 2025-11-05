"use client";

import React, { useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useFormState } from "react-dom";
import { createSale } from "@/lib/actions";
import { toast } from "@/hooks/use-toast";
import { formatRupiah, getTodayDateString } from "@/lib/utils";
import type { StoreInventoryItem } from "@/lib/definitions";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, PlusCircle } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";

const salesItemSchema = z.object({
  name: z.string().min(1, "Produk wajib dipilih"),
  qty: z.coerce.number().min(0.01, "Qty harus lebih dari 0"),
  price: z.coerce.number().min(1, "Harga harus lebih dari 0"),
  discount: z.coerce.number().min(0).max(100).default(0),
});

const salesSchema = z.object({
  invoiceNumber: z.string(),
  date: z.string().min(1, "Tanggal wajib diisi"),
  dueDate: z.string().min(1, "Jatuh tempo wajib diisi"),
  paymentStatus: z.string().min(1, "Status bayar wajib dipilih"),
  customerName: z.string().min(1, "Nama customer wajib diisi"),
  items: z.array(salesItemSchema).min(1, "Harus ada minimal 1 item penjualan"),
  shippingCost: z.coerce.number().min(0).default(0),
  paymentMethod: z.string().min(1),
});

type SalesFormValues = z.infer<typeof salesSchema>;

interface SalesFormProps {
  nextInvoiceNumber: string;
  availableProducts: StoreInventoryItem[];
  onFormSubmit: () => void;
}

export function SalesForm({ nextInvoiceNumber, availableProducts, onFormSubmit }: SalesFormProps) {
  const [state, formAction] = useFormState(createSale, null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SalesFormValues>({
    resolver: zodResolver(salesSchema),
    defaultValues: {
      invoiceNumber: nextInvoiceNumber,
      date: getTodayDateString(),
      dueDate: getTodayDateString(),
      paymentStatus: "Paid",
      paymentMethod: "Cash",
      shippingCost: 0,
      items: [{ name: "", qty: 0, price: 0, discount: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items");
  const shippingCost = watch("shippingCost");

  const totals = React.useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    watchedItems.forEach(item => {
        const itemSubtotal = (item.qty || 0) * (item.price || 0);
        const itemDiscount = itemSubtotal * ((item.discount || 0) / 100);
        subtotal += itemSubtotal;
        totalDiscount += itemDiscount;
    });
    const afterDiscount = subtotal - totalDiscount;
    const grandTotal = afterDiscount + (shippingCost || 0);
    return { subtotal, totalDiscount, afterDiscount, grandTotal };
  }, [watchedItems, shippingCost]);

  useEffect(() => {
    if (state?.status === "success") {
      toast({ title: "Sukses!", description: state.message });
      onFormSubmit();
    } else if (state?.status === "error") {
      toast({ title: "Error!", description: state.message, variant: "destructive" });
    }
  }, [state, onFormSubmit]);

  const handleProductChange = (index: number, productName: string) => {
    const product = availableProducts.find(p => p.Nama_Produk === productName);
    if (product) {
      setValue(`items.${index}.name`, productName, { shouldValidate: true });
      setValue(`items.${index}.price`, product.Harga_Jual_Kg);
    }
  };
  
  const processForm = (data: SalesFormValues) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
        if(key === 'items') {
            formData.append(key, JSON.stringify(value));
        } else {
            formData.append(key, String(value));
        }
    });
    formData.append('total', String(totals.grandTotal));
    formAction(formData);
  };
  

  return (
    <form onSubmit={handleSubmit(processForm)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div><Label>No. Invoice</Label><Input {...register("invoiceNumber")} readOnly /></div>
        <div><Label>Tanggal</Label><Input type="date" {...register("date")} /></div>
        <div><Label>Jatuh Tempo</Label><Input type="date" {...register("dueDate")} /></div>
        <div><Label>Status Bayar</Label>
            <Controller name="paymentStatus" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Paid">Lunas</SelectItem>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Sent">Terkirim</SelectItem>
                        <SelectItem value="Overdue">Jatuh Tempo</SelectItem>
                    </SelectContent>
                </Select>
            )} />
        </div>
      </div>
      <div><Label>Nama Customer</Label><Input {...register("customerName")} /> {errors.customerName && <p className="text-destructive text-sm mt-1">{errors.customerName.message}</p>}</div>

      <div className="border rounded-lg p-4 space-y-3">
        <h4 className="font-semibold">Item Penjualan</h4>
        {fields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
            <div className="col-span-4"><Label className="sr-only">Produk</Label>
              <Controller name={`items.${index}.name`} control={control} render={({ field }) => (
                <Select onValueChange={(value) => handleProductChange(index, value)} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Pilih Produk..." /></SelectTrigger>
                  <SelectContent>
                    {availableProducts.map(p => <SelectItem key={p.id} value={p.Nama_Produk}>{p.Nama_Produk} ({p.Stock_Kg.toFixed(2)} kg)</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
               {errors.items?.[index]?.name && <p className="text-destructive text-sm mt-1">{errors.items[index].name.message}</p>}
            </div>
            <div className="col-span-2"><Label className="sr-only">Qty</Label><Input type="number" step="0.01" placeholder="Qty" {...register(`items.${index}.qty`)} /></div>
            <div className="col-span-2"><Label className="sr-only">Harga</Label><Input type="number" placeholder="Harga" {...register(`items.${index}.price`)} /></div>
            <div className="col-span-1"><Label className="sr-only">Disc</Label><Input type="number" placeholder="Disc%" {...register(`items.${index}.discount`)} /></div>
            <div className="col-span-2"><Label className="sr-only">Total</Label><Input value={formatRupiah( (watchedItems[index]?.qty || 0) * (watchedItems[index]?.price || 0) * (1 - (watchedItems[index]?.discount || 0) / 100))} readOnly /></div>
            <div className="col-span-1"><Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button></div>
          </div>
        ))}
         {errors.items?.root && <p className="text-destructive text-sm mt-1">{errors.items.root.message}</p>}
        <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", qty: 0, price: 0, discount: 0 })}><PlusCircle className="mr-2 h-4 w-4" /> Tambah Item</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <Label>Metode Pembayaran</Label>
            <Controller name="paymentMethod" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Transfer">Transfer Bank</SelectItem>
                        <SelectItem value="Credit">Kredit</SelectItem>
                    </SelectContent>
                </Select>
            )} />
        </div>
        <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Subtotal:</span><span>{formatRupiah(totals.subtotal)}</span></div>
            <div className="flex justify-between"><span>Diskon Item:</span><span className="text-destructive">{formatRupiah(totals.totalDiscount)}</span></div>
            <div className="flex justify-between"><span>Subtotal Stlh. Diskon:</span><span>{formatRupiah(totals.afterDiscount)}</span></div>
            <div className="flex justify-between items-center"><span>Ongkir:</span><Input className="w-28 h-8 text-right" type="number" {...register("shippingCost")} /></div>
            <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total:</span><span>{formatRupiah(totals.grandTotal)}</span></div>
        </div>
      </div>
      <div className="flex justify-end pt-4">
        <SubmitButton pendingText="Menyimpan...">Simpan Invoice</SubmitButton>
      </div>
    </form>
  );
}
