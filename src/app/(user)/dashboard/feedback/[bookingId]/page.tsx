'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { formatDateIndo } from '@/lib/utils';
import {
  Star,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Camera,
  AlertTriangle,
  FileCheck2,
} from 'lucide-react';
import Link from 'next/link';

export default function FeedbackPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = params.bookingId as string;

  const { bookings, addFeedback, currentUser } = useAppStore();

  const booking = bookings.find((b) => b.id === bookingId);

  const [cleanlinessRating, setCleanlinessRating] = useState(5);
  const [facilityRating, setFacilityRating] = useState(5);
  const [staffPunctualityRating, setStaffPunctualityRating] = useState(5);
  const [notes, setNotes] = useState('');
  const [reportedIssue, setReportedIssue] = useState('');
  const [hasIssue, setHasIssue] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!booking) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Peminjaman tidak ditemukan</h2>
        <p className="text-xs text-slate-500">ID Peminjaman tidak valid atau telah dihapus.</p>
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2 bg-yarsi-primary text-white rounded-xl text-xs font-bold"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  const overallRating = Math.round(
    (cleanlinessRating + facilityRating + staffPunctualityRating) / 3
  );

  const renderStarPicker = (
    label: string,
    description: string,
    value: number,
    onChange: (val: number) => void
  ) => {
    return (
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-800">{label}</h4>
            <p className="text-[11px] text-slate-400">{description}</p>
          </div>
          <span className="text-sm font-black text-yarsi-primary bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            {value} / 5
          </span>
        </div>

        <div className="flex items-center gap-2 pt-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              className="p-1 hover:scale-110 transition-transform focus:outline-none"
            >
              <Star
                className={`w-7 h-7 ${
                  star <= value
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-slate-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      addFeedback({
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        roomId: booking.roomId,
        roomName: booking.roomName,
        userId: currentUser?.id || 'usr-anon',
        userName: currentUser?.name || 'Civitas YARSI',
        cleanlinessRating,
        facilityRating,
        staffPunctualityRating,
        overallRating,
        notes: notes || 'Fasilitas dan pelayanan sangat memuaskan.',
        reportedIssue: hasIssue ? reportedIssue : undefined,
      });

      setIsSubmitting(false);
      setSubmitted(true);

      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    }, 500);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="space-y-1">
        <Link
          href="/dashboard"
          className="text-xs font-semibold text-slate-500 hover:text-yarsi-primary"
        >
          ← Kembali ke Dashboard
        </Link>
        <h1 className="text-2xl font-black text-slate-900">
          Formulir Evaluasi & Feedback Pasca Penggunaan Ruang
        </h1>
        <p className="text-xs text-slate-500">
          Masukan Anda sangat berharga untuk peningkatan kualitas layanan fasilitas Universitas YARSI.
        </p>
      </div>

      {submitted ? (
        <div className="p-8 bg-emerald-50 border-2 border-emerald-400 rounded-3xl text-center space-y-3 shadow-lg animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-emerald-600 text-white mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-emerald-950">
            Terima Kasih Atas Penilaian Anda!
          </h2>
          <p className="text-xs text-emerald-800">
            Laporan evaluasi telah tersimpan dan status peminjaman telah diselesaikan secara penuh.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Booking Summary Box */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-mono font-bold text-yarsi-primary bg-emerald-50 px-2 py-0.5 rounded">
                {booking.bookingCode}
              </span>
              <span className="text-xs text-slate-400">{formatDateIndo(booking.date)}</span>
            </div>

            <h3 className="text-base font-bold text-slate-900">{booking.title}</h3>
            <p className="text-xs text-slate-600 font-medium">
              📍 {booking.roomName} • {booking.building} (Lt. {booking.floor})
            </p>
          </div>

          {/* Rating Criteria Cards */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 sm:p-8 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Penilaian Kualitas Fasilitas & Petugas</span>
            </h3>

            {renderStarPicker(
              '1. Kebersihan & Kerapian Ruangan',
              'Kondisi lantai, meja, kursi, dan sirkulasi udara saat ruangan dibuka',
              cleanlinessRating,
              setCleanlinessRating
            )}

            {renderStarPicker(
              '2. Kesiapan Fasilitas & Audio-Visual',
              'Kinerja proyektor/LED, mic wireless, speaker, AC, dan WiFi',
              facilityRating,
              setFacilityRating
            )}

            {renderStarPicker(
              '3. Ketepatan Waktu & Keramahan Petugas LPF',
              'Kecepatan pembukaan kunci pintu ruangan dan pendampingan teknisi',
              staffPunctualityRating,
              setStaffPunctualityRating
            )}
          </div>

          {/* Written Feedback & Issue Reporting */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 sm:p-8 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan & Saran Perbaikan
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tuliskan pengalaman Anda atau apresiasi untuk petugas..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-900"
              />
            </div>

            {/* Toggle Issue report */}
            <div className="pt-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasIssue}
                  onChange={(e) => setHasIssue(e.target.checked)}
                  className="rounded text-yarsi-primary focus:ring-yarsi-primary"
                />
                <span>Ada kerusakan fasilitas atau kendala yang perlu dilaporkan ke teknisi?</span>
              </label>
            </div>

            {hasIssue && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-2 animate-fade-in">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Laporan Kendala Ruangan</span>
                </div>
                <textarea
                  rows={2}
                  value={reportedIssue}
                  onChange={(e) => setReportedIssue(e.target.value)}
                  placeholder="Contoh: Mic wireless 2 baterai habis, remote AC di meja dosen tidak menyala..."
                  className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900"
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3">
            <Link
              href="/dashboard"
              className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Nanti Saja
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-yarsi-primary hover:bg-yarsi-dark shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>Menyimpan Evaluasi...</span>
              ) : (
                <>
                  <span>Kirim Penilaian & Selesaikan</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
