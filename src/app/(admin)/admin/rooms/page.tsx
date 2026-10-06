'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { roomsApi } from '@/lib/api';
import { Room, RoomType } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  RefreshCw,
  Power,
  Users,
  Layers,
  Sparkles,
  SlidersHorizontal,
  X,
  ShieldAlert,
} from 'lucide-react';

const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: 'classroom', label: 'Ruang Kelas Reguler' },
  { value: 'auditorium', label: 'Auditorium' },
  { value: 'lab', label: 'Laboratorium & CBT' },
  { value: 'meeting', label: 'Ruang Rapat / Senat' },
  { value: 'hall', label: 'Aula Serbaguna' },
  { value: 'studio', label: 'Studio' },
];

export default function AdminRoomsPage() {
  const { currentUser } = useAppStore();
  const isSuperadmin = currentUser?.role === 'superadmin';

  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [building, setBuilding] = useState('Menara YARSI');
  const [floor, setFloor] = useState<number>(3);
  const [floorName, setFloorName] = useState('Lantai 3');
  const [capacity, setCapacity] = useState<number>(50);
  const [type, setType] = useState<RoomType>('classroom');
  const [requiresYayasanApproval, setRequiresYayasanApproval] = useState(false);
  const [facilitiesText, setFacilitiesText] = useState('AC, Proyektor, Sound System, Wi-Fi');
  const [locationDetails, setLocationDetails] = useState('');
  const [picName, setPicName] = useState('Admin Fasilitas');
  const [picPhone, setPicPhone] = useState('081234567890');
  const [description, setDescription] = useState('');

  // Notifications
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchRooms = async () => {
    setIsLoading(true);
    try {
      const data = await roomsApi.getAll();
      setRooms(data);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Gagal memuat daftar master ruangan.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const openCreateModal = () => {
    setEditingRoom(null);
    setCode('');
    setName('');
    setBuilding('Menara YARSI');
    setFloor(3);
    setFloorName('Lantai 3');
    setCapacity(50);
    setType('classroom');
    setRequiresYayasanApproval(false);
    setFacilitiesText('AC, Proyektor, Sound System, Wi-Fi');
    setLocationDetails('');
    setPicName('Admin Fasilitas');
    setPicPhone('081234567890');
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setCode(room.code);
    setName(room.name);
    setBuilding(room.building || 'Menara YARSI');
    setFloor(room.floor || 1);
    setFloorName(room.floorName || `Lantai ${room.floor}`);
    setCapacity(room.capacity || 50);
    setType(room.type || 'classroom');
    setRequiresYayasanApproval(room.requiresYayasanApproval || false);
    setFacilitiesText(Array.isArray(room.facilities) ? room.facilities.join(', ') : '');
    setLocationDetails(room.locationDetails || '');
    setPicName(room.picName || '');
    setPicPhone(room.picPhone || '');
    setDescription(room.description || '');
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (room: Room) => {
    try {
      const res = await roomsApi.toggleStatus(room.id);
      setRooms((prev) =>
        prev.map((r) => (r.id === room.id ? res.room : r))
      );
      setNotification({
        type: 'success',
        message: `Status ketersediaan ${room.name} berhasil diubah ke: ${res.room.isActive ? 'Aktif (Tersedia)' : 'Nonaktif (Tutup/Maintenance)'}.`,
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Gagal mengubah ketersediaan ruangan.',
      });
    }
  };

  const handleDeleteRoom = async (room: Room) => {
    if (!confirm(`Hapus master ruangan "${room.name}" (${room.code})? Data peminjaman historis mungkin terpengaruh.`)) {
      return;
    }
    try {
      await roomsApi.delete(room.id);
      setRooms((prev) => prev.filter((r) => r.id !== room.id));
      setNotification({
        type: 'success',
        message: `Ruangan ${room.name} berhasil dihapus.`,
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Gagal menghapus ruangan.',
      });
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNotification({ type: 'error', message: 'Nama ruangan wajib diisi.' });
      return;
    }

    setIsSubmitting(true);
    setNotification(null);

    const payload = {
      name: name.trim(),
      floorId: Number(floor) || 1,
      capacity: Number(capacity) || 50,
      isSpecialRoom: requiresYayasanApproval,
      isActive: editingRoom ? editingRoom.isActive : true,
    };

    try {
      if (editingRoom) {
        const updated = await roomsApi.update(editingRoom.id, payload);
        setRooms((prev) => prev.map((r) => (r.id === editingRoom.id ? updated : r)));
        setNotification({
          type: 'success',
          message: `Master ruangan "${payload.name}" berhasil diperbarui.`,
        });
      } else {
        const created = await roomsApi.create(payload);
        setRooms((prev) => [created, ...prev]);
        setNotification({
          type: 'success',
          message: `Master ruangan baru "${payload.name}" berhasil ditambahkan.`,
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Gagal menyimpan data master ruangan.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        (r.building && r.building.toLowerCase().includes(q)) ||
        (r.floorName && r.floorName.toLowerCase().includes(q));

      const matchesType = typeFilter === 'ALL' || r.type === typeFilter;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && r.isActive) ||
        (statusFilter === 'INACTIVE' && !r.isActive);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [rooms, searchQuery, typeFilter, statusFilter]);

  if (!isSuperadmin) {
    return (
      <div className="rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-white dark:bg-slate-900 p-8 text-center space-y-4">
        <ShieldAlert className="h-12 w-12 text-rose-500 dark:text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Akses Dibatasi</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Halaman Pengelolaan Master Ruangan hanya dapat diakses oleh akun dengan role <strong>Superadmin</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[18px_4px_18px_18px] border border-slate-200/90 dark:border-slate-700 border-l-4 border-l-yarsi-primary bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-yarsi-primary dark:text-emerald-400">
            <Building2 className="w-4 h-4 text-yarsi-primary dark:text-emerald-400" />
            <span>Master Data Management · Superadmin</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">
            Master Ruangan Dinamis
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Tambah, edit, hapus, dan atur status operasional/ketersediaan seluruh ruangan Universitas & Yayasan YARSI.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-yarsi-primary dark:bg-emerald-600 hover:bg-yarsi-dark dark:hover:bg-emerald-500 shadow-md shadow-emerald-900/20 transition-all self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Ruangan Baru</span>
        </button>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl text-xs font-semibold ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-500/30'
              : 'bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-500/30'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
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

      {/* Stats Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Ruangan</p>
          <p className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">{rooms.length}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Terdaftar di master</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ruangan Aktif</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {rooms.filter((r) => r.isActive).length}
          </p>
          <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium mt-0.5">Tersedia dipinjam</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ruang Khusus Yayasan</p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {rooms.filter((r) => r.requiresYayasanApproval).length}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Butuh izin Yayasan</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">CBT & Laboratorium</p>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {rooms.filter((r) => r.type === 'lab' || r.name.toLowerCase().includes('cbt')).length}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Fasilitas komputer/lab</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama, kode ruangan, lantai, gedung..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 min-h-11 sm:min-h-0 rounded-lg border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="flex-1 min-w-[130px] sm:flex-none min-h-11 sm:min-h-0 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="ALL">Semua Tipe Ruang</option>
            {ROOM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
            className="flex-1 min-w-[130px] sm:flex-none min-h-11 sm:min-h-0 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Hanya Aktif</option>
            <option value="INACTIVE">Hanya Nonaktif</option>
          </select>

          <button
            type="button"
            onClick={fetchRooms}
            className="ml-auto sm:ml-0 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
            title="Muat ulang"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Rooms Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600 dark:text-emerald-400" />
            Memuat data master ruangan...
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 dark:text-slate-400">
            <Building2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            Tidak ada ruangan yang cocok dengan filter pencarian.
          </div>
        ) : (
          <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">Ruangan</th>
                  <th className="px-4 py-3">Kode / Tipe</th>
                  <th className="px-4 py-3">Lokasi / Gedung</th>
                  <th className="px-4 py-3">Kapasitas</th>
                  <th className="px-4 py-3">Approval Yayasan</th>
                  <th className="px-4 py-3">Ketersediaan</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRooms.map((room) => (
                  <tr key={room.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/80 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{room.name}</p>
                        <p className="text-[10px] text-slate-400 line-clamp-1">{room.description || 'Tidak ada deskripsi'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{room.code}</span>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">{room.type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800 dark:text-slate-200">{room.floorName || `Lt. ${room.floor}`}</span>
                      <span className="block text-[10px] text-slate-400">{room.building || 'Menara YARSI'}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                      {room.capacity ? `${room.capacity} Orang / Kursi` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {room.requiresYayasanApproval ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-500/40">
                          Wajib Yayasan
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          Reguler
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(room)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                          room.isActive
                            ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200'
                            : 'bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-200 hover:bg-rose-200'
                        }`}
                        title="Klik untuk mengubah ketersediaan ruangan"
                      >
                        <Power className="h-3 w-3" />
                        <span>{room.isActive ? 'Tersedia' : 'Nonaktif'}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(room)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                        title="Edit Data Ruangan"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRoom(room)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                        title="Hapus Ruangan"
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
            {filteredRooms.map((room) => (
              <div key={room.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-slate-100 leading-snug">{room.name}</p>
                    <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">
                      {room.description || 'Tidak ada deskripsi'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditModal(room)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                      title="Edit Data Ruangan"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRoom(room)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                      title="Hapus Ruangan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Kode / Tipe</p>
                    <p className="font-mono font-bold text-slate-700 dark:text-slate-300 truncate">{room.code}</p>
                    <p className="text-[10px] uppercase font-bold text-slate-400 truncate">{room.type}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lokasi</p>
                    <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{room.floorName || `Lt. ${room.floor}`}</p>
                    <p className="text-[10px] text-slate-400 truncate">{room.building || 'Menara YARSI'}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Kapasitas</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {room.capacity ? `${room.capacity} Orang` : '-'}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Approval</p>
                    {room.requiresYayasanApproval ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-500/40 whitespace-nowrap">
                        Wajib Yayasan
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                        Reguler
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(room)}
                    className={`inline-flex min-h-11 items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                      room.isActive
                        ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200'
                        : 'bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-200 hover:bg-rose-200'
                    }`}
                    title="Klik untuk mengubah ketersediaan ruangan"
                  >
                    <Power className="h-3 w-3" />
                    <span>{room.isActive ? 'Tersedia' : 'Nonaktif'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      {/* Modal Form Tambah / Edit Ruangan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    {editingRoom ? `Edit Ruangan: ${editingRoom.name}` : 'Tambah Master Ruangan Baru'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Konfigurasi spesifikasi teknis dan alur approval ruangan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Ruangan <span className="text-rose-500 dark:text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ruang CBT Center Class B"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 min-h-11 sm:min-h-0 rounded-xl border border-slate-300 dark:border-slate-600 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kode Ruangan <span className="text-rose-500 dark:text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CBT-B atau AUD-01"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 min-h-11 sm:min-h-0 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tipe Ruang
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as RoomType)}
                    className="w-full px-3 py-2 min-h-11 sm:min-h-0 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    {ROOM_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kapasitas (Orang/Kursi)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 min-h-11 sm:min-h-0 rounded-xl border border-slate-300 dark:border-slate-600 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Lantai
                  </label>
                  <input
                    type="text"
                    value={floorName}
                    onChange={(e) => setFloorName(e.target.value)}
                    placeholder="e.g. Lantai 3"
                    className="w-full px-3 py-2 min-h-11 sm:min-h-0 rounded-xl border border-slate-300 dark:border-slate-600 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresYayasanApproval}
                    onChange={(e) => setRequiresYayasanApproval(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Wajib Rekomendasi LPF & Approval Akhir Yayasan
                    </span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Centang jika ruangan ini adalah Auditorium Ar-Rahman, Ruang Senat, atau fasilitas khusus milik Yayasan YARSI.
                    </p>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Fasilitas (Pisahkan dengan koma)
                </label>
                <input
                  type="text"
                  value={facilitiesText}
                  onChange={(e) => setFacilitiesText(e.target.value)}
                  placeholder="e.g. 159 PC Client, AC, Sound System, Proyektor"
                  className="w-full px-3 py-2 min-h-11 sm:min-h-0 rounded-xl border border-slate-300 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi Singkat
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Deskripsi peruntukan ruangan..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="min-h-11 sm:min-h-0 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-11 sm:min-h-0 items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-yarsi-primary dark:bg-emerald-600 hover:bg-yarsi-dark dark:hover:bg-emerald-500 shadow-sm transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{editingRoom ? 'Perbarui Ruangan' : 'Simpan Ruangan'}</span>
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
