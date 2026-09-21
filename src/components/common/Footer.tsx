import React from 'react';
import Link from 'next/link';
import { Building2, ExternalLink, Mail, MapPin } from 'lucide-react';

const footerLinks = [
  ['Beranda', '/'],
  ['Kalender ruang', '/schedule'],
  ['Peminjaman saya', '/dashboard'],
  ['Ajukan peminjaman', '/dashboard/booking/new'],
] as const;

export function Footer() {
  return (
    <footer className="border-t border-emerald-950/15 bg-[#052f26] text-emerald-50/70">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-9 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="max-w-xl">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-[11px_3px_11px_11px] bg-white text-yarsi-dark">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-base font-black tracking-tight text-white">SIPERU <span className="font-semibold text-emerald-300">YARSI</span></p>
                <p className="text-[11px]">Sistem Informasi Peminjaman Ruangan Terpadu</p>
              </div>
            </div>
            <p className="mt-5 max-w-lg text-xs leading-5 text-emerald-50/55">
              Layanan ketersediaan, peminjaman, dan pengelolaan jadwal ruang untuk civitas akademika Universitas YARSI.
            </p>
          </div>

          <nav aria-label="Navigasi footer" className="flex max-w-xl flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-emerald-50/75 lg:justify-end">
            {footerLinks.map(([label, href]) => (
              <Link key={href} href={href} className="min-h-11 content-center border-b border-transparent hover:border-emerald-300 hover:text-white">
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8 grid gap-4 border-t border-white/10 pt-6 text-[11px] sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto] lg:items-center">
          <span className="inline-flex items-start gap-2">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden="true" />
            Biro LPF, Kampus YARSI, Cempaka Putih, Jakarta Pusat
          </span>
          <a href="mailto:lpf@yarsi.ac.id" className="inline-flex min-h-11 items-center gap-2 hover:text-white">
            <Mail className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" /> lpf@yarsi.ac.id
          </a>
          <a href="https://www.yarsi.ac.id" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 font-semibold text-emerald-200 hover:text-white">
            Situs Universitas YARSI <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>

        <p className="mt-5 text-[10px] text-emerald-50/35">© 2026 Universitas YARSI dan Yayasan YARSI.</p>
      </div>
    </footer>
  );
}
