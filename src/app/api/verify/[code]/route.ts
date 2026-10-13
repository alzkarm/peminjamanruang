import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:4000/api';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> | { code: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const code = (resolvedParams.code || '').trim();

  if (!code) {
    return NextResponse.json(
      { error: 'Kode booking wajib dicantumkan.' },
      { status: 400 }
    );
  }

  // 1. Fetch from NestJS Backend public verify endpoint
  try {
    const res = await fetch(`${BACKEND_URL}/verify/${encodeURIComponent(code)}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    if (res.status === 404) {
      return NextResponse.json(
        { error: `Data peminjaman dengan kode/pass '${code}' tidak ditemukan di sistem database resmi.` },
        { status: 404 }
      );
    }

    const errData = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: errData.message || 'Gagal memverifikasi dokumen di server pusat.' },
      { status: res.status }
    );
  } catch (err: any) {
    // Backend offline / unreachable -> explicitly return 503 without mock fallback
    return NextResponse.json(
      { error: 'Layanan verifikasi pusat sedang tidak dapat dijangkau (503 Service Unavailable).' },
      { status: 503 }
    );
  }
}
