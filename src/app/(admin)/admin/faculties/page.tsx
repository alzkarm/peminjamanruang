'use client';

import React, { useState, useEffect } from 'react';
import { facultiesApi } from '@/lib/api';
import { Faculty } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import {
  GraduationCap,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  RefreshCw,
  Palette,
  Power,
  X,
  ShieldAlert,
} from 'lucide-react';

const COLOR_PRESETS = [
  { name: 'Biru Muda (FEB)', bg: '#93C5FD', border: '#60A5FA', text: '#1E3A5F' },
  { name: 'Merah (FH)', bg: '#F87171', border: '#EF4444', text: '#7F1D1D' },
  { name: 'Oranye (FTI)', bg: '#FB923C', border: '#F97316', text: '#7C2D12' },
  { name: 'Hijau (FK)', bg: '#4ADE80', border: '#22C55E', text: '#14532D' },
  { name: 'Ungu Muda (FKG)', bg: '#C4B5FD', border: '#A78BFA', text: '#3B0764' },
  { name: 'Ungu (FP)', bg: '#A855F7', border: '#9333EA', text: '#FFFFFF' },
  { name: 'Teal / Toska', bg: '#5EEAD4', border: '#14B8A6', text: '#134E4A' },
  { name: 'Amber / Emas', bg: '#FCD34D', border: '#F59E0B', text: '#78350F' },
];

