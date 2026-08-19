'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import {
  Building2,
  Lock,
  User,
  Key,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Loader2,
  Compass,
  CheckCircle2,
  HelpCircle,
  CalendarDays,
} from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { login, loginAsRole, error, clearError } = useAppStore();

  const [username, setUsername] = useState('1402022001');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    clearError();

    try {
      const user = await login(username, password);
      setIsLoading(false);

      if (user.role === 'admin_lpf' || user.role === 'admin_yayasan') {
        router.push('/admin/approvals');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Kombinasi username atau kata sandi tidak sesuai.');
    }
  };

  const handleGuestMode = () => {
    loginAsRole('guest');
    router.push('/schedule');
  };

  return (
    <div className="min-h-[calc(100vh-140px)] bg-slate-50 flex items-center justify-center p-4 py-8 relative">
      {/* Background Subtle Grid Accent */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#0D7A5F_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      {/* Compact Main Card (Ukuran Pas & Proporsional) */}
      <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-12 bg-white rounded-2xl shadow-xl shadow-slate-900/5 border border-slate-200/90 overflow-hidden relative z-10">
        
        {/* SISI KIRI: Banner Identitas YARSI Compact */}
        <div className="md:col-span-5 bg-gradient-to-br from-yarsi-darker via-yarsi-dark to-yarsi-primary text-white p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Accent Glow */}
          <div className="absolute -top-12 -left-12 w-36 h-36 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-5">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center text-white shadow-xs">
                <Building2 className="w-5 h-5 text-emerald-200" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <h2 className="text-base font-black tracking-tight leading-none text-white">SIPERU</h2>
                  <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                    YARSI
                  </span>
                </div>
                <p className="text-[10px] text-emerald-200 mt-0.5">Smart Campus Booking</p>
              </div>
            </div>

            {/* Headline Singkat */}
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold leading-snug text-white">
                Peminjaman Fasilitas Kampus
              </h3>
              <p className="text-[11px] text-emerald-100/80 leading-relaxed">
                Reservasi digital Auditorium, Smart Classroom, & Lab AI terpadu.
              </p>
            </div>

            {/* Feature Pills */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2 text-[11px] text-emerald-100 bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/10">
                <CalendarDays className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span>Jadwal Ruangan Real-Time</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-emerald-100 bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/10">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span>Izin Resmi LPF & Yayasan</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-emerald-100 bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/10">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span>E-Ticket QR Siap Pakai</span>
              </div>
            </div>
          </div>

          {/* Catatan Bantuan Bawah */}
          <div className="relative z-10 pt-4 mt-4 border-t border-white/15">
            <div className="flex items-start gap-1.5 text-[10px] text-emerald-200/90 leading-tight">
              <HelpCircle className="w-3.5 h-3.5 text-emerald-300 shrink-0 mt-0.5" />
              <span>Bantuan akun: Hubungi PTI YARSI (Gedung Rektorat).</span>
            </div>
          </div>
        </div>

        {/* SISI KANAN: Formulir Masuk Akun yang Rapi & Compact */}
        <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between bg-white">
          <div className="space-y-5">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-yarsi-primary bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 inline-block">
                Layanan Sivitas Akademika
              </span>
              <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
                Masuk ke Akun Anda
              </h2>
              <p className="text-xs text-slate-500">
                Gunakan username dan kata sandi akun YARSI Anda (seperti di SISAKAD).
              </p>
            </div>

            {/* Error Banner */}
            {(errorMessage || error) && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-[11px]">Gagal Masuk</p>
                  <p className="text-[10px] text-rose-700">{errorMessage || error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Kolom Username */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username akun YARSI Anda"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm font-medium bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-900 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Kolom Kata Sandi */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Kata Sandi
                  </label>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      alert('Untuk bantuan lupa kata sandi akun kampus, silakan hubungi Pusat Teknologi Informasi (PTI) Universitas YARSI di Gedung Rektorat.');
                    }}
                    className="text-[10px] text-yarsi-primary font-bold hover:underline"
                  >
                    Lupa Kata Sandi?
                  </a>
                </div>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi Anda"
                    className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm font-medium bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-900 transition-all placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Tombol Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-yarsi-primary hover:bg-yarsi-dark shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 mt-1"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Masuk ke Akun Saya</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                  </>
                )}
              </button>
            </form>

            {/* Pemisah Atau */}
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[11px]">
                <span className="bg-white px-2.5 text-slate-400 font-medium">atau</span>
              </div>
            </div>

            {/* Mode Tamu / Publik */}
            <button
              type="button"
              onClick={handleGuestMode}
              className="w-full py-2 px-3 rounded-xl font-semibold text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all flex items-center justify-center gap-1.5 hover:border-slate-300"
            >
              <Compass className="w-3.5 h-3.5 text-yarsi-primary" />
              <span>Lihat Jadwal Ruangan sebagai Tamu (Mode Publik)</span>
            </button>
          </div>

          {/* Footer Bar */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 mt-4">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Koneksi Aman YARSI</span>
            </span>
            <Link href="/" className="text-yarsi-primary font-bold hover:underline">
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
