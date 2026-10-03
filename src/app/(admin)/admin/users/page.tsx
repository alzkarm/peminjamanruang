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
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
            Superadmin
          </span>
        );
      case 'admin_umum':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">
            Admin Umum
          </span>
        );
      case 'admin_yayasan':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            Yayasan
          </span>
        );
      case 'admin_lpf':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            Admin LPF
          </span>
        );
      case 'dosen':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
            Dosen
          </span>
        );
      case 'tendik':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
            Tendik
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-teal-100 text-teal-900 border border-teal-300">
            Mahasiswa
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[18px_4px_18px_18px] border border-slate-200/90 border-l-4 border-l-yarsi-primary bg-white p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-yarsi-primary border border-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Sistem Akses Whitelist / Invitation Only
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Manajemen Pengguna & Whitelist
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Kelola civitas akademika yang diizinkan masuk ke sistem SIPERU YARSI via SSO LDAP atau akun lokal.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-yarsi-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-emerald-900/20 hover:bg-yarsi-dark transition-all shrink-0 active:scale-95"
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
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Whitelist</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{users.length}</p>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Pengguna terdaftar</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Superadmin / Yayasan</p>
          <p className="text-2xl font-black text-amber-700 mt-1">
            {users.filter((u) => u.role === 'admin_yayasan').length}
          </p>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">Akses tertinggi</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Admin Fasilitas</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            {users.filter((u) => u.role === 'admin_lpf').length}
          </p>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">LPF Kampus</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dosen & Mahasiswa</p>
          <p className="text-2xl font-black text-blue-700 mt-1">
            {users.filter((u) => u.role === 'dosen' || u.role === 'mahasiswa' || u.role === 'tendik').length}
          </p>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">Civitas Akademika</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan username, nama, email, atau unit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
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
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Muat ulang data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600" />
            Memuat daftar whitelist pengguna...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            Tidak ada pengguna yang cocok dengan kriteria pencarian.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
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
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                          {u.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{u.fullName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">ID: {u.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-700">
                      {u.username}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {u.email || '-'}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {u.unitName}
                    </td>
                    <td className="px-4 py-3">
                      {getRoleBadge(u.role)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          SSO LDAP
                        </span>
                        {u.hasLocalPassword && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500">
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
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
        )}
      </div>

      {/* Modal Invite / Tambah User (Simplified LDAP-based) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-yarsi-primary border border-emerald-100">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 leading-tight">
                    Undang Pengguna Baru ke Whitelist
                  </h3>
                  <p className="text-xs text-slate-500">
                    Otorisasi akses akun civitas akademika berbasis SSO LDAP YARSI
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              {/* Input Identifier (Username LDAP / NPM / Email Kampus) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Identifier Pengguna (Username LDAP / NPM / Email Kampus) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. yoga.pandu, 1402021001, atau yoga@yarsi.ac.id"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
                />
                <p className="mt-1.5 text-[11px] text-slate-500 leading-relaxed">
                  Mendukung 3 format: <strong>Username LDAP</strong> (<code>yoga.pandu</code>), <strong>NPM / NIK</strong> (<code>1402021001</code>), atau <strong>Email Kampus</strong> (<code>user@yarsi.ac.id</code>).
                </p>
              </div>

              {/* Dropdown Role / Hak Akses */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Role / Hak Akses <span className="text-rose-500">*</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
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
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80 text-xs text-emerald-950 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-yarsi-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Sinkronisasi Otomatis SSO LDAP</span>
                </div>
                <p className="text-[11px] text-emerald-800/90 leading-relaxed">
                  Field <strong>Nama Lengkap</strong> dan <strong>Fakultas / Unit Kerja</strong> ditarik otomatis dari direktori SSO/LDAP YARSI saat pengguna melakukan login pertama kali.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-yarsi-primary hover:bg-yarsi-dark shadow-sm shadow-emerald-900/20 transition-all disabled:opacity-50"
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
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl space-y-4">
            {/* Header with Danger Accent */}
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-base leading-tight">
                    Hapus Pengguna dari Whitelist
                  </h3>
                  <button
                    type="button"
                    onClick={() => setUserToDelete(null)}
                    disabled={isDeleting}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-rose-600 font-semibold mt-0.5">
                  Tindakan ini memerlukan konfirmasi otorisasi
                </p>
              </div>
            </div>

            {/* Confirmation Message */}
            <div className="p-3.5 bg-rose-50/70 rounded-xl border border-rose-200/80 text-xs text-slate-800 space-y-2">
              <p className="leading-relaxed">
                Apakah Anda yakin ingin menghapus{' '}
                <strong className="text-slate-900 font-bold">{userToDelete.fullName}</strong> (
                <code className="px-1 py-0.5 rounded bg-white border border-rose-200 text-rose-700 font-mono text-[11px]">
                  {userToDelete.username}
                </code>
                ) dari whitelist? Pengguna ini tidak akan bisa login kembali.
              </p>
            </div>

            {/* User Meta Summary */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-[11px]">Identifier / Akun:</span>
                <span className="font-mono font-bold text-slate-700">{userToDelete.username}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-[11px]">Peran / Role:</span>
                <div>{getRoleBadge(userToDelete.role)}</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-[11px]">Fakultas / Unit:</span>
                <span className="font-medium text-slate-700 truncate max-w-[200px] text-right">
                  {userToDelete.unitName}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
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
