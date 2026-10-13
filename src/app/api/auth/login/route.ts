import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // NOTE: pakai 127.0.0.1 — hostname 'localhost' kadang resolve ke ::1
    // (IPv6) dari proses Next.js dan fetch gagal padahal backend jalan.
    const backendUrl =
      process.env.BACKEND_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://127.0.0.1:4000/api';

    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (clientIp) {
      headers['x-forwarded-for'] = clientIp;
    }

    const backendRes = await fetch(`${backendUrl}/auth/login`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const rawData = await backendRes.json().catch(() => ({}));
    const message =
      rawData.message ||
      rawData.error?.message ||
      (typeof rawData.error === 'string' ? rawData.error : undefined);

    const data = {
      ...rawData,
      ...(message ? { message } : {}),
    };

    return NextResponse.json(data, { status: backendRes.status });
  } catch (err: any) {
    // Teruskan pesan error asli backend agar gampang debug (bukan 500 generik).
    const detail = err?.message || 'Gagal terhubung ke server backend SIPERU.';
    return NextResponse.json(
      {
        statusCode: 500,
        error: 'Sistem autentikasi sedang gangguan',
        message: `Sistem autentikasi sedang gangguan. Pastikan server backend berjalan. (Detail: ${detail})`,
      },
      { status: 500 },
    );
  }
}
