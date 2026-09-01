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
  Sparkles,
  ArrowRight,
  GraduationCap,
  Briefcase,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  HelpCircle,
  Compass,
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
    <div className="min-h-[calc(100vh-140px)] bg-slate-50 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden">
        {/* Left Col: YARSI Branding & LDAP Security Information */}
        <div className="lg:col-span-5 bg-gradient-to-br from-yarsi-dark via-yarsi-primary to-emerald-950 text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:14px_14px] pointer-events-none" />
          <div className="absolute -top-16 -left-16 w-52 h-52 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-white shadow-inner">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight leading-none">SIPERU</h2>
                <p className="text-xs text-emerald-200 mt-1">Universitas YARSI</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-[11px] font-bold text-amber-300 border border-white/15">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Single Sign-On (SSO) Terpadu</span>
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
                  Protokol Keamanan Terenkripsi TLS 1.3 / LDAP Directory YARSI.
                </span>
              </div>
              <div className="flex items-start gap-2 text-emerald-200">
                <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-tight">
                  Belum memiliki akun LDAP atau lupa sandi? Hubungi Pusat Teknologi Informasi (PTI) di Lantai 1 Gedung Rektorat.
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
              <span className="text-xs font-bold uppercase tracking-wider text-yarsi-primary bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Otentikasi LDAP YARSI
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
                  <option value="mahasiswa">🎓 Mahasiswa (Ormawa / BEM / DPM / Individu)</option>
                  <option value="dosen">👨‍🏫 Dosen / Tenaga Pendidik</option>
                  <option value="tendik">💼 Tenaga Kependidikan (Tendik / Tata Usaha)</option>
                  <option value="admin_lpf">🛡️ Bagian Layanan Pengelolaan Fasilitas (LPF Univ)</option>
                  <option value="admin_yayasan">🏛️ Sekretariat & Pengurus Yayasan YARSI</option>
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
                      alert('Untuk reset kata sandi akun LDAP YARSI, silakan hubungi Helpdesk PTI YARSI di Gedung Rektorat atau email pti@yarsi.ac.id.');
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
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
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
                  <span className="inline-block animate-spin">⏳</span>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Masuk Melalui LDAP SSO YARSI</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>TLS 1.3 / LDAP Encrypted</span>
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
