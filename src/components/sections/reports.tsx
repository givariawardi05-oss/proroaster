import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from 'lucide-react';

export function Reports() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Laporan</h2>
        <p className="text-muted-foreground">Analisis komprehensif untuk bisnis roastery Anda.</p>
      </div>
      <Card>
        <CardContent className="pt-6">
            <div className="text-center py-20">
                <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Laporan Sedang Dalam Pengembangan</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    Fitur laporan detail akan segera tersedia di sini.
                </p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
