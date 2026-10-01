import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

    const backendRes = await fetch(`${backendUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    return NextResponse.json(
      {
        statusCode: 500,
        error: 'Sistem autentikasi sedang gangguan',
        message: 'Sistem autentikasi sedang gangguan. Pastikan server backend berjalan.',
      },
      { status: 500 },
    );
  }
}
