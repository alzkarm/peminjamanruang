'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Sparkles,
  Calendar,
  Clock,
  Users,
  Building2,
  CheckCircle2,
  ArrowRight,
  Loader2,
  MapPin,
  SlidersHorizontal,
} from 'lucide-react';
import { smartRoomsApi, SmartSearchResult } from '@/lib/api';
import { formatDateIndo } from '@/lib/utils';

export function SmartRoomFinder() {
  const [date, setDate] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('12:00');
  const [capacity, setCapacity] = useState<number>(30);
  const [building, setBuilding] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<SmartSearchResult[] | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (startTime >= endTime) {
      setErrorMessage('Waktu mulai harus lebih awal dari waktu selesai.');
      return;
    }

    try {
      setLoading(true);
      setHasSearched(true);
      const data = await smartRoomsApi.search({
        date,
        startTime,
        endTime,
        minCapacity: capacity > 0 ? capacity : undefined,
        building: building || undefined,
      });
      setResults(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mencari ruangan.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6 dark:bg-slate-900 dark:border-slate-700">
      {/* Title & Tagline */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-yarsi-primary text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider dark:text-emerald-200">
              <span>Pencarian Cerdas Anti-Bentrok</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
              Temukan Ruangan Sesuai Kebutuhan Anda
            </h2>
          </div>
        </div>

        <span className="text-xs text-slate-500 font-medium bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl self-start sm:self-auto dark:text-slate-400 dark:bg-slate-800/60 dark:border-slate-700">
          Cek ketersediaan real-time
        </span>
      </div>

      {/* Search Filter Form */}
      <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Date Input */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block dark:text-slate-400">
            Tanggal Acara:
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-medium dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Start Time Input */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block dark:text-slate-400">
            Jam Mulai:
          </label>
          <div className="relative">
            <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-medium dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
            />
          </div>
        </div>

        {/* End Time Input */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block dark:text-slate-400">
            Jam Selesai:
          </label>
          <div className="relative">
            <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-medium dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Min Capacity Input */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block dark:text-slate-400">
            Jumlah Peserta:
          </label>
          <div className="relative">
            <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="number"
              min={1}
              max={500}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              placeholder="Contoh: 50"
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-medium dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-yarsi-primary hover:bg-yarsi-dark disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span>{loading ? 'Mengecek...' : 'Cari Ruangan'}</span>
          </button>
        </div>
      </form>

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-400">
          {errorMessage}
        </div>
      )}

      {/* Results Section */}
      {hasSearched && !loading && results && (
        <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Hasil Pencarian: {results.length} Ruangan Tersedia
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              {formatDateIndo(date)} • {startTime} - {endTime} WIB
            </span>
          </div>

          {results.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2 dark:bg-slate-800/60 dark:border-slate-700">
              <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Tidak ada ruangan kosong pada jam tersebut untuk kapasitas {capacity} orang.
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Cobalah geser waktu 1-2 jam lebih awal/lambat atau pilih tanggal lain.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {results.map((r) => (
                <div
                  key={r.id}
                  className="bg-slate-50 hover:bg-white rounded-2xl p-4 border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between gap-3 group dark:bg-slate-800/60 dark:hover:bg-slate-900 dark:border-slate-700 dark:hover:border-emerald-500/40"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded uppercase dark:text-emerald-200 dark:bg-emerald-500/15">
                        Lantai {r.floorLevel}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Kosong</span>
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-800 transition-colors dark:text-slate-100 dark:group-hover:text-emerald-200">
                      {r.name}
                    </h4>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>Kapasitas {r.capacity}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{r.building}</span>
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/dashboard/booking/new?roomId=${r.id}&date=${date}&startTime=${startTime}&endTime=${endTime}`}
                    className="w-full py-2 px-3 bg-white hover:bg-yarsi-primary hover:text-white text-emerald-800 border border-emerald-200 hover:border-transparent rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs group-hover:shadow-xs dark:bg-slate-900 dark:hover:bg-emerald-600 dark:text-emerald-200 dark:border-emerald-500/30"
                  >
                    <span>Pesan Ruangan Ini</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
