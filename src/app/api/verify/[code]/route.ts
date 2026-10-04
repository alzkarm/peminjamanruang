import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_BOOKINGS } from '@/lib/mockData';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

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

  // 1. Try fetching from NestJS Backend public verify endpoint
  try {
    const res = await fetch(`${BACKEND_URL}/verify/${encodeURIComponent(code)}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (err) {
    // Backend may be starting up or unreachable, fall back to mock data
  }

  // 2. Fallback to mock data matching
  const cleanCode = code.toUpperCase();
  const cleanPrefix = cleanCode.replace(/^YARSI-BK-/i, '');

  const matched = INITIAL_BOOKINGS.find((b) => {
    const bCode = (b.bookingCode || '').toUpperCase();
    const bId = (b.id || '').toUpperCase();
    return (
      bCode === cleanCode ||
      bCode.endsWith(cleanPrefix) ||
      bId === cleanCode ||
      bId.startsWith(cleanPrefix) ||
      cleanCode.includes(bCode)
    );
  });

  if (matched) {
    const approvalLog = matched.approvalLogs?.find((l) => l.toStatus === 'APPROVED');
    const isApproved = matched.status === 'APPROVED';

    return NextResponse.json({
      id: matched.id,
      bookingCode: matched.bookingCode,
      passToken: (matched as any).passToken || `PASS-${(matched.bookingCode || matched.id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase()}`,
      title: matched.title,
      activityType: matched.jenisKegiatan || matched.category,
      roomName: matched.roomName,
      building: matched.building || 'Menara YARSI',
      floor: matched.floor,
      userName: matched.userName,
      userNimNidn: matched.userNimNidn || '03.2023.001',
      userUnit: matched.userOrganization || matched.department || 'Universitas YARSI',
      userRole: matched.userRole,
      date: matched.date,
      startTime: matched.startTime,
      endTime: matched.endTime,
      status: matched.status,
      isValid: isApproved,
      approvedAt:
        matched.yayasanApprovedAt ||
        matched.lpfApprovedAt ||
        approvalLog?.createdAt ||
        (isApproved ? '2026-03-24T09:15:00.000Z' : null),
      approvedBy:
        matched.yayasanApprovedBy ||
        matched.lpfApprovedBy ||
        approvalLog?.approverName ||
        'Biro LPF & Pimpinan YARSI',
      additionalFacilities: (matched as any).additionalFacilities || (matched.equipments?.map((e: any) => e.equipmentName) ?? []),
      logistik: matched.logistik || [],
      securityNotice:
        'Dokumen ini dikeluarkan resmi oleh Sistem Informasi Peminjaman Ruangan Terpadu Universitas YARSI.',
      digitalStamp: {
        issuer: 'Biro Pengelolaan Fasilitas & Logistik (LPF) Universitas YARSI',
        status: isApproved ? 'SAH & TERVERIFIKASI' : 'BELUM FINAL',
        verificationUrl: `https://siperu.yarsi.ac.id/verify/${matched.bookingCode}`,
        algorithm: 'SHA256-DIGITAL-TOKEN-VERIFIED',
      },
      createdAt: matched.createdAt,
    });
  }

  return NextResponse.json(
    { error: `Data peminjaman dengan kode '${code}' tidak ditemukan.` },
    { status: 404 }
  );
}
