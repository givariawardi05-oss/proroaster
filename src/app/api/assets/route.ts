// File: src/app/api/assets/route.ts

import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; // <- Mengimpor koneksi DB Anda dari db.ts

// Fungsi ini akan menangani request POST (menyimpan data baru)
export async function POST(req: Request) {
  try {
    // 1. Ambil data JSON yang dikirim oleh front-end
    const body = await req.json();

    // 2. Gunakan Prisma (via objek 'db') untuk membuat data baru di tabel 'asset'
    const newAsset = await db.asset.create({
      data: {
        name: body.name,
        category: body.category,
        purchaseDate: new Date(body.purchaseDate), // Pastikan format tanggal benar
        purchaseValue: parseFloat(body.purchaseValue), // Ubah string jadi angka
        depreciationPerYear: parseFloat(body.depreciationPerYear), // Ubah string jadi angka
      },
    });

    // 3. Kirim kembali data yang baru dibuat sebagai konfirmasi
    //    dengan status 201 (Created)
    return NextResponse.json(newAsset, { status: 201 });

  } catch (error) {
    // 4. Jika terjadi error, kirim balasan error server
    console.error("Error creating asset:", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Fungsi ini akan menangani request GET (mengambil semua data aset)
export async function GET() {
  try {
    // 1. Ambil semua data dari tabel 'asset'
    const assets = await db.asset.findMany({
      orderBy: {
        createdAt: 'desc', // Urutkan dari yang terbaru
      },
    });
    
    // 2. Kirim semua data sebagai balasan
    return NextResponse.json(assets);

  } catch (error) {
    // 3. Jika terjadi error, kirim balasan error server
    console.error("Error fetching assets:", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}