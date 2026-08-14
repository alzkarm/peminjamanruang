'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { DEMO_USERS } from '@/lib/mockData';
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
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { loginAsRole, setCurrentUser } = useAppStore();

  const [username, setUsername] = useState('1402022001');
  const [password, setPassword] = useState('••••••••••••');
  const [selectedRole, setSelectedRole] = useState<Role>('mahasiswa');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleQuickLogin = (role: Role) => {
    setIsLoading(true);
    setTimeout(() => {
      loginAsRole(role);
      setIsLoading(false);
      if (role === 'admin_lpf' || role === 'admin_yayasan') {
        router.push('/admin/approvals');
      } else {
        router.push('/dashboard');
      }
    }, 400);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      // Find matching user from DEMO_USERS or fallback
      const found = DEMO_USERS.find(
        (u) => u.identifier === username || u.role === selectedRole
      ) || DEMO_USERS[0];

      setCurrentUser(found);
      setIsLoading(false);

      if (found.role === 'admin_lpf' || found.role === 'admin_yayasan') {
        router.push('/admin/approvals');
      } else {
        router.push('/dashboard');
      }
    }, 500);
  };

  return (
    <div className="min-h-[calc(100vh-140px)] bg-slate-50 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden">
        {/* Left Col: YARSI Branding & Quick Role Demo */}
        <div className="lg:col-span-5 bg-gradient-to-br from-yarsi-dark via-yarsi-primary to-emerald-950 text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-white shadow-inner">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight leading-none">SIPERU</h2>
                <p className="text-xs text-emerald-200 mt-0.5">Universitas YARSI</p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold leading-snug">
                Portal Single Sign-On (SSO LDAP)
              </h3>
              <p className="text-xs text-emerald-100/80 leading-relaxed">
                Gunakan akun YARSI Anda untuk mengakses seluruh layanan peminjaman ruangan kampus, cek ketersediaan, dan unduh tiket QR.
              </p>
            </div>
          </div>

          {/* Quick 1-Click Role Switcher */}
          <div className="relative z-10 pt-6 border-t border-white/10 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simulasi 1-Klik Akun Demo</span>
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('mahasiswa')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-left text-xs transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-teal-500/30 text-teal-200">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold">Ahmad Fikri (Mahasiswa)</p>
                    <p className="text-[10px] text-emerald-200">BEM FTI • NIM 1402022001</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-300" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('dosen')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-left text-xs transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-blue-500/30 text-blue-200">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold">Dr. Siti Nurhaliza (Dosen)</p>
                    <p className="text-[10px] text-emerald-200">Fakultas Kedokteran • NIDN 0314058201</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-300" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin_lpf')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-left text-xs transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/30 text-emerald-200">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold">Bambang Sudibyo (Admin LPF)</p>
                    <p className="text-[10px] text-emerald-200">Biro Fasilitas Universitas</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-300" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin_yayasan')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-left text-xs transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-500/30 text-amber-200">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold">Drs. H. M. Shadiq (Yayasan)</p>
                    <p className="text-[10px] text-emerald-200">Sekretariat Yayasan YARSI</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-300" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: Standard LDAP Form */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-yarsi-primary bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                LDAP SSO Authentication
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">
                Masuk ke Akun Anda
              </h2>
              <p className="text-xs text-slate-500">
                Masukkan identitas civitas akademika Universitas YARSI.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role selector dropdown */}
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
                  <option value="dosen">👨‍🏫 Dosen / Pengajar</option>
                  <option value="tendik">💼 Tenaga Kependidikan (Tendik / Tata Usaha)</option>
                  <option value="admin_lpf">🛡️ Bagian Layanan Pengelolaan Fasilitas (LPF Univ)</option>
                  <option value="admin_yayasan">🏛️ Sekretariat & Pengurus Yayasan YARSI</option>
                </select>
              </div>

              {/* Username Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  NIM / NIDN / NIK / Username LDAP
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Contoh: 1402022001"
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-800"
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
                      alert('Untuk reset password akun LDAP, hubungi Pusat Teknologi Informasi (PTI) YARSI di Gedung Rektorat.');
                    }}
                    className="text-[11px] text-yarsi-primary font-bold hover:underline"
                  >
                    Lupa Sandi?
                  </a>
                </div>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-800"
                  />
                </div>
              </div>

              {/* Remember me & submit */}
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