export default function AdminFacultiesPage() {
  const { currentUser } = useAppStore();
  const isSuperadmin = currentUser?.role === 'superadmin';

  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [colorBg, setColorBg] = useState('#93C5FD');
  const [colorBorder, setColorBorder] = useState('#60A5FA');
  const [colorText, setColorText] = useState('#1E3A5F');

  // Notifications
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchFaculties = async () => {
    setIsLoading(true);
    try {
      const data = await facultiesApi.getAll();
      setFaculties(data);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Gagal memuat data master fakultas.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFaculties();
  }, []);

  const openCreateModal = () => {
    setEditingFaculty(null);
    setCode('');
    setName('');
    setColorBg('#93C5FD');
    setColorBorder('#60A5FA');
    setColorText('#1E3A5F');
    setIsModalOpen(true);
  };

  const openEditModal = (faculty: Faculty) => {
    setEditingFaculty(faculty);
    setCode(faculty.code);
    setName(faculty.name);
    setColorBg(faculty.colorBg || '#93C5FD');
    setColorBorder(faculty.colorBorder || '#60A5FA');
    setColorText(faculty.colorText || '#1E3A5F');
    setIsModalOpen(true);
  };

  const applyColorPreset = (preset: (typeof COLOR_PRESETS)[0]) => {
    setColorBg(preset.bg);
    setColorBorder(preset.border);
    setColorText(preset.text);
  };

  const handleToggleActive = async (faculty: Faculty) => {
    const nextStatus = !faculty.isActive;
    try {
      const updated = await facultiesApi.update(faculty.id, { isActive: nextStatus });
      setFaculties((prev) =>
        prev.map((f) => (f.id === faculty.id ? { ...f, isActive: nextStatus } : f))
      );
      setNotification({
        type: 'success',
        message: `Fakultas ${faculty.code} berhasil diubah statusnya menjadi: ${nextStatus ? 'Aktif' : 'Nonaktif'}.`,
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Gagal memperbarui status fakultas.',
      });
    }
  };

  const handleDelete = async (faculty: Faculty) => {
    if (!confirm(`Hapus master fakultas "${faculty.name}" (${faculty.code})? Alokasi kursi denah CBT terkait mungkin terpengaruh.`)) {
      return;
    }
    try {
      await facultiesApi.delete(faculty.id);
      setFaculties((prev) => prev.filter((f) => f.id !== faculty.id));
      setNotification({
        type: 'success',
        message: `Fakultas ${faculty.code} berhasil dihapus.`,
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Gagal menghapus fakultas.',
      });
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setNotification({ type: 'error', message: 'Kode dan nama fakultas wajib diisi.' });
      return;
    }

    setIsSubmitting(true);
    setNotification(null);

    const payload = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      colorBg,
      colorBorder,
      colorText,
      isActive: editingFaculty ? editingFaculty.isActive : true,
    };

    try {
      if (editingFaculty) {
        const updated = await facultiesApi.update(editingFaculty.id, payload);
        setFaculties((prev) => prev.map((f) => (f.id === editingFaculty.id ? updated : f)));
        setNotification({
          type: 'success',
          message: `Master fakultas "${payload.code}" berhasil diperbarui.`,
        });
      } else {
        const created = await facultiesApi.create(payload);
        setFaculties((prev) => [...prev, created]);
        setNotification({
          type: 'success',
          message: `Master fakultas baru "${payload.code}" berhasil ditambahkan.`,
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Gagal menyimpan fakultas.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredFaculties = faculties.filter((f) => {
    const q = searchQuery.toLowerCase().trim();
    return !q || f.code.toLowerCase().includes(q) || f.name.toLowerCase().includes(q);
  });

  if (!isSuperadmin) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center space-y-4">
        <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Akses Dibatasi</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Halaman Pengelolaan Master Fakultas hanya dapat diakses oleh akun dengan role <strong>Superadmin</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[18px_4px_18px_18px] border border-slate-200/90 border-l-4 border-l-yarsi-primary bg-white p-6 shadow-sm">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-yarsi-primary">
            <GraduationCap className="w-4 h-4 text-yarsi-primary" />
            <span>Master Data Management · Superadmin</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            Master Fakultas & Warna Denah CBT
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola daftar fakultas, opsi dropdown peminjaman, serta palet warna indikator kursi pada Denah CBT Center A & B.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-yarsi-primary hover:bg-yarsi-dark shadow-md shadow-emerald-900/20 transition-all self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Fakultas Baru</span>
        </button>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl text-xs font-semibold ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
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

      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kode atau nama fakultas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        <button
          type="button"
          onClick={fetchFaculties}
          className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors self-end sm:self-center"
          title="Muat ulang data"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Faculties Cards Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-400 rounded-xl border border-slate-200 bg-white">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600" />
          Memuat data fakultas...
        </div>
      ) : filteredFaculties.length === 0 ? (
        <div className="py-16 text-center text-xs text-slate-500 rounded-xl border border-slate-200 bg-white">
          <GraduationCap className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          Tidak ada data fakultas yang sesuai.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFaculties.map((f) => (
            <div
              key={f.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="px-2.5 py-1 rounded-md text-xs font-black tracking-wider uppercase shadow-sm"
                    style={{
                      backgroundColor: f.colorBg || '#E2E8F0',
                      border: `1.5px solid ${f.colorBorder || '#94A3B8'}`,
                      color: f.colorText || '#0F172A',
                    }}
                  >
                    {f.code}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleToggleActive(f)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      f.isActive
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Power className="h-3 w-3" />
                    <span>{f.isActive ? 'Aktif' : 'Nonaktif'}</span>
                  </button>
                </div>

                <h3 className="font-bold text-slate-900 text-sm mt-3 leading-snug">
                  {f.name}
                </h3>
              </div>

              {/* Color swatches preview */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full shadow-inner"
                    style={{ backgroundColor: f.colorBg }}
                    title={`Background: ${f.colorBg}`}
                  />
                  <div
                    className="w-4 h-4 rounded-full shadow-inner"
                    style={{ backgroundColor: f.colorBorder }}
                    title={`Border: ${f.colorBorder}`}
                  />
                  <div
                    className="w-4 h-4 rounded-full shadow-inner"
                    style={{ backgroundColor: f.colorText }}
                    title={`Text: ${f.colorText}`}
                  />
                  <span className="text-[10px] font-mono text-slate-400">Palette CBT</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(f)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                    title="Edit Fakultas"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(f)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Hapus Fakultas"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah / Edit Fakultas */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <Palette className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 leading-tight">
                    {editingFaculty ? `Edit Fakultas: ${editingFaculty.code}` : 'Tambah Master Fakultas'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Atur nama fakultas dan skema warna kartu denah CBT
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

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kode Singkat <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FTI"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Fakultas Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fakultas Teknologi Informasi"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              {/* Color Preset Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pilih Preset Warna:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => applyColorPreset(p)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold border flex items-center gap-1.5 hover:scale-105 transition-transform"
                      style={{
                        backgroundColor: p.bg,
                        borderColor: p.border,
                        color: p.text,
                      }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.border }} />
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Color Pickers */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Warna Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={colorBg}
                      onChange={(e) => setColorBg(e.target.value)}
                      className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={colorBg}
                      onChange={(e) => setColorBg(e.target.value)}
                      className="w-full px-2 py-1 text-[10px] font-mono rounded border border-slate-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Warna Border</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={colorBorder}
                      onChange={(e) => setColorBorder(e.target.value)}
                      className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={colorBorder}
                      onChange={(e) => setColorBorder(e.target.value)}
                      className="w-full px-2 py-1 text-[10px] font-mono rounded border border-slate-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Warna Teks</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={colorText}
                      onChange={(e) => setColorText(e.target.value)}
                      className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={colorText}
                      onChange={(e) => setColorText(e.target.value)}
                      className="w-full px-2 py-1 text-[10px] font-mono rounded border border-slate-300"
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Preview Kursi Denah CBT:
                </label>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center gap-3">
                  <div
                    className="w-10 h-10 flex flex-col items-center justify-center rounded-md text-[9px] font-bold shadow-sm"
                    style={{
                      backgroundColor: colorBg,
                      border: `2px solid ${colorBorder}`,
                      color: colorText,
                    }}
                  >
                    <span className="text-[7px]">▣</span>
                    <span>197</span>
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-slate-800">{name || 'Nama Fakultas'}</span>
                    <span className="block text-[10px] text-slate-500 font-mono">Kode: {code || 'CODE'}</span>
                  </div>
                </div>
              </div>

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
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-yarsi-primary hover:bg-yarsi-dark shadow-sm transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{editingFaculty ? 'Perbarui Fakultas' : 'Simpan Fakultas'}</span>
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
