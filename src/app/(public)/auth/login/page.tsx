'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { setAuthToken } from '@/lib/api';
import {
  Building2,
  Lock,
  User,
  Key,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  HelpCircle,
  Compass,
  LoaderCircle,
  X,
  ServerOff,
} from 'lucide-react';
import Link from 'next/link';

interface ToastState {
  show: boolean;
  type: 'error' | 'success' | 'info';
  title: string;
  message: string;
}

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setCurrentUser, clearError } = useAppStore();

  const redirectUrl = searchParams.get('redirect') || '';
  const prefilledRoomId = searchParams.get('roomId') || '';
  const prefilledDate = searchParams.get('date') || '';
  const prefilledStartTime = searchParams.get('startTime') || '';
  const prefilledEndTime = searchParams.get('endTime') || '';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);

  // Auto-dismiss toast notification after 5 seconds
  useEffect(() => {
    if (toast?.show) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      const msg = 'Username / NPM wajib diisi.';
      setErrorMessage(msg);
      setToast({
        show: true,
        type: 'error',
        title: 'Validasi Input',
        message: msg,
      });
      return;
    }
    if (!password) {
      const msg = 'Password wajib diisi.';
      setErrorMessage(msg);
      setToast({
        show: true,
        type: 'error',
        title: 'Validasi Input',
        message: msg,
      });
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    clearError();

    try {
      // 1. Sambungkan tombol submit untuk melakukan metode POST ke endpoint LDAP (/api/auth/login)
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      // 2. Tampilkan alert/toast penanganan error yang jelas jika respons dari API adalah 401
      if (response.status === 401) {
        const errorText =
          data.message ||
          (data.error && typeof data.error === 'object' ? data.error.message : data.error) ||
          'Username atau Password salah';
        setErrorMessage(errorText);
        setToast({
          show: true,
          type: 'error',
          title: 'Autentikasi Gagal (401)',
          message: errorText,
        });
        setIsLoading(false);
        return;
      }

      // 3. Tampilkan alert/toast penanganan error yang jelas jika respons dari API adalah 500 ("Sistem autentikasi sedang gangguan")
      if (response.status === 500) {
        const errorText = 'Sistem autentikasi sedang gangguan';
        setErrorMessage(errorText);
        setToast({
          show: true,
          type: 'error',
          title: 'Gangguan Server (500)',
          message: errorText,
        });
        setIsLoading(false);
        return;
      }

      // Penanganan status non-200 lainnya
      if (!response.ok) {
        const errorText = data.error || data.message || 'Terjadi kesalahan saat masuk.';
        setErrorMessage(errorText);
        setToast({
          show: true,
          type: 'error',
          title: 'Login Gagal',
          message: errorText,
        });
        setIsLoading(false);
        return;
      }

      // 4. Validasi sukses (HTTP 200)
      setToast({
        show: true,
        type: 'success',
        title: 'Login Berhasil',
        message: data.message || 'Selamat datang di SIPERU YARSI',
      });

      if (data.accessToken) {
        setAuthToken(data.accessToken);
      }
      if (data.user) {
        setCurrentUser(data.user);
      }
      useAppStore.getState().fetchBookings();

      setIsLoading(false);

      // Redirect ke halaman tujuan
      if (redirectUrl) {
        const targetParams = new URLSearchParams();
        if (prefilledRoomId) targetParams.append('roomId', prefilledRoomId);
        if (prefilledDate) targetParams.append('date', prefilledDate);
        if (prefilledStartTime) targetParams.append('startTime', prefilledStartTime);
        if (prefilledEndTime) targetParams.append('endTime', prefilledEndTime);

        const fullRedirect = targetParams.toString()
          ? `${redirectUrl}?${targetParams.toString()}`
          : redirectUrl;

        router.push(fullRedirect);
      } else if (
        data.user?.role === 'admin_lpf' ||
        data.user?.role === 'admin_yayasan' ||
        data.user?.role === 'admin_umum' ||
        data.user?.role === 'superadmin'
      ) {
        router.push(data.user?.role === 'admin_yayasan' ? '/admin/approvals/yayasan' : '/admin/approvals');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setIsLoading(false);
      const errorText = 'Sistem autentikasi sedang gangguan';
      setErrorMessage(errorText);
      setToast({
        show: true,
        type: 'error',
        title: 'Gangguan Server (500)',
        message: errorText,
      });
    }
  };

  const handleQuickDemo = async (demoUsername: string, demoPass: string) => {
    setUsername(demoUsername);
    setPassword(demoPass);
    setIsLoading(true);
    setErrorMessage('');
    clearError();

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: demoUsername, password: demoPass }),
      });
      const data = await response.json();

      if (!response.ok) {
        const errorText =
          response.status === 401
            ? 'Username atau Password salah'
            : response.status === 500
            ? 'Sistem autentikasi sedang gangguan'
            : data.message || 'Login gagal';
        setErrorMessage(errorText);
        setToast({
          show: true,
          type: 'error',
          title: `Gagal Masuk (${response.status})`,
          message: errorText,
        });
        setIsLoading(false);
        return;
      }

      if (data.accessToken) setAuthToken(data.accessToken);
      if (data.user) setCurrentUser(data.user);
      useAppStore.getState().fetchBookings();

      setToast({
        show: true,
        type: 'success',
        title: 'Login Berhasil',
        message: `Masuk sebagai ${data.user.name}`,
      });

      setIsLoading(false);

      if (redirectUrl) {
        router.push(redirectUrl);
      } else if (
        data.user?.role === 'admin_lpf' ||
        data.user?.role === 'admin_yayasan' ||
        data.user?.role === 'admin_umum' ||
        data.user?.role === 'superadmin'
      ) {
        router.push(data.user?.role === 'admin_yayasan' ? '/admin/approvals/yayasan' : '/admin/approvals');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage('Sistem autentikasi sedang gangguan');
      setToast({
        show: true,
        type: 'error',
        title: 'Gangguan Server (500)',
        message: 'Sistem autentikasi sedang gangguan',
      });
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-140px)] items-center justify-center bg-[#f5f8f6] p-4 py-12">
      {/* Toast Alert Notification */}
      {toast && (
        <div
          role="alert"
          aria-live="assertive"
          className={`fixed top-6 right-6 z-50 flex max-w-md items-start gap-3 rounded-2xl border p-4 shadow-xl backdrop-blur-md transition-all duration-300 animate-slide-in ${
            toast.type === 'error'
              ? 'border-rose-300 bg-rose-50/95 text-rose-950'
              : 'border-emerald-300 bg-emerald-50/95 text-emerald-950'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 pr-2">
            <h4 className="text-xs font-bold leading-tight">{toast.title}</h4>
            <p className="mt-0.5 text-xs font-medium leading-relaxed opacity-90">{toast.message}</p>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Tutup notifikasi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-[20px_4px_20px_20px] border border-slate-200/80 bg-white shadow-2xl lg:grid-cols-12">
        {/* Left Col: YARSI Branding & LDAP Security Information */}
        <div className="relative flex flex-col justify-between overflow-hidden bg-[#053f31] p-8 text-white sm:p-10 lg:col-span-5">
          <div className="hero-architectural-grid absolute inset-0 opacity-35" aria-hidden="true" />

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[12px_3px_12px_12px] border border-white/20 bg-white/10 text-white shadow-inner backdrop-blur">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight leading-none">SIPERU</h2>
                <p className="text-xs text-emerald-200 mt-1">Universitas YARSI</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 border-l-2 border-emerald-300 pl-3 text-[11px] font-bold uppercase tracking-wide text-emerald-200">
                <span>Single Sign-On YARSI</span>
              </div>
              <h3 className="text-2xl font-extrabold leading-snug">
                Portal Masuk Civitas Kampus
              </h3>
              <p className="text-xs text-emerald-100/90 leading-relaxed">
                Akses resmi peminjaman ruangan perkuliahan, laboratorium komputer, auditorium, dan ruang rapat Universitas YARSI menggunakan satu akun terpadu LDAP.
              </p>
            </div>

            {/* Notification if coming from intent */}
            {prefilledRoomId && (
              <div className="p-3.5 bg-white/10 backdrop-blur border border-emerald-400/30 rounded-2xl text-xs text-emerald-100 space-y-1">
                <p className="font-bold text-amber-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ruangan Telah Dipilih</span>
                </p>
                <p className="text-[11px] text-emerald-200">
                  Setelah login berhasil, Anda akan langsung diarahkan ke formulir reservasi.
                </p>
              </div>
            )}
          </div>

          {/* Security & PTI Helpdesk Notice */}
          <div className="relative z-10 pt-6 border-t border-white/10 space-y-4">
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2 text-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-tight">
                  Autentikasi terhubung langsung ke Server Direktori LDAP Kampus YARSI.
                </span>
              </div>
              <div className="flex items-start gap-2 text-emerald-200">
                <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-tight">
                  Belum memiliki akun LDAP atau lupa sandi? Hubungi Pusat Teknologi Informasi (PTI).
                </span>
              </div>
            </div>

            {/* Guest Mode Direct Access */}
            <div className="pt-2">
              <Link
                href="/"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-emerald-100 hover:text-white transition-all"
              >
                <Compass className="w-4 h-4 text-emerald-300" />
                <span>Jelajahi Fasilitas sebagai Tamu</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Col: Standard Real LDAP Form */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-yarsi-primary">
                Autentikasi Single Sign-On (SSO)
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">
                Masuk ke Akun Anda
              </h2>
              <p className="text-xs text-slate-500">
                Gunakan kredensial resmi civitas akademika Universitas YARSI.
              </p>
            </div>

            {/* Inline Alert Penanganan Error (401 & 500) */}
            {errorMessage && (
              <div
                className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 transition-all ${
                  errorMessage.includes('gangguan')
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}
              >
                {errorMessage.includes('gangguan') ? (
                  <ServerOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">
                    {errorMessage.includes('gangguan')
                      ? 'Gangguan Server Autentikasi'
                      : 'Autentikasi Gagal'}
                  </p>
                  <p className="text-[11px] mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Input Utama 1: Username / NPM */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Username / NPM <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan Username atau NPM / NIK (Contoh: 1402022001)"
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-800 placeholder:text-slate-400"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Gunakan NPM untuk Mahasiswa, NIDN/NIP untuk Dosen, atau NIK untuk Tenaga Kependidikan.
                </p>
              </div>

              {/* Input Utama 2: Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="password"
                    className="block text-xs font-bold text-slate-700"
                  >
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      alert(
                        'Untuk reset kata sandi akun LDAP YARSI, silakan hubungi Helpdesk PTI YARSI atau email pti@yarsi.ac.id.',
                      );
                    }}
                    className="text-[11px] text-yarsi-primary font-bold hover:underline"
                  >
                    Lupa Password?
                  </a>
                </div>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan Password SSO"
                    className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-800 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    className="absolute right-0 top-0 flex min-h-11 min-w-11 items-center justify-center text-slate-400 hover:text-slate-700 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Ingat sesi */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded border-slate-300 text-yarsi-primary focus:ring-yarsi-primary"
                  />
                  <span>Ingat sesi saya di perangkat ini</span>
                </label>
              </div>

              {/* Tombol Submit POST ke /api/auth/login */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-yarsi-primary hover:bg-yarsi-dark shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Masuk Melalui LDAP SSO YARSI</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Login Per Role */}
            <div className="pt-5 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  ⚡ Mode Cepat / Akun Demo:
                </p>
                <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                  Klik untuk uji coba login
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemo('1402022001', 'password123')}
                  className="flex flex-col items-start p-2.5 rounded-xl border border-teal-200 bg-teal-50/60 hover:bg-teal-100/70 transition-all text-left group"
                >
                  <span className="text-[11px] font-bold text-teal-900 group-hover:text-teal-950">
                    🎓 Mahasiswa
                  </span>
                  <span className="text-[10px] text-teal-700">1402022001</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('0314058201', 'password123')}
                  className="flex flex-col items-start p-2.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/70 transition-all text-left group"
                >
                  <span className="text-[11px] font-bold text-blue-900 group-hover:text-blue-950">
                    👨‍🏫 Dosen
                  </span>
                  <span className="text-[10px] text-blue-700">0314058201</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('19880210201402', 'password123')}
                  className="flex flex-col items-start p-2.5 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100/70 transition-all text-left group"
                >
                  <span className="text-[11px] font-bold text-purple-900 group-hover:text-purple-950">
                    💼 Tendik
                  </span>
                  <span className="text-[10px] text-purple-700">19880210201402</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('admin', 'password123')}
                  className="flex flex-col items-start p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/70 transition-all text-left group"
                >
                  <span className="text-[11px] font-bold text-indigo-900 group-hover:text-indigo-950">
                    🛠️ Admin
                  </span>
                  <span className="text-[10px] text-indigo-700">admin</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('superadmin', 'password123')}
                  className="flex flex-col items-start p-2.5 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100/70 transition-all text-left group"
                >
                  <span className="text-[11px] font-bold text-rose-900 group-hover:text-rose-950">
                    ⚡ Superadmin
                  </span>
                  <span className="text-[10px] text-rose-700">superadmin</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('lpf.admin', 'password123')}
                  className="flex flex-col items-start p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 transition-all text-left group"
                >
                  <span className="text-[11px] font-bold text-emerald-900 group-hover:text-emerald-950">
                    🛡️ Admin LPF
                  </span>
                  <span className="text-[10px] text-emerald-700">lpf.admin</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('yayasan.admin', 'password123')}
                  className="flex flex-col items-start p-2.5 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/70 transition-all text-left group col-span-2 sm:col-span-1"
                >
                  <span className="text-[11px] font-bold text-amber-900 group-hover:text-amber-950">
                    🏛️ Yayasan
                  </span>
                  <span className="text-[10px] text-amber-700">yayasan.admin</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Akses akun kampus</span>
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-140px)] flex items-center justify-center text-slate-500 text-sm">
          Memuat formulir SSO LDAP...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
