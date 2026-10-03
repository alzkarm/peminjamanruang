'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { facilitiesApi } from '@/lib/api';
import { Facility } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import {
  PackageCheck,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  RefreshCw,
  Power,
  X,
  ShieldAlert,
  Sparkles,
  Sliders,
  Tv,
  Mic,
  Video,
  Armchair,
  Table,
  Cable,
  Monitor,
  Volume2,
  Lightbulb,
  AlertTriangle,
  Info,
} from 'lucide-react';

const CATEGORY_MAP: Record<string, { label: string; badgeClass: string }> = {
  audio_visual: {
    label: 'Audio Visual & Multimedia',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-300',
  },
  furniture: {
    label: 'Furniture & Perabot',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
  },
  connectivity: {
    label: 'Kelistrikan & Jaringan',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
  },
  special: {
    label: 'Fasilitas Khusus',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
  },
  umum: {
    label: 'Umum & Operasional',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
  },
};

const ICON_PRESETS = [
  { id: 'Projector', label: 'Proyektor', icon: Tv },
  { id: 'Mic', label: 'Mikrofon', icon: Mic },
  { id: 'Video', label: 'Kamera / Video', icon: Video },
  { id: 'Armchair', label: 'Kursi', icon: Armchair },
  { id: 'Table', label: 'Meja', icon: Table },
  { id: 'Cable', label: 'Kabel / Listrik', icon: Cable },
  { id: 'Monitor', label: 'Videotron / Layar', icon: Monitor },
  { id: 'Volume2', label: 'Speaker', icon: Volume2 },
  { id: 'Lightbulb', label: 'Pencahayaan', icon: Lightbulb },
  { id: 'Package', label: 'Paket / Logistik', icon: PackageCheck },
];

function getFacilityIcon(iconName?: string) {
  switch (iconName) {
    case 'Projector':
      return Tv;
    case 'Mic':
      return Mic;
    case 'Video':
      return Video;
    case 'Armchair':
      return Armchair;
    case 'Table':
      return Table;
    case 'Cable':
      return Cable;
    case 'Monitor':
      return Monitor;
    case 'Volume2':
      return Volume2;
    case 'Lightbulb':
      return Lightbulb;
    default:
      return PackageCheck;
  }
}

