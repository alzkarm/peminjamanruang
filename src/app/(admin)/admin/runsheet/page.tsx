'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Building2,
  Building,
  CheckCircle2,
  Clock3,
  AlertCircle,
  Package,
  Armchair,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Check,
  RefreshCw,
  Sparkle,
  Trash2,
  Volume2,
  Tv,
  Wind,
  Layers,
  Search,
  Filter,
} from 'lucide-react';
import { runsheetApi, DailyRunsheetItem, cleanupApi } from '@/lib/api';
import { formatDateIndo } from '@/lib/utils';

export default function AdminDailyRunsheetPage() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [items, setItems] = useState<DailyRunsheetItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterReady, setFilterReady] = useState<string>('all'); // 'all', 'ready', 'pending'
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);

  const fetchRunsheet = async (date: string) => {
    try {
      setLoading(true);
      const data = await runsheetApi.getDaily(date);
      setItems(data);
    } catch (err: any) {
      console.error('Failed to load runsheet:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRunsheet(selectedDate);
  }, [selectedDate]);

  const handleDateChange = (daysDelta: number) => {
    const curr = new Date(selectedDate);
    curr.setDate(curr.getDate() + daysDelta);
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const d = String(curr.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const handleToggle = async (
    bookingId: string,
    itemKey: 'ac' | 'audio' | 'logistics' | 'cleanliness',
    currentVal: boolean,
  ) => {
    try {
      setUpdatingId(bookingId);
      const newVal = !currentVal;

      // Optimistic update
      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== bookingId) return it;
          const updatedReadiness = { ...it.readiness };
          if (itemKey === 'ac') updatedReadiness.isAcReady = newVal;
          if (itemKey === 'audio') updatedReadiness.isAudioReady = newVal;
          if (itemKey === 'logistics') updatedReadiness.isLogisticsReady = newVal;
          if (itemKey === 'cleanliness') updatedReadiness.isCleanlinessReady = newVal;

          updatedReadiness.isFullyReady =
            updatedReadiness.isAcReady &&
            updatedReadiness.isAudioReady &&
            updatedReadiness.isLogisticsReady &&
            updatedReadiness.isCleanlinessReady;

          return { ...it, readiness: updatedReadiness };
        }),
      );

      await runsheetApi.toggleCheck(bookingId, itemKey, newVal);
    } catch (err: any) {
      console.error('Failed to toggle runsheet check:', err);
      // Revert if error
      fetchRunsheet(selectedDate);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRunCleanup = async () => {
    try {
      setIsCleaning(true);
      setCleanupMessage(null);
      const res = await cleanupApi.cleanupExpired();
      setCleanupMessage(res.message);
      fetchRunsheet(selectedDate);
      setTimeout(() => setCleanupMessage(null), 5000);
    } catch (err: any) {
      setCleanupMessage('Gagal membersihkan jadwal kadaluwarsa.');
    } finally {
      setIsCleaning(false);
    }
  };

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (filterReady === 'ready' && !it.readiness.isFullyReady) return false;
      if (filterReady === 'pending' && it.readiness.isFullyReady) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchRoom = it.room.name.toLowerCase().includes(q);
        const matchTitle = it.title.toLowerCase().includes(q);
        const matchUser = it.user.fullName.toLowerCase().includes(q);
        const matchCode = it.bookingCode.toLowerCase().includes(q);
        if (!matchRoom && !matchTitle && !matchUser && !matchCode) return false;
      }

      return true;
    });
  }, [items, filterReady, searchQuery]);

  // Statistics
  const totalAgendas = items.length;
  const readyCount = items.filter((i) => i.readiness.isFullyReady).length;
  const pendingPrepCount = totalAgendas - readyCount;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-yarsi-dark via-emerald-900 to-yarsi-primary rounded-3xl p-6 text-white shadow-lg border border-emerald-800/40 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Operasional Lapangan & Teknisi Sarpras</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Agenda Harian Ruangan (Daily Run-Sheet)
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-xl">
              Pantau jadwal pelaksanaan acara hari ini, kelengkapan logistik meja/kursi, serta checklist kesiapan sarana prasarana sebelum acara dimulai.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRunCleanup}
              disabled={isCleaning}
              className="inline-flex min-h-11 sm:min-h-0 items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-semibold text-white transition-all shadow-sm disabled:opacity-50"
              title="Periksa dan lepaskan pengajuan yang kadaluwarsa (auto-expired)"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-teal-300 ${isCleaning ? 'animate-spin' : ''}`} />
              <span>{isCleaning ? 'Membersihkan...' : 'Rilis Slot Kadaluarsa'}</span>
            </button>

            <button
              type="button"
              onClick={() => fetchRunsheet(selectedDate)}
              className="inline-flex min-h-11 sm:min-h-0 items-center gap-1.5 px-3 py-2 bg-emerald-700/60 hover:bg-emerald-700 rounded-xl text-xs font-semibold text-white transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Segarkan</span>
            </button>
          </div>
        </div>

        {cleanupMessage && (
          <div className="mt-4 p-3 bg-emerald-400/20 border border-emerald-300/30 rounded-xl text-xs text-white font-medium flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>{cleanupMessage}</span>
          </div>
        )}
      </div>

      {/* Date Navigation & Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Date Selector Box */}
        <div className="md:col-span-2 bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between gap-3 dark:bg-slate-900 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold dark:bg-emerald-500/10 dark:text-emerald-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                Tanggal Operasional:
              </p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {formatDateIndo(selectedDate)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleDateChange(-1)}
              className="p-2.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors dark:hover:bg-slate-700/60 dark:text-slate-300"
              title="Hari Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
            />
            <button
              type="button"
              onClick={() => handleDateChange(1)}
              className="p-2.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors dark:hover:bg-slate-700/60 dark:text-slate-300"
              title="Hari Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Ready Stats */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between dark:bg-slate-900 dark:border-slate-700">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Ruangan Siap (Ready)
            </p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5 dark:text-emerald-400">{readyCount}</p>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">dari {totalAgendas} agenda</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Pending Prep Stats */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between dark:bg-slate-900 dark:border-slate-700">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Perlu Disiapkan
            </p>
            <p className="text-2xl font-black text-amber-600 mt-0.5 dark:text-amber-400">{pendingPrepCount}</p>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">sarpras & teknisi</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center dark:bg-amber-500/10 dark:text-amber-400">
            <Clock3 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 dark:bg-slate-900 dark:border-slate-700">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari ruangan, kegiatan, pemohon..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 min-h-11 sm:min-h-0 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterReady('all')}
            className={`flex-1 sm:flex-none px-3 py-1.5 min-h-11 sm:min-h-0 rounded-xl text-xs font-semibold transition-colors ${
              filterReady === 'all'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            Semua ({totalAgendas})
          </button>
          <button
            type="button"
            onClick={() => setFilterReady('ready')}
            className={`flex-1 sm:flex-none px-3 py-1.5 min-h-11 sm:min-h-0 rounded-xl text-xs font-semibold transition-colors ${
              filterReady === 'ready'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            Siap Digunakan ({readyCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterReady('pending')}
            className={`flex-1 sm:flex-none px-3 py-1.5 min-h-11 sm:min-h-0 rounded-xl text-xs font-semibold transition-colors ${
              filterReady === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            Perlu Persiapan ({pendingPrepCount})
          </button>
        </div>
      </div>

      {/* Main Runsheet Content List */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-3 dark:bg-slate-900 dark:border-slate-700">
          <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Memuat agenda operasional harian...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-3 dark:bg-slate-900 dark:border-slate-700">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto dark:bg-slate-800">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Tidak Ada Kegiatan Terjadwal</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto dark:text-slate-400">
            Tidak ada permohonan peminjaman yang disetujui pada tanggal {formatDateIndo(selectedDate)}.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const isReady = item.readiness.isFullyReady;
            const startTimeStr = new Date(item.startTime).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            });
            const endTimeStr = new Date(item.endTime).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border transition-all shadow-xs overflow-hidden dark:bg-slate-900 ${
                  isReady
                    ? 'border-emerald-300 ring-1 ring-emerald-500/20 dark:border-emerald-500/40'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                }`}
              >
                {/* Header Bar */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex flex-col items-center justify-center shrink-0 shadow-2xs dark:bg-slate-900 dark:border-slate-700">
                      <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-[10px] font-bold text-slate-800 mt-0.5 dark:text-slate-200">
                        {startTimeStr}
                      </span>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-[11px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded dark:text-slate-300 dark:bg-slate-900 dark:border-slate-700">
                          {item.bookingCode}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded uppercase dark:text-emerald-200 dark:bg-emerald-500/15">
                          {item.activityType}
                        </span>
                        {isReady ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full dark:text-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>RUANGAN SIAP (READY)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/30">
                            <Clock3 className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span>DALAM PERSIAPAN</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-900 leading-snug dark:text-slate-100">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
                        {item.user.fullName} ({item.user.unitName}) • {startTimeStr} - {endTimeStr} WIB
                      </p>
                    </div>
                  </div>

                  <div className="text-left md:text-right flex items-center md:flex-col gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.room.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.room.building} • Lantai {item.room.floor.level}
                      </p>
                    </div>

                    <Link
                      href={`/verify/${item.bookingCode}`}
                      target="_blank"
                      className="inline-flex min-h-11 sm:min-h-0 items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 font-semibold bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors dark:text-emerald-300 dark:hover:text-emerald-200 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:border-emerald-500/30"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Cek E-Pass</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left Column: Logistics List */}
                  <div className="lg:col-span-5 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Kebutuhan Logistik Tambahan:</span>
                    </div>

                    {item.logistik && item.logistik.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {item.logistik.map((l, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs dark:bg-slate-800/60 dark:border-slate-700"
                          >
                            <div className="flex items-center gap-2">
                              <Armchair className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                              <span className="font-semibold text-slate-800 capitalize dark:text-slate-200">
                                {l.jenisItem.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] dark:text-emerald-300 dark:bg-emerald-500/10">
                              {l.jumlah} Unit
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100 dark:bg-slate-800/60 dark:border-slate-800">
                        Tidak ada permintaan logistik tambahan (menggunakan fasilitas standar ruangan).
                      </p>
                    )}

                    {item.notes && (
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-300">
                        <strong className="text-slate-700 dark:text-slate-300">Catatan Pemohon:</strong> {item.notes}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Interactive Readiness Checklist */}
                  <div className="lg:col-span-7 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3 dark:bg-slate-800/50 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>Checklist Kesiapan Sarpras & Teknisi:</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        Diperbarui oleh: {item.readiness.checkedBy || '-'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* 1. AC Ready */}
                      <button
                        type="button"
                        onClick={() => handleToggle(item.id, 'ac', item.readiness.isAcReady)}
                        disabled={updatingId === item.id}
                        className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                          item.readiness.isAcReady
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs dark:bg-emerald-500/10 dark:border-emerald-500/40 dark:text-emerald-100'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:hover:border-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            item.readiness.isAcReady
                              ? 'bg-emerald-600 text-white'
                              : 'border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                          }`}
                        >
                          {item.readiness.isAcReady && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold">1. AC Dinyalakan (H-30m)</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Suhu sejuk & udara segar</p>
                        </div>
                      </button>

                      {/* 2. Audio & Proyektor Ready */}
                      <button
                        type="button"
                        onClick={() => handleToggle(item.id, 'audio', item.readiness.isAudioReady)}
                        disabled={updatingId === item.id}
                        className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                          item.readiness.isAudioReady
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs dark:bg-emerald-500/10 dark:border-emerald-500/40 dark:text-emerald-100'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:hover:border-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            item.readiness.isAudioReady
                              ? 'bg-emerald-600 text-white'
                              : 'border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                          }`}
                        >
                          {item.readiness.isAudioReady && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold">2. Audio & Proyektor</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Mic, kabel HDMI, & display siap</p>
                        </div>
                      </button>

                      {/* 3. Logistics Ready */}
                      <button
                        type="button"
                        onClick={() => handleToggle(item.id, 'logistics', item.readiness.isLogisticsReady)}
                        disabled={updatingId === item.id}
                        className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                          item.readiness.isLogisticsReady
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs dark:bg-emerald-500/10 dark:border-emerald-500/40 dark:text-emerald-100'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:hover:border-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            item.readiness.isLogisticsReady
                              ? 'bg-emerald-600 text-white'
                              : 'border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                          }`}
                        >
                          {item.readiness.isLogisticsReady && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold">3. Logistik Meja / Kursi</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Tertata sesuai permintaan</p>
                        </div>
                      </button>

                      {/* 4. Cleanliness Ready */}
                      <button
                        type="button"
                        onClick={() => handleToggle(item.id, 'cleanliness', item.readiness.isCleanlinessReady)}
                        disabled={updatingId === item.id}
                        className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                          item.readiness.isCleanlinessReady
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs dark:bg-emerald-500/10 dark:border-emerald-500/40 dark:text-emerald-100'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:hover:border-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            item.readiness.isCleanlinessReady
                              ? 'bg-emerald-600 text-white'
                              : 'border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                          }`}
                        >
                          {item.readiness.isCleanlinessReady && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold">4. Kebersihan Ruangan</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Sampah bersih & lantai rapi</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
