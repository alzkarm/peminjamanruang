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
  KeyRound,
  Mail,
  GraduationCap,
  Sparkles,
  RefreshCw,
  X,
  Lock,
} from 'lucide-react';

const UNIT_PRESETS = [
  'Fakultas Teknologi Informasi',
  'Fakultas Kedokteran',
  'Fakultas Hukum',
  'Fakultas Ekonomi dan Bisnis',
  'Fakultas Psikologi',
  'Fakultas Kedokteran Gigi',
  'Biro Layanan Pengelolaan Fasilitas (LPF)',
  'Biro Sekretariat & Aset Yayasan YARSI',
  'Bagian Tata Usaha Kampus',
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<WhitelistUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [identifier, setIdentifier] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('mahasiswa');
  const [unitName, setUnitName] = useState('Fakultas Teknologi Informasi');
  const [password, setPassword] = useState('password123');

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
        message: 'Identifier (Email / Username / NPM) wajib diisi.',
      });
      return;
    }

    setIsSubmitting(true);
    setNotification(null);

    const payload: InviteUserPayload = {
      identifier: identifier.trim(),
      fullName: fullName.trim() || undefined,
      role,
      unitName: unitName.trim() || undefined,
      password: password || 'password123',
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
      setFullName('');
      setPassword('password123');
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

  const handleRemoveUser = async (user: WhitelistUser) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus "${user.fullName} (${user.username})" dari whitelist? Pengguna ini tidak akan bisa login lagi.`)) {
      return;
    }

    try {
      await usersApi.remove(user.id);
      setNotification({
        type: 'success',
        message: `Pengguna ${user.username} berhasil dihapus dari whitelist.`,
      });
      await fetchUsers();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Gagal menghapus pengguna.',
      });
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
                        onClick={() => handleRemoveUser(u)}
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

      {/* Modal Invite / Tambah User */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 leading-tight">
                    Undang Pengguna Baru ke Whitelist
                  </h3>
                  <p className="text-xs text-slate-500">
                    Otorisasi akun agar dapat masuk via SSO LDAP maupun Dummy Lokal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              {/* Input Identifier (Multi-format) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Identifier Pengguna (Multi-format) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. yoga.pandu, user@yarsi.ac.id, atau 1402021001"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                  Mendukung 3 format: <strong>Username LDAP</strong> (e.g. <code>yoga.pandu</code>), <strong>Email Kampus</strong> (<code>user@yarsi.ac.id</code>), atau <strong>NPM/NIK</strong> (<code>1402021001</code>).
                </p>
              </div>

              {/* Input Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Yoga Pratama, M.Kom"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  Jika dikosongkan, nama akan otomatis dibuat dari format identifier atau diperbarui saat login LDAP.
                </p>
              </div>

              {/* Dropdown Role User */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Role / Hak Akses <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="mahasiswa">Mahasiswa</option>
                    <option value="dosen">Dosen</option>
                    <option value="tendik">Tenaga Kependidikan (Tendik)</option>
                    <option value="admin_umum">Admin Umum (Verifikator Ruangan Reguler)</option>
                    <option value="admin_lpf">Admin LPF (Verifikator Ruangan Yayasan)</option>
                    <option value="admin_yayasan">Pengurus Yayasan (Approval Yayasan)</option>
                    <option value="superadmin">Superadmin (Full Control & Approval Akhir)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Password Akun Lokal (Dummy)
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">
                    Default: <code>password123</code> (untuk pengujian lokal)
                  </p>
                </div>
              </div>

              {/* Unit / Fakultas */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fakultas / Unit Kerja
                </label>
                <input
                  type="text"
                  list="unit-presets"
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  placeholder="Pilih atau ketik unit kerja..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <datalist id="unit-presets">
                  {UNIT_PRESETS.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
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
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-yarsi-primary hover:bg-yarsi-dark shadow-sm shadow-emerald-900/20 transition-all disabled:opacity-50"
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
    </div>
  );
}