export default function AdminFacilitiesPage() {
  const { currentUser } = useAppStore();
  const isSuperadmin = currentUser?.role === 'superadmin';

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [facilityToDelete, setFacilityToDelete] = useState<Facility | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('audio_visual');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Projector');
  const [isSpecial, setIsSpecial] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Notifications
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchFacilities = async () => {
    setIsLoading(true);
    try {
      const data = await facilitiesApi.getAll();
      setFacilities(data);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Gagal memuat data master fasilitas.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, []);

  const openCreateModal = () => {
    setEditingFacility(null);
    setName('');
    setCategory('audio_visual');
    setDescription('');
    setIcon('Projector');
    setIsSpecial(false);
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (fac: Facility) => {
    setEditingFacility(fac);
    setName(fac.name);
    setCategory(fac.category || 'audio_visual');
    setDescription(fac.description || '');
    setIcon(fac.icon || 'Package');
    setIsSpecial(Boolean(fac.isSpecial));
    setIsActive(fac.isActive);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (fac: Facility) => {
    try {
      const updated = await facilitiesApi.toggleStatus(fac.id);
      setFacilities((prev) =>
        prev.map((item) => (item.id === fac.id ? { ...item, isActive: updated.isActive } : item))
      );
      setNotification({
        type: 'success',
        message: `Status fasilitas "${fac.name}" diubah menjadi ${
          updated.isActive ? 'Aktif' : 'Non-Aktif'
        }.`,
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Gagal mengubah status aktif fasilitas.',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNotification({
        type: 'error',
        message: 'Nama fasilitas wajib diisi.',
      });
      return;
    }

    setIsSubmitting(true);
    setNotification(null);

    const payload = {
      name: name.trim(),
      category,
      description: description.trim() || undefined,
      icon,
      isSpecial,
      isActive,
    };

    try {
      if (editingFacility) {
        const updated = await facilitiesApi.update(editingFacility.id, payload);
        setFacilities((prev) =>
          prev.map((item) => (item.id === editingFacility.id ? updated : item))
        );
        setNotification({
          type: 'success',
          message: `Fasilitas "${updated.name}" berhasil diperbarui.`,
        });
      } else {
        const created = await facilitiesApi.create(payload);
        setFacilities((prev) => [created, ...prev]);
        setNotification({
          type: 'success',
          message: `Fasilitas "${created.name}" berhasil ditambahkan ke master data.`,
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Gagal menyimpan fasilitas.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!facilityToDelete) return;

    setIsDeleting(true);
    try {
      await facilitiesApi.delete(facilityToDelete.id);
      setFacilities((prev) => prev.filter((item) => item.id !== facilityToDelete.id));
      setNotification({
        type: 'success',
        message: `Fasilitas "${facilityToDelete.name}" berhasil dihapus dari master data.`,
      });
      setFacilityToDelete(null);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Gagal menghapus fasilitas.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter and search
  const filteredFacilities = useMemo(() => {
    return facilities.filter((f) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        f.name.toLowerCase().includes(q) ||
        (f.description && f.description.toLowerCase().includes(q)) ||
        f.category.toLowerCase().includes(q);

      const matchesCategory =
        categoryFilter === 'ALL' || f.category.toLowerCase() === categoryFilter.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [facilities, searchQuery, categoryFilter]);

  if (!isSuperadmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="p-4 bg-rose-50 text-rose-600 rounded-3xl border border-rose-200 shadow-sm">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <div className="max-w-md">
          <h2 className="text-xl font-bold text-slate-800">Akses Dibatasi</h2>
          <p className="text-xs text-slate-500 mt-1">
            Modul Master Fasilitas &amp; Logistik hanya dapat diakses oleh Superadmin SIPERU YARSI.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[18px_4px_18px_18px] border border-slate-200/90 border-l-4 border-l-yarsi-primary bg-white p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-800 border border-teal-200">
              <Sliders className="h-3.5 w-3.5 text-teal-600" />
              Master Data Operasional &amp; Sarpras
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Master Fasilitas &amp; Perlengkapan
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Kelola daftar fasilitas standar dan logistik tambahan yang dapat dipilih civitas akademika pada form peminjaman.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-yarsi-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-emerald-900/20 hover:bg-yarsi-dark transition-all shrink-0 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>+ Tambah Fasilitas Baru</span>
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
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Fasilitas</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{facilities.length}</p>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">Item terdaftar</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fasilitas Aktif</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            {facilities.filter((f) => f.isActive).length}
          </p>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Dapat dipilih user</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fasilitas Non-Aktif</p>
          <p className="text-2xl font-black text-slate-600 mt-1">
            {facilities.filter((f) => !f.isActive).length}
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Disembunyikan</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fasilitas Khusus</p>
          <p className="text-2xl font-black text-rose-700 mt-1">
            {facilities.filter((f) => f.isSpecial).length}
          </p>
          <p className="text-[10px] text-rose-600 font-medium mt-0.5">Auditorium / Izin Khusus</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama, kategori, atau deskripsi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="audio_visual">Audio Visual &amp; Multimedia</option>
            <option value="furniture">Furniture &amp; Perabot</option>
            <option value="connectivity">Kelistrikan &amp; Jaringan</option>
            <option value="special">Fasilitas Khusus</option>
            <option value="umum">Umum</option>
          </select>

          <button
            type="button"
            onClick={fetchFacilities}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Muat ulang data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Facilities Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600" />
            Memuat data master fasilitas...
          </div>
        ) : filteredFacilities.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <PackageCheck className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            Tidak ada fasilitas yang cocok dengan kriteria pencarian.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Fasilitas &amp; Perlengkapan</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Deskripsi / Spesifikasi</th>
                  <th className="px-4 py-3">Sifat Fasilitas</th>
                  <th className="px-4 py-3">Status Form</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFacilities.map((fac) => {
                  const IconComponent = getFacilityIcon(fac.icon);
                  const catConfig = CATEGORY_MAP[fac.category] || CATEGORY_MAP.umum;

                  return (
                    <tr key={fac.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${
                              fac.isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-400 border-slate-200'
                            }`}
                          >
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{fac.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              ID: {fac.id.slice(0, 8)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${catConfig.badgeClass}`}
                        >
                          {catConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs text-slate-500 leading-snug">
                        {fac.description || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {fac.isSpecial ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <Sparkles className="w-3 h-3 text-rose-500" />
                            Khusus Auditorium
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-medium">Standar</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(fac)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all active:scale-95 ${
                            fac.isActive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                          }`}
                          title={fac.isActive ? 'Klik untuk non-aktifkan' : 'Klik untuk aktifkan'}
                        >
                          <Power className={`w-3 h-3 ${fac.isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                          <span>{fac.isActive ? 'Aktif' : 'Non-Aktif'}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(fac)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-yarsi-primary hover:bg-emerald-50 transition-colors"
                            title="Edit Fasilitas"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setFacilityToDelete(fac)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Hapus Fasilitas"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah / Edit Fasilitas */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-yarsi-primary border border-emerald-100">
                  <PackageCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 leading-tight">
                    {editingFacility ? 'Edit Data Fasilitas' : 'Tambah Fasilitas Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Atur nama, kategori sarpras, dan ketersediaan di form peminjaman
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

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nama Fasilitas */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Fasilitas / Perlengkapan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Laser Projector & Motorized Screen"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all font-medium"
                />
              </div>

              {/* Kategori & Icon */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Kategori Sarpras <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
                  >
                    <option value="audio_visual">Audio Visual &amp; Multimedia</option>
                    <option value="furniture">Furniture &amp; Perabot</option>
                    <option value="connectivity">Kelistrikan &amp; Jaringan</option>
                    <option value="special">Fasilitas Khusus</option>
                    <option value="umum">Umum &amp; Operasional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Ikon Representasi
                  </label>
                  <select
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
                  >
                    {ICON_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Deskripsi / Spesifikasi Fasilitas <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Set mikrofon wireless UHF 2 unit beserta sound mixer portabel..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
                />
              </div>

              {/* Checkboxes: isSpecial & isActive */}
              <div className="space-y-2.5 pt-1">
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={isSpecial}
                    onChange={(e) => setIsSpecial(e.target.checked)}
                    className="mt-0.5 rounded text-yarsi-primary focus:ring-yarsi-primary"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Tandai sebagai Fasilitas Khusus
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Item ini memiliki persyaratan khusus (seperti Videotron LED panggung Auditorium Ar-Rahman).
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="mt-0.5 rounded text-yarsi-primary focus:ring-yarsi-primary"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Tampilkan di Formulir Peminjaman (Status Aktif)
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Jika dinonaktifkan, item tidak akan muncul sebagai opsi pilihan di formulir peminjaman publik/user.
                    </p>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
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
                      <span>{editingFacility ? 'Simpan Perubahan' : 'Tambahkan Fasilitas'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {facilityToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-base leading-tight">
                    Hapus Fasilitas Master
                  </h3>
                  <button
                    type="button"
                    onClick={() => setFacilityToDelete(null)}
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

            <div className="p-3.5 bg-rose-50/70 rounded-xl border border-rose-200/80 text-xs text-slate-800 space-y-2">
              <p className="leading-relaxed">
                Apakah Anda yakin ingin menghapus fasilitas{' '}
                <strong className="text-slate-900 font-bold">{facilityToDelete.name}</strong> dari
                master data? Item ini tidak akan muncul lagi di opsi fasilitas form peminjaman.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setFacilityToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
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
                    <span>Hapus Fasilitas</span>
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
