'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useAppStore } from '@/lib/store';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins} mnt lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

export function NotificationBell({ isHome = false }: { isHome?: boolean }) {
  const { currentUser, notifications, unreadNotifications, queuePending, queueAwaitingApproval, fetchNotifications, markNotificationRead } = useAppStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isGuest = !currentUser || currentUser.role === 'guest';

  useEffect(() => {
    if (isGuest) return;
    fetchNotifications().catch(() => undefined);
    const t = setInterval(() => {
      fetchNotifications().catch(() => undefined);
    }, 60000);
    return () => clearInterval(t);
  }, [fetchNotifications, isGuest, currentUser?.id]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open ]);

  if (isGuest) return null;

  const staff = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
  const notifHref = (n: { bookingId?: string | null; title: string }) =>
    staff && /menunggu|antrean|approval|verifikasi/i.test(n.title) ? '/admin/approvals' : '/dashboard';

  const handleOpen = () => {
    setOpen((v) => !v);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Notifikasi pengajuan"
        aria-expanded={open}
        className={`relative flex min-h-11 min-w-11 items-center justify-center rounded-xl border p-2.5 transition-colors ${
          isHome
            ? 'border-white/10 bg-white/[0.07] text-emerald-100 hover:bg-white/[0.12]'
            : 'border-slate-200 bg-white text-slate-600 shadow-sm hover:border-emerald-300 hover:text-yarsi-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
        }`}
      >
        <Bell className="h-5 w-5" />
        {unreadNotifications > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
            {unreadNotifications > 9 ? '9+' : unreadNotifications}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          {(currentUser?.role === 'admin' || currentUser?.role === 'superadmin') && (queuePending > 0 || queueAwaitingApproval > 0) && (
            <Link href="/admin/approvals" onClick={() => setOpen(false)} className="block bg-amber-50 px-4 py-3 hover:bg-amber-100/70 dark:bg-amber-500/10">
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                {currentUser?.role === 'superadmin'
                  ? `${queuePending} menunggu verifikasi · ${queueAwaitingApproval} menunggu approval final`
                  : `${queuePending} pengajuan menunggu verifikasi`}
              </p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400">Klik untuk memproses antrean →</p>
            </Link>
          )}
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Notifikasi Pengajuan</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Status terbaru pengajuan Anda</p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-slate-400">
                Belum ada notifikasi. Status pengajuan (verifikasi / persetujuan / revisi) akan muncul di sini.
              </p>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={notifHref(n)}
                  onClick={() => { void markNotificationRead(n.id); setOpen(false); }}
                >
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-slate-600 dark:text-slate-300">{n.message}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{timeAgo(n.createdAt)}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
