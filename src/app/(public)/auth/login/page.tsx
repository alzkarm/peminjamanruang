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
    <main className="relative flex min-h-[calc(100dvh-128px)] items-center justify-center overflow-hidden bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_15%,rgba(0,106,78,.08),transparent_28rem),radial-gradient(circle_at_90%_85%,rgba(245,158,11,.06),transparent_24rem)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(#006A4E_1px,transparent_1px),linear-gradient(90deg,#006A4E_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="relative z-10 grid w-full max-w-4xl overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_28px_80px_-40px_rgba(15,23,42,.45)] md:grid-cols-12">
        <section className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-yarsi-darker via-yarsi-dark to-yarsi-primary p-6 text-white sm:p-8 md:col-span-5">
          <div aria-hidden="true" className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:32px_32px]" />
          <div className="relative">
            <Link href="/" className="inline-flex items-center gap-3 rounded-lg focus-visible:outline-white">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/20 bg-white/10 shadow-sm backdrop-blur">
                <Building2 className="h-5 w-5 text-emerald-200" />
              </span>
              <span>
                <span className="block text-lg font-black leading-none tracking-tight">SIPERU YARSI</span>
                <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.13em] text-emerald-200">Peminjaman Ruang Kampus</span>
              </span>
            </Link>

            <div className="mt-7 max-w-xs sm:mt-10">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-300">Satu akun, satu alur</p>
              <h1 className="mt-3 text-2xl font-black leading-tight tracking-tight sm:text-3xl">Kelola kebutuhan ruang dengan lebih pasti.</h1>
              <p className="mt-4 text-xs leading-6 text-emerald-50/75 sm:text-sm">Periksa jadwal, ajukan peminjaman, dan pantau persetujuan dari satu tempat.</p>
            </div>

            <ul className="mt-8 hidden divide-y divide-white/10 border-y border-white/10 md:block">
              {[
                { icon: CalendarDays, label: 'Jadwal ruang terintegrasi' },
                { icon: CheckCircle2, label: 'Persetujuan LPF & Yayasan' },
                { icon: ShieldCheck, label: 'E-tiket untuk akses ruang' },
              ].map((item) => {
                const Icon = item.icon;
                return <li key={item.label} className="flex items-center gap-3 py-3 text-xs font-semibold text-emerald-50"><Icon className="h-4 w-4 shrink-0 text-emerald-300" />{item.label}</li>;
              })}
            </ul>
          </div>

          <div className="relative mt-6 flex items-start gap-2 border-t border-white/15 pt-4 text-[11px] leading-5 text-emerald-100/70 md:mt-8 md:pt-5">
            <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
            Bantuan akun tersedia melalui PTI YARSI, Gedung Rektorat.
          </div>
        </section>

        <section className="flex flex-col justify-between bg-white p-6 sm:p-8 md:col-span-7 lg:p-10" aria-labelledby="login-title">
          <div className="mx-auto w-full max-w-sm">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-yarsi-primary">Portal sivitas akademika</p>
            <h2 id="login-title" className="mt-2 text-2xl font-black tracking-tight text-slate-950">Masuk ke akun Anda</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500 sm:text-sm">Gunakan kredensial akun YARSI yang terhubung dengan layanan kampus.</p>

            {(errorMessage || error) && (
              <div role="alert" aria-live="assertive" className="mt-5 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <div><p className="text-xs font-bold">Gagal masuk</p><p className="mt-0.5 text-[11px] leading-4 text-rose-700">{errorMessage || error}</p></div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="username" className="mb-1.5 block text-xs font-bold text-slate-700">Username</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input id="username" name="username" autoComplete="username" type="text" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username akun YARSI" className="min-h-12 w-full rounded-lg border border-slate-300 bg-slate-50/70 py-2 pl-10 pr-3 text-sm font-medium text-slate-900 outline-none hover:border-slate-400 focus:border-yarsi-primary focus:bg-white focus:ring-4 focus:ring-emerald-100" />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <label htmlFor="password" className="text-xs font-bold text-slate-700">Kata sandi</label>
                  <button type="button" onClick={() => alert('Untuk bantuan lupa kata sandi akun kampus, silakan hubungi Pusat Teknologi Informasi (PTI) Universitas YARSI di Gedung Rektorat.')} className="min-h-9 text-[11px] font-bold text-yarsi-primary hover:underline">Lupa kata sandi?</button>
                </div>
                <div className="relative">
                  <Key className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input id="password" name="password" autoComplete="current-password" type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Kata sandi akun YARSI" className="min-h-12 w-full rounded-lg border border-slate-300 bg-slate-50/70 py-2 pl-10 pr-12 text-sm font-medium text-slate-900 outline-none hover:border-slate-400 focus:border-yarsi-primary focus:bg-white focus:ring-4 focus:ring-emerald-100" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} aria-pressed={showPassword}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-yarsi-primary px-4 text-sm font-extrabold text-white shadow-[0_8px_20px_-10px_rgba(0,106,78,.9)] hover:-translate-y-0.5 hover:bg-yarsi-dark hover:shadow-md disabled:translate-y-0 disabled:cursor-wait disabled:opacity-65">
                {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Memverifikasi akun…</span></> : <><Lock className="h-4 w-4" /><span>Masuk ke SIPERU</span><ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-slate-200" />Akses publik<span className="h-px flex-1 bg-slate-200" /></div>
            <button type="button" onClick={handleGuestMode} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-yarsi-dark">
              <Compass className="h-4 w-4 text-yarsi-primary" />Lihat kalender tanpa masuk
            </button>
          </div>

          <div className="mx-auto mt-8 flex w-full max-w-sm items-center justify-between gap-3 border-t border-slate-100 pt-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />Koneksi aman YARSI</span>
            <Link href="/" className="font-bold text-yarsi-primary hover:underline">Kembali ke beranda</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
