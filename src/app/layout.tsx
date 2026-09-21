import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SIPERU YARSI - Sistem Informasi Peminjaman Ruangan Terpadu',
  description:
    'Sistem Informasi Peminjaman Ruangan Terpadu Universitas YARSI. Reservasi digital real-time untuk Auditorium, Smart Class, Lab Komputer, dan Ruang Rapat.',
  keywords: [
    'YARSI',
    'Peminjaman Ruang',
    'Auditorium Ar-Rahman',
    'Smart Campus',
    'Universitas YARSI',
    'SIPERU',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
