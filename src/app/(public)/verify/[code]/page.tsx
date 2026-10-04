'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Building2,
  User,
  MapPin,
  FileCheck2,
  Printer,
  Share2,
  ChevronLeft,
  AlertTriangle,
  ExternalLink,
  Building,
  Package,
  Armchair,
  Sparkles,
  QrCode,
  BadgeCheck,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { formatDateIndo } from '@/lib/utils';

interface VerificationData {
  id: string;
  bookingCode: string;
  passToken?: string;
  title: string;
  activityType: string;
  roomName: string;
  building: string;
  floor: number;
  userName: string;
  userNimNidn: string;
  userUnit: string;
  userRole: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  isValid: boolean;
  approvedAt?: string | null;
  approvedBy?: string | null;
  additionalFacilities?: string[];
  logistik?: Array<{
    jenisItem: string;
    jumlah: number;
    catatan?: string;
  }>;
  securityNotice: string;
  digitalStamp?: {
    issuer: string;
    status: string;
    verificationUrl: string;
    algorithm: string;
  };
  createdAt?: string;
}

import { useParams } from 'next/navigation';

export default function VerifyBookingPage({
  params,
}: {
  params?: { code?: string } | Promise<{ code?: string }>;
}) {
  const routeParams = useParams();
  const rawCodeFromRoute =
    typeof routeParams?.code === 'string'
      ? routeParams.code
      : Array.isArray(routeParams?.code)
      ? routeParams.code[0]
      : '';
  const rawCodeFromProps =
    params && 'code' in params && typeof params.code === 'string' ? params.code : '';
  const rawCode = rawCodeFromRoute || rawCodeFromProps || '';

  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!rawCode) {
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const runFetch = async () => {
      try {
        const res = await fetch(`/api/verify/${encodeURIComponent(rawCode)}`, {
          cache: 'no-store',
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Data peminjaman dengan kode '${rawCode}' tidak ditemukan.`);
        }
        const resData = await res.json();
        if (isMounted) {
          setData(resData);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Gagal memverifikasi peminjaman.');
          setLoading(false);
        }
      }
    };

    runFetch();

    return () => {
      isMounted = false;
    };
  }, [rawCode]);

  const handleShareOrCopy = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const formatDateTimeIndo = (isoStr?: string | null) => {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      return (
        d.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }) +
        ' pukul ' +
        d.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short',
        })
      );
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between print:bg-white print:p-0">
      {/* Top Banner Navigation (Hidden in Print) */}
      <header className="bg-yarsi-dark text-white border-b border-emerald-800/40 print:hidden">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-200 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Kembali ke Beranda SIPERU</span>
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Verifikasi Resmi</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {loading ? (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80 text-center space-y-4 my-8">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center animate-spin">
              <ShieldCheck className="w-7 h-7 text-emerald-600" />
            </div>
            <h2 className="text-base font-bold text-slate-800">
              Memverifikasi Keabsahan E-Ticket...
            </h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Menghubungkan ke basis data SIPERU Universitas YARSI untuk memvalidasi izin ruangan.
            </p>
          </div>
        ) : error || !data ? (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-rose-200 text-center space-y-4 my-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-black text-rose-700">Data Peminjaman Tidak Valid</h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              {error || 'Kode booking tidak terdaftar atau telah kadaluarsa.'}
            </p>
            <div className="bg-rose-50/70 p-3 rounded-xl max-w-xs mx-auto border border-rose-100 font-mono text-xs text-rose-900 font-bold">
              KODE: {rawCode}
            </div>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-yarsi-primary hover:bg-yarsi-dark text-white text-xs font-bold transition-all shadow-sm"
              >
                Halaman Utama SIPERU
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Verification Card */}
            <div className="bg-white rounded-3xl shadow-lg border border-slate-200/80 overflow-hidden print:shadow-none print:border-slate-300">
              
              {/* Card Header with YARSI Branding */}
              <div className="bg-gradient-to-r from-yarsi-dark via-yarsi-primary to-emerald-900 p-6 text-white relative">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-emerald-300 shrink-0">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold tracking-wider text-emerald-200 uppercase">
                        Universitas YARSI • Biro LPF
                      </p>
                      <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
                        Sistem Verifikasi E-Ticket Ruangan
                      </h1>
                    </div>
                  </div>

                  <div className="text-left sm:text-right space-y-1">
                    <span className="text-[10px] text-emerald-200 font-medium block uppercase tracking-wider">
                      Kode Booking Resmi
                    </span>
                    <span className="inline-block font-mono text-sm font-black bg-white/15 px-3 py-1 rounded-lg border border-white/20">
                      {data.bookingCode}
                    </span>
                    {data.passToken && (
                      <div className="pt-0.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-emerald-400/20 text-emerald-100 border border-emerald-400/30 px-2 py-0.5 rounded">
                          <BadgeCheck className="w-3 h-3 text-emerald-300" />
                          <span>PASS: {data.passToken}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                {data.isValid ? (
                  <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20 border border-emerald-400">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <span className="text-xs font-black tracking-wider uppercase block">
                        STATUS IZIN AKSES RESMI
                      </span>
                      <h2 className="text-base sm:text-lg font-black tracking-tight">
                        IZIN PEMINJAMAN RESMI / VALID
                      </h2>
                    </div>
                  </div>
                ) : data.status === 'PENDING' || data.status === 'PENDING_LPF' || data.status === 'RECOMMENDED' ? (
                  <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20 border border-amber-400">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <span className="text-xs font-black tracking-wider uppercase block">
                        STATUS PENGAJUAN
                      </span>
                      <h2 className="text-base sm:text-lg font-black tracking-tight">
                        DALAM PROSES VERIFIKASI (BELUM FINAL)
                      </h2>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-rose-600 text-white shadow-md shadow-rose-600/20 border border-rose-500">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <XCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <span className="text-xs font-black tracking-wider uppercase block">
                        STATUS DOKUMEN
                      </span>
                      <h2 className="text-base sm:text-lg font-black tracking-tight">
                        STATUS: {data.status} (TIDAK BERLAKU)
                      </h2>
                    </div>
                  </div>
                )}
              </div>

              {/* Booking Details Grid */}
              <div className="p-6 space-y-6">
                {/* Event Name */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
                    <FileCheck2 className="w-4 h-4 text-yarsi-primary" />
                    <span>Nama Kegiatan / Keperluan</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                    {data.title}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-block text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                      {data.activityType}
                    </span>
                    <span className="text-xs text-slate-500">
                      Ref ID: <span className="font-mono">{data.id.slice(0, 8)}</span>
                    </span>
                  </div>
                </div>

                {/* Grid 2 Columns for Room & Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Room Details */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <Building className="w-4 h-4 text-emerald-600" />
                      <span>Lokasi & Ruangan</span>
                    </div>
                    <p className="text-base font-bold text-slate-900">
                      {data.roomName}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{data.building || 'Menara Utama YARSI'} • Lantai {data.floor}</span>
                    </div>
                  </div>

                  {/* Schedule Details */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      <span>Jadwal Penggunaan</span>
                    </div>
                    <p className="text-base font-bold text-slate-900">
                      {formatDateIndo(data.date)}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{data.startTime} - {data.endTime} WIB</span>
                    </div>
                  </div>
                </div>

                {/* Applicant & Approval Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Applicant Details */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <User className="w-4 h-4 text-emerald-600" />
                      <span>Penanggung Jawab / Pemohon</span>
                    </div>
                    <p className="text-base font-bold text-slate-900">
                      {data.userName}
                    </p>
                    <p className="text-xs text-slate-600">
                      NPM / NIP: <span className="font-mono font-semibold">{data.userNimNidn}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Unit / Fakultas: {data.userUnit}
                    </p>
                  </div>

                  {/* Approval Record */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Otorisasi & Persetujuan</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      {data.approvedBy || 'Biro LPF Universitas YARSI'}
                    </p>
                    <div className="text-xs text-slate-600">
                      <span className="text-slate-400">Waktu ACC: </span>
                      <span className="font-semibold">{formatDateTimeIndo(data.approvedAt)}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Otorisasi Digital Terverifikasi
                    </span>
                  </div>
                </div>

                {/* Logistics and Facilities Approved */}
                {((data.logistik && data.logistik.length > 0) || (data.additionalFacilities && data.additionalFacilities.length > 0)) && (
                  <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <Package className="w-4 h-4 text-emerald-700" />
                        <span>Fasilitas & Logistik Tambahan yang Disetujui</span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        Resmi LPF
                      </span>
                    </div>

                    {data.additionalFacilities && data.additionalFacilities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {data.additionalFacilities.map((fac, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-xs bg-white text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs font-medium"
                          >
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span>{fac}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {data.logistik && data.logistik.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {data.logistik.map((item, idx) => (
                          <div
                            key={idx}
                            className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <Armchair className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="font-semibold text-slate-800 capitalize">
                                {item.jenisItem.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                              {item.jumlah} Unit
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Digital Stamp & QR Verification Box */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-24 h-24 bg-white p-1.5 rounded-xl border border-emerald-200 shadow-sm shrink-0 flex items-center justify-center">
                    <QRCodeSVG
                      value={typeof window !== 'undefined' ? window.location.href : `https://siperu.yarsi.ac.id/verify/${data.passToken || data.bookingCode}`}
                      size={84}
                      level="M"
                      includeMargin={false}
                    />
                  </div>

                  <div className="flex-1 text-center sm:text-left space-y-1">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        Cap Digital Resmi Universitas YARSI
                      </span>
                      <span className="text-[9px] font-mono text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-200">
                        SHA256: VALID
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-800">
                      Biro Pengelolaan Fasilitas & Logistik (LPF)
                    </p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Dokumen digital ini diterbitkan secara otomatis dan terotentikasi melalui basis data terpusat SIPERU. Petugas keamanan berhak mencocokkan identitas pemohon sesuai rincian di atas.
                    </p>
                  </div>
                </div>

                {/* Official Legal Protection Message */}
                <div className="p-4 rounded-2xl bg-emerald-950/5 border border-emerald-800/15 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed text-slate-700">
                    <p className="font-bold text-emerald-900 mb-0.5">
                      Pernyataan Keabsahan Dokumen Digital:
                    </p>
                    <p className="italic">
                      &ldquo;{data.securityNotice}&rdquo;
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Dokumen ini sah tanpa tanda tangan basah dan dapat diuji langsung melalui QR Code ke alamat server resmi SIPERU Universitas YARSI.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions (Hidden in Print) */}
              <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 transition-all shadow-sm"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    <span>Cetak Halaman</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareOrCopy}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 transition-all shadow-sm"
                  >
                    <Share2 className="w-4 h-4 text-slate-600" />
                    <span>{copied ? 'Tautan Disalin!' : 'Bagikan Link'}</span>
                  </button>
                </div>

                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yarsi-primary hover:bg-yarsi-dark text-white text-xs font-bold transition-all shadow-sm"
                >
                  <span>Buka SIPERU</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
