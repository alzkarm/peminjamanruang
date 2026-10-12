'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function YayasanApprovalsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/approvals');
  }, [router]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center dark:bg-slate-900 dark:border-slate-700">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Halaman persetujuan yayasan telah digabung ke antrean persetujuan utama — mengalihkan…
      </p>
    </div>
  );
}
