'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usersApi, WhitelistUser, InviteUserPayload } from '@/lib/api';
import {
  Users,
  UserPlus,
  Search,
  ShieldCheck,
  Building2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  KeyRound,
  Mail,
  GraduationCap,
  Sparkles,
  RefreshCw,
  X,
  Lock,
} from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<WhitelistUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<WhitelistUser | null>(null);

  // Form state (simplified LDAP invite)
  const [identifier, setIdentifier] = useState('');
  const [role, setRole] = useState('mahasiswa');

  // Feedback notifications
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await usersApi.getAll();
      setUsers(data);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Gagal memuat daftar pengguna.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.username.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        u.unitName.toLowerCase().includes(q);

      const matchesRole =
        roleFilter === 'ALL' ||
        u.role.toLowerCase() === roleFilter.toLowerCase() ||
        u.rawRole.toLowerCase() === roleFilter.toLowerCase();

      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setNotification({
        type: 'error',
        message: 'Identifier Pengguna (Username LDAP / NPM / Email Kampus) wajib diisi.',
      });
      return;
    }

    setIsSubmitting(true);
    setNotification(null);

    const payload: InviteUserPayload = {
      identifier: identifier.trim(),
      role,
    };

    try {
      const res = await usersApi.invite(payload);
      setNotification({
        type: 'success',
        message: res.message || `Pengguna "${payload.identifier}" berhasil ditambahkan ke whitelist.`,
      });
      setIsModalOpen(false);
      // Reset form
      setIdentifier('');
      setRole('mahasiswa');
      await fetchUsers();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Gagal meng-invite pengguna ke whitelist.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      await usersApi.remove(userToDelete.id);
      setNotification({
        type: 'success',
        message: `Pengguna "${userToDelete.fullName} (${userToDelete.username})" berhasil dihapus dari whitelist.`,
      });
      setUserToDelete(null);
      await fetchUsers();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Gagal menghapus pengguna dari whitelist.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getRoleBadge = (roleStr: string) => {
    switch (roleStr) {
      case 'superadmin':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 dark:bg-purple-500/20 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-500/40">
            Superadmin
          </span>
        );
      case 'admin_umum':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-900 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-500/40">
            Admin Umum
          </span>
        );
      case 'admin_yayasan':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 dark:bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-500/40">
            Yayasan
          </span>
        );
      case 'admin_lpf':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-100 border border-emerald-300 dark:border-emerald-500/40">
            Admin LPF
          </span>
        );
      case 'dosen':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-500/40">
            Dosen
          </span>
        );
      case 'tendik':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
            Tendik
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-teal-100 dark:bg-teal-500/20 text-teal-900 dark:text-teal-200 border border-teal-300 dark:border-teal-500/40">
            Mahasiswa
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[18px_4px_18px_18px] border border-slate-200/90 dark:border-slate-700 border-l-4 border-l-yarsi-primary bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-yarsi-primary dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
              <ShieldCheck className="h-3.5 w-3.5" />
              Sistem Akses Whitelist / Invitation Only
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Manajemen Pengguna & Whitelist
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Kelola civitas akademika yang diizinkan masuk ke sistem SIPERU YARSI via SSO LDAP atau akun lokal.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-yarsi-primary dark:bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-emerald-900/20 hover:bg-yarsi-dark dark:hover:bg-emerald-500 transition-all shrink-0 active:scale-95"
        >
          <UserPlus className="h-4 w-4" />
          <span>+ Undang Pengguna Baru</span>
        </button>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl text-xs font-semibold border animate-fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-100'
              : 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Whitelist</p>
          <p className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">{users.length}</p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">Pengguna terdaftar</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Superadmin / Yayasan</p>
          <p className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
            {users.filter((u) => u.role === 'admin_yayasan').length}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Akses tertinggi</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Admin Fasilitas</p>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
            {users.filter((u) => u.role === 'admin_lpf').length}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">LPF Kampus</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dosen & Mahasiswa</p>
          <p className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-1">
            {users.filter((u) => u.role === 'dosen' || u.role === 'mahasiswa' || u.role === 'tendik').length}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Civitas Akademika</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan username, nama, email, atau unit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 min-h-11 sm:min-h-0 rounded-lg border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="flex-1 min-w-[130px] sm:flex-none min-h-11 sm:min-h-0 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white dark:bg-slate-900"
          >
            <option value="ALL">Semua Peran</option>
            <option value="superadmin">Superadmin</option>
            <option value="admin_umum">Admin Umum</option>
            <option value="admin_lpf">Admin LPF</option>
            <option value="admin_yayasan">Yayasan</option>
            <option value="dosen">Dosen</option>
            <option value="tendik">Tendik</option>
            <option value="mahasiswa">Mahasiswa</option>
          </select>

          <button
            type="button"
            onClick={fetchUsers}
            className="ml-auto sm:ml-0 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
            title="Muat ulang data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600 dark:text-emerald-400" />
            Memuat daftar whitelist pengguna...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 dark:text-slate-400">
            <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            Tidak ada pengguna yang cocok dengan kriteria pencarian.
          </div>
        ) : (
          <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">Pengguna</th>
                  <th className="px-4 py-3">Identifier / Username</th>
                  <th className="px-4 py-3">Email Kampus</th>
                  <th className="px-4 py-3">Fakultas / Unit</th>
                  <th className="px-4 py-3">Peran / Role</th>
                  <th className="px-4 py-3">Autentikasi</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-bold flex items-center justify-center text-xs">
                          {u.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{u.fullName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">ID: {u.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {u.username}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {u.email || '-'}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                      {u.unitName}
                    </td>
                    <td className="px-4 py-3">
                      {getRoleBadge(u.role)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
                          SSO LDAP
                        </span>
                        {u.hasLocalPassword && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                            <KeyRound className="h-3 w-3 text-slate-400" />
                            Local Fallback
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setUserToDelete(u)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                        title="Hapus dari whitelist"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filteredUsers.map((u) => (
              <div key={u.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-bold flex items-center justify-center text-xs shrink-0">
                      {u.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-slate-200 leading-snug truncate">{u.fullName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">ID: {u.id.slice(0, 8)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUserToDelete(u)}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                    title="Hapus dari whitelist"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Username</p>
                    <p className="font-mono font-bold text-slate-700 dark:text-slate-300 truncate">{u.username}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fakultas / Unit</p>
                    <p className="font-medium text-slate-700 dark:text-slate-300 truncate">{u.unitName}</p>
                  </div>
                  <div className="min-w-0 col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Kampus</p>
                    <p className="text-slate-500 dark:text-slate-400 truncate">{u.email || '-'}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Peran / Role</p>
                    {getRoleBadge(u.role)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Autentikasi</p>
                    <div className="flex flex-col gap-0.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
                        SSO LDAP
                      </span>
                      {u.hasLocalPassword && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                          <KeyRound className="h-3 w-3 text-slate-400" />
                          Local Fallback
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      {/* Modal Invite / Tambah User (Simplified LDAP-based) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-yarsi-primary dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/30">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    Undang Pengguna Baru ke Whitelist
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Otorisasi akses akun civitas akademika berbasis SSO LDAP YARSI
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              {/* Input Identifier (Username LDAP / NPM / Email Kampus) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Identifier Pengguna (Username LDAP / NPM / Email Kampus) <span className="text-rose-500 dark:text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. yoga.pandu, 1402021001, atau yoga@yarsi.ac.id"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-11 sm:min-h-0 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
                />
                <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Mendukung 3 format: <strong>Username LDAP</strong> (<code>yoga.pandu</code>), <strong>NPM / NIK</strong> (<code>1402021001</code>), atau <strong>Email Kampus</strong> (<code>user@yarsi.ac.id</code>).
                </p>
              </div>

              {/* Dropdown Role / Hak Akses */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Role / Hak Akses <span className="text-rose-500 dark:text-rose-400">*</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
                >
                  <option value="mahasiswa">Mahasiswa (Peminjam Reguler)</option>
                  <option value="dosen">Dosen (Peminjam &amp; Pengampu)</option>
                  <option value="tendik">Tenaga Kependidikan (Tendik)</option>
                  <option value="admin_umum">Admin Umum (Verifikator Ruangan Reguler)</option>
                  <option value="admin_lpf">Admin LPF (Verifikator Ruangan Yayasan)</option>
                  <option value="admin_yayasan">Pengurus Yayasan (Approval Yayasan)</option>
                  <option value="superadmin">Superadmin (Full Control &amp; Approval Akhir)</option>
                </select>
              </div>

              {/* Info Sinkronisasi Otomatis Data LDAP */}
              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-500/10 rounded-xl border border-emerald-200/80 dark:border-emerald-500/30 text-xs text-emerald-950 dark:text-emerald-100 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-yarsi-primary dark:text-emerald-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Sinkronisasi Otomatis SSO LDAP</span>
                </div>
                <p className="text-[11px] text-emerald-800/90 dark:text-emerald-200 leading-relaxed">
                  Field <strong>Nama Lengkap</strong> dan <strong>Fakultas / Unit Kerja</strong> ditarik otomatis dari direktori SSO/LDAP YARSI saat pengguna melakukan login pertama kali.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-yarsi-primary dark:bg-emerald-600 hover:bg-yarsi-dark dark:hover:bg-emerald-500 shadow-sm shadow-emerald-900/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Simpan ke Whitelist</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            {/* Header with Danger Accent */}
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight">
                    Hapus Pengguna dari Whitelist
                  </h3>
                  <button
                    type="button"
                    onClick={() => setUserToDelete(null)}
                    disabled={isDeleting}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
                  Tindakan ini memerlukan konfirmasi otorisasi
                </p>
              </div>
            </div>

            {/* Confirmation Message */}
            <div className="p-3.5 bg-rose-50/70 dark:bg-rose-500/10 rounded-xl border border-rose-200/80 dark:border-rose-500/30 text-xs text-slate-800 dark:text-slate-200 space-y-2">
              <p className="leading-relaxed">
                Apakah Anda yakin ingin menghapus{' '}
                <strong className="text-slate-900 dark:text-slate-100 font-bold">{userToDelete.fullName}</strong> (
                <code className="px-1 py-0.5 rounded bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 font-mono text-[11px]">
                  {userToDelete.username}
                </code>
                ) dari whitelist? Pengguna ini tidak akan bisa login kembali.
              </p>
            </div>

            {/* User Meta Summary */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">Identifier / Akun:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{userToDelete.username}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">Peran / Role:</span>
                <div>{getRoleBadge(userToDelete.role)}</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">Fakultas / Unit:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[200px] text-right">
                  {userToDelete.unitName}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-900/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Hapus Pengguna</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
