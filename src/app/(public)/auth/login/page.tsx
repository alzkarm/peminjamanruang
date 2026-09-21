'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Role } from '@/lib/types';
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
} from 'lucide-react';
import Link from 'next/link';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, error, clearError } = useAppStore();

  const redirectUrl = searchParams.get('redirect') || '';
  const prefilledRoomId = searchParams.get('roomId') || '';
  const prefilledDate = searchParams.get('date') || '';
  const prefilledStartTime = searchParams.get('startTime') || '';
  const prefilledEndTime = searchParams.get('endTime') || '';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>('mahasiswa');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const getPlaceholder = (role: Role) => {
    switch (role) {
      case 'mahasiswa':
        return 'NIM Anda (Contoh: 1402022001)';
      case 'dosen':
        return 'NIDN / NIP Anda (Contoh: 0314058201)';
      case 'tendik':
        return 'NIK Pegawai (Contoh: 19880210201402)';
      case 'admin_lpf':
        return 'Username Admin LPF (Contoh: lpf.admin)';
      case 'admin_yayasan':
        return 'Username Pengurus Yayasan (Contoh: yayasan.admin)';
      default:
        return 'Username LDAP / Identitas Kampus';
    }
  };

  const getIdentifierLabel = (role: Role) => {
    switch (role) {
      case 'mahasiswa':
        return 'Nomor Induk Mahasiswa (NIM)';
      case 'dosen':
        return 'Nomor Induk Dosen Nasional (NIDN)';
      case 'tendik':
        return 'Nomor Induk Karyawan (NIK / NIP)';
      case 'admin_lpf':
        return 'Username Petugas LPF Kampus';
      case 'admin_yayasan':
        return 'Username Pengurus Yayasan YARSI';
      default:
        return 'Username LDAP SSO';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMessage('Harap masukkan Username / NIM / NIDN / NIK Anda.');
      return;
    }
    if (!password) {
      setErrorMessage('Harap masukkan Kata Sandi SSO Anda.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    clearError();

    try {
      const user = await login(username, password, selectedRole);
      setIsLoading(false);

      // Handle redirect preserving room parameters
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
      } else if (user.role === 'admin_lpf' || user.role === 'admin_yayasan') {
        router.push('/admin/approvals');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(
        err.message ||
          'Kombinasi identitas atau kata sandi SSO tidak sesuai dengan data LDAP YARSI.'
      );
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center bg-[#f5f8f6] p-4 py-12">
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
                Akses resmi peminjaman ruangan perkuliahan, laboratorium komputer, auditorium, dan ruang rapat Universitas YARSI menggunakan satu akun terpadu.
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
                  Gunakan akun kampus Anda untuk mengakses layanan peminjaman.
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
                Autentikasi akun YARSI
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">
                Masuk ke Akun Anda
              </h2>
              <p className="text-xs text-slate-500">
                Gunakan kredensial resmi civitas akademika Universitas YARSI.
              </p>
            </div>

            {(errorMessage || error) && (
              <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl text-xs text-rose-900 flex items-start gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Gagal Masuk</p>
                  <p className="text-[11px] text-rose-700">{errorMessage || error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Kategori Pengguna */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kategori Pengguna
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as Role)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-800"
                >
                  <option value="mahasiswa">Mahasiswa (Ormawa / BEM / DPM / Individu)</option>
                  <option value="dosen">Dosen / Tenaga Pendidik</option>
                  <option value="tendik">Tenaga Kependidikan (Tendik / Tata Usaha)</option>
                  <option value="admin_lpf">Bagian Layanan Pengelolaan Fasilitas (LPF)</option>
                  <option value="admin_yayasan">Sekretariat & Pengurus Yayasan YARSI</option>
                </select>
              </div>

              {/* Username Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {getIdentifierLabel(selectedRole)}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={getPlaceholder(selectedRole)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-800 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Kata Sandi SSO
                  </label>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      alert('Untuk reset kata sandi akun LDAP YARSI, silakan hubungi Helpdesk PTI YARSI atau email pti@yarsi.ac.id.');
                    }}
                    className="text-[11px] text-yarsi-primary font-bold hover:underline"
                  >
                    Lupa Sandi?
                  </a>
                </div>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi SSO"
                    className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-800 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    className="absolute right-0 top-0 flex min-h-11 min-w-11 items-center justify-center text-slate-400 hover:text-slate-700 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
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
                  ⚡ Mode Cepat / Akun Demo Lokal:
                </p>
                <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                  Klik untuk langsung masuk
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setIsLoading(true);
                    try {
                      await login('1402022001', 'password123', 'mahasiswa');
                      router.push(redirectUrl || '/dashboard');
                    } catch (e: any) {
                      setErrorMessage(e.message);
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="flex flex-col items-start p-2.5 rounded-xl border border-teal-200 bg-teal-50/60 hover:bg-teal-100/70 transition-all text-left group"
                >
                  <span className="text-[11px] font-bold text-teal-900 group-hover:text-teal-950">
                    🎓 Mahasiswa
                  </span>
                  <span className="text-[10px] text-teal-700">1402022001</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setIsLoading(true);
                    try {
                      await login('0314058201', 'password123', 'dosen');
                      router.push(redirectUrl || '/dashboard');
                    } catch (e: any) {
                      setErrorMessage(e.message);
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="flex flex-col items-start p-2.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/70 transition-all text-left group"
                >
                  <span className="text-[11px] font-bold text-blue-900 group-hover:text-blue-950">
                    👨‍🏫 Dosen
                  </span>
                  <span className="text-[10px] text-blue-700">0314058201</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setIsLoading(true);
                    try {
                      await login('19880210201402', 'password123', 'tendik');
                      router.push(redirectUrl || '/dashboard');
                    } catch (e: any) {
                      setErrorMessage(e.message);
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="flex flex-col items-start p-2.5 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100/70 transition-all text-left group"
                >
                  <span className="text-[11px] font-bold text-purple-900 group-hover:text-purple-950">
                    💼 Tendik
                  </span>
                  <span className="text-[10px] text-purple-700">19880210201402</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setIsLoading(true);
                    try {
                      await login('lpf.admin', 'password123', 'admin_lpf');
                      router.push(redirectUrl || '/admin/approvals');
                    } catch (e: any) {
                      setErrorMessage(e.message);
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="flex flex-col items-start p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 transition-all text-left group"
                >
                  <span className="text-[11px] font-bold text-emerald-900 group-hover:text-emerald-950">
                    🛡️ Admin LPF
                  </span>
                  <span className="text-[10px] text-emerald-700">lpf.admin</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setIsLoading(true);
                    try {
                      await login('yayasan.admin', 'password123', 'admin_yayasan');
                      router.push(redirectUrl || '/admin/approvals/yayasan');
                    } catch (e: any) {
                      setErrorMessage(e.message);
                    } finally {
                      setIsLoading(false);
                    }
                  }}
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
