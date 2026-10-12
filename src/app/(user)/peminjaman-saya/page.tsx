'use client';

import UserDashboardPage from '@/app/(user)/dashboard/page';

/**
 * Route /peminjaman-saya
 * Menampilkan riwayat peminjaman user dengan proteksi guard role-based navigation.
 */
export default function PeminjamanSayaPage() {
  return <UserDashboardPage />;
}
