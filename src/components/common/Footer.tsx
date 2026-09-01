import React from 'react';
import Link from 'next/link';
import { Building2, Phone, Mail, MapPin, ShieldCheck, ExternalLink } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand & Info */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yarsi-primary flex items-center justify-center text-white font-bold text-lg shadow-md">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-white font-black text-lg tracking-tight">SIPERU</span>
                <span className="text-emerald-400 font-bold text-xs ml-1.5 px-1.5 py-0.5 bg-emerald-950/80 border border-emerald-800 rounded">
                  YARSI
                </span>
                <p className="text-xs text-slate-400">Sistem Peminjaman Terpadu</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Platform reservasi dan manajemen pemanfaatan ruangan digital terintegrasi untuk seluruh civitas akademika Universitas YARSI.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Multi-Level Approval Verified</span>
            </div>
          </div>

          {/* Col 2: Fast Access */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
              Navigasi Cepat
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-emerald-400 transition-colors">
                  Jadwal Ruangan Hari Ini
                </Link>
              </li>
              <li>
                <Link href="/schedule" className="hover:text-emerald-400 transition-colors">
                  Kalender Interaktif (Timeline View)
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-emerald-400 transition-colors">
                  Status & Riwayat Peminjaman
                </Link>
              </li>
              <li>
                <Link href="/dashboard/booking/new" className="hover:text-emerald-400 transition-colors">
                  Formulir Pengajuan Ruangan Baru
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="hover:text-emerald-400 transition-colors">
                  Masuk Akun YARSI
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Buildings & Facilities */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
              Gedung & Lokasi
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Menara YARSI:</strong> Auditorium Ar-Rahman (Lt.12), Ruang Senat (Lt.8), Collab Hub (Lt.4), Studio Podcasting (Lt.3)</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Gedung FK & FKG:</strong> Auditorium Ar-Razi (Lt.2), Aula Mini FKG (Lt.4)</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Gedung C (FTI/FEB/FH):</strong> Smart Classrooms 301-305, Lab AI & Data Science (Lt.5)</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact LPF */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
              Layanan & Bantuan LPF
            </h4>
            <div className="space-y-2.5 text-xs text-slate-400">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Biro LPF, Menara YARSI Lantai 1, Jl. Letjend Suprapto, Cempaka Putih, Jakarta Pusat 10510</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>(021) 420-6674 ext. 1205</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>lpf@yarsi.ac.id</span>
              </div>
              <div className="pt-2">
                <a
                  href="https://www.yarsi.ac.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  <span>Portal Resmi Universitas YARSI</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 Universitas YARSI & Yayasan YARSI. Hak Cipta Dilindungi.</p>
          <p className="flex items-center gap-1">
            <span>Ditenagai oleh</span>
            <span className="text-emerald-400 font-semibold">Pusat Teknologi Informasi (PTI) YARSI</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
