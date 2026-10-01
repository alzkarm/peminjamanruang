'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Monitor, ArrowRight, Shield, Server, Sparkles, CheckCircle2 } from 'lucide-react';
import { cbtRoomApi } from '@/lib/api';
import { CbtSeatBooking, CbtRoomId, CbtFaculty, CbtBookingStatus } from '@/lib/types';
import {
  CBT_ROOMS,
  FACULTY_COLORS,
  CBT_B_LEFT_BLUEPRINT,
  CBT_B_RIGHT_BLUEPRINT,
} from '@/components/cbt/CbtSeatMap';

const LOCAL_STORAGE_KEY = 'siperu_cbt_seat_bookings_v1';

export function CBTBannerSection() {
  const [selectedRoomId, setSelectedRoomId] = useState<CbtRoomId>('cbt-a');
  const [bookings, setBookings] = useState<CbtSeatBooking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredSeat, setHoveredSeat] = useState<{
    seatNumber: number;
    faculty?: CbtFaculty;
    title?: string;
    isBooked: boolean;
    status?: CbtBookingStatus;
  } | null>(null);

  const activeConfig = CBT_ROOMS[selectedRoomId] || CBT_ROOMS['cbt-a'];
  const totalCapacity = activeConfig.totalSeats;
  const isCbtB = selectedRoomId === 'cbt-b';

  // Helper to load fallback local bookings if offline
  const getStoredLocalBookings = useCallback((): CbtSeatBooking[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // Fetch real-time seat bookings for the active room
  const fetchRoomSeats = useCallback(async () => {
    setIsLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const startISO = new Date(`${today}T08:00:00+07:00`).toISOString();
    const endISO = new Date(`${today}T17:00:00+07:00`).toISOString();
    const roomCode = isCbtB ? 'B' : 'A';

    try {
      const data = await cbtRoomApi.getSeats(startISO, endISO, roomCode);
      if (Array.isArray(data) && data.length > 0) {
        setBookings(data);
      } else {
        // Fallback to local simulation storage if database has no active slot bookings
        const localList = getStoredLocalBookings();
        const relevant = localList.filter((b) => {
          if (isCbtB) {
            return b.seatStart >= 197;
          }
          return b.seatStart <= 196;
        });
        setBookings(relevant);
      }
    } catch {
      const localList = getStoredLocalBookings();
      const relevant = localList.filter((b) => {
        if (isCbtB) {
          return b.seatStart >= 197;
        }
        return b.seatStart <= 196;
      });
      setBookings(relevant);
    } finally {
      setIsLoading(false);
    }
  }, [isCbtB, getStoredLocalBookings]);

  useEffect(() => {
    fetchRoomSeats();
  }, [fetchRoomSeats]);

  // Map of booked seat number -> booking information
  const bookedSeatMap = useMemo(() => {
    const map = new Map<
      number,
      { faculty: CbtFaculty; title: string; applicant?: string; status: CbtBookingStatus }
    >();
    bookings.forEach((b) => {
      if (b.status === 'REJECTED') return;
      const bStatus: CbtBookingStatus = b.status || 'PENDING';
      for (let s = b.seatStart; s <= b.seatEnd; s++) {
        map.set(s, {
          faculty: b.faculty,
          title: b.title,
          applicant: b.user?.fullName,
          status: bStatus,
        });
      }
    });
    return map;
  }, [bookings]);

  // Live booked & available counts
  const bookedCount = useMemo(() => {
    let count = 0;
    if (selectedRoomId === 'cbt-a') {
      for (let s = 1; s <= 196; s++) {
        if (bookedSeatMap.has(s)) count++;
      }
    } else {
      for (let s = 197; s <= 355; s++) {
        if (bookedSeatMap.has(s)) count++;
      }
    }
    return count;
  }, [selectedRoomId, bookedSeatMap]);

  const availableCount = Math.max(0, totalCapacity - bookedCount);

  // CBT A grid calculations: 14 rows x 7 cols per block
  const cbtALeftRows = useMemo(() => {
    const rows: number[][] = [];
    for (let r = 0; r < 14; r++) {
      const row: number[] = [];
      for (let c = 0; c < 7; c++) {
        row.push(r * 7 + c + 1); // 1 - 98
      }
      rows.push(row);
    }
    return rows;
  }, []);

  const cbtARightRows = useMemo(() => {
    const rows: number[][] = [];
    for (let r = 0; r < 14; r++) {
      const row: number[] = [];
      for (let c = 0; c < 7; c++) {
        row.push(98 + r * 7 + c + 1); // 99 - 196
      }
      rows.push(row);
    }
    return rows;
  }, []);

  // Render an individual mini seat box
  const renderSeatBox = (seatNum: number) => {
    const info = bookedSeatMap.get(seatNum);
    const isBooked = !!info;
    const isApproved = isBooked && info?.status === 'APPROVED';
    const fColor = info ? FACULTY_COLORS[info.faculty] : null;

    return (
      <div
        key={`banner-seat-${seatNum}`}
        onMouseEnter={() =>
          setHoveredSeat({
            seatNumber: seatNum,
            isBooked,
            faculty: info?.faculty,
            title: info?.title,
            status: info?.status,
          })
        }
        onMouseLeave={() => setHoveredSeat(null)}
        className="rounded-[1.5px] aspect-square transition-all duration-150 cursor-pointer hover:scale-125 hover:z-20 relative"
        style={{
          backgroundColor: !isBooked
            ? 'rgba(255,255,255,0.16)'
            : isApproved
              ? fColor?.bg || '#FB923C'
              : '#FACC15', // Kuning untuk status Belum di-ACC (Pending)
          borderWidth: isBooked ? '1px' : '0px',
          borderColor: !isBooked
            ? 'transparent'
            : isApproved
              ? fColor?.border || '#F97316'
              : '#EAB308', // Border Emas untuk Pending
        }}
      />
    );
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 sm:mt-14 lg:mt-16">
      <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-950 p-6 shadow-xl sm:p-8 relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid min-w-0 grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(330px,0.85fr)] relative z-10">
          {/* Left: Room Switcher, Description & Action */}
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-400/15 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                <Monitor className="w-3.5 h-3.5" />
                <span>Smart CBT Center — Fasilitas Eksklusif Kampus YARSI</span>
              </div>

              {/* Interactive Room Switcher Toggle */}
              <div className="inline-flex items-center p-1 rounded-xl bg-slate-950/60 border border-emerald-400/30">
                <button
                  type="button"
                  onClick={() => setSelectedRoomId('cbt-a')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    !isCbtB
                      ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Monitor className="w-3 h-3" />
                  <span>Ruang CBT A</span>
                  <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                    !isCbtB ? 'bg-emerald-700/60 text-emerald-100' : 'bg-white/10 text-slate-300'
                  }`}>
                    196
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRoomId('cbt-b')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    isCbtB
                      ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Monitor className="w-3 h-3" />
                  <span>Ruang CBT B</span>
                  <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                    isCbtB ? 'bg-emerald-700/60 text-emerald-100' : 'bg-white/10 text-slate-300'
                  }`}>
                    159
                  </span>
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Ruang CBT Multi-Tenant
                <span className="block text-emerald-300 text-lg sm:text-xl font-bold mt-0.5">
                  {activeConfig.name} • {totalCapacity} Kursi Komputer • Alokasi Per-Fakultas
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed mt-2 max-w-xl">
                Satu ruangan, banyak fakultas — secara bersamaan. Sistem pemesanan kursi berbasis rentang nomor untuk {activeConfig.name} ({isCbtB ? 'kursi #197–#355' : 'kursi #001–#196'}) dengan validasi overlap real-time dan penolakan otomatis jika kapasitas habis.
              </p>
            </div>

            {/* Faculty & Status color legend */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-400 text-amber-950 border border-amber-300 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-amber-800 animate-pulse" />
                Kuning: Menunggu ACC
              </span>
              <span className="px-1 text-[11px] text-emerald-200/80 font-medium">
                Setelah di-ACC:
              </span>
              {([
                { code: 'FEB', color: '#93C5FD', text: '#1E3A5F' },
                { code: 'FH',  color: '#F87171', text: '#7F1D1D' },
                { code: 'FTI', color: '#FB923C', text: '#7C2D12' },
                { code: 'FK',  color: '#4ADE80', text: '#14532D' },
                { code: 'FKG', color: '#C4B5FD', text: '#3B0764' },
                { code: 'FP',  color: '#A855F7', text: '#FFFFFF' },
              ] as const).map((f) => (
                <span
                  key={f.code}
                  className="px-2 py-0.5 rounded-md text-[10.5px] font-bold border"
                  style={{ backgroundColor: f.color, color: f.text, borderColor: f.color }}
                >
                  {f.code}
                </span>
              ))}
            </div>

            <Link
              href={`/cbt-room?room=${selectedRoomId}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-400 hover:bg-emerald-300 text-emerald-950 shadow-lg hover:shadow-emerald-400/30 transition-all"
            >
              <Monitor className="w-4 h-4" />
              <span>Buka Denah &amp; Booking {activeConfig.name}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Right: Dynamic Interactive Mini Seat Map Preview */}
          <div className="shrink-0 w-full lg:w-80 xl:w-96">
            <div className="bg-slate-950/60 border border-emerald-500/30 rounded-2xl p-4 space-y-2.5 shadow-xl backdrop-blur-md">
              {/* Range Header according to active room configuration */}
              <div className="flex items-center justify-between text-[10px] font-bold text-emerald-300 uppercase tracking-widest">
                <span>{isCbtB ? 'Blok Kiri (197–348)' : 'Blok Kiri (1–98)'}</span>
                <span>{isCbtB ? 'Blok Kanan (237–355)' : 'Blok Kanan (99–196)'}</span>
              </div>

              {/* Hover Indicator Tooltip */}
              <div className="h-6 flex items-center justify-between px-2 rounded-lg bg-white/5 text-[10px] font-mono text-slate-300">
                {hoveredSeat ? (
                  <span className="flex items-center gap-1.5 truncate">
                    <strong className="text-white">#{String(hoveredSeat.seatNumber).padStart(3, '0')}</strong>
                    <span>:</span>
                    {hoveredSeat.isBooked ? (
                      hoveredSeat.status === 'APPROVED' ? (
                        <span className="text-emerald-300 font-sans font-bold">
                          {hoveredSeat.faculty} {hoveredSeat.title ? `(${hoveredSeat.title})` : ''} • ACC
                        </span>
                      ) : (
                        <span className="text-amber-300 font-sans font-bold">
                          {hoveredSeat.faculty} — Menunggu ACC (Kuning)
                        </span>
                      )
                    ) : (
                      <span className="text-emerald-400 font-sans font-bold">✓ Tersedia</span>
                    )}
                  </span>
                ) : (
                  <span className="text-slate-400 italic font-sans text-[9.5px]">
                    Sorot kursi untuk cek ketersediaan
                  </span>
                )}
                {isLoading && (
                  <span className="text-amber-400 text-[9px] font-sans">Syncing...</span>
                )}
              </div>

              {/* Seat Map Visual Canvas */}
              <div className="flex items-start justify-center gap-2.5 pt-1">
                {/* Left Block */}
                <div className="flex-1">
                  {!isCbtB ? (
                    // CBT A Left: 14 rows x 7 cols = 98 seats
                    <div
                      className="grid gap-0.5"
                      style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
                    >
                      {cbtALeftRows.flat().map((sNum) => renderSeatBox(sNum))}
                    </div>
                  ) : (
                    // CBT B Left: 14 rows, 96 seats matching blueprint
                    <div className="space-y-0.5">
                      {CBT_B_LEFT_BLUEPRINT.map((rowBp, rIdx) => (
                        <div
                          key={`cbt-b-left-${rIdx}`}
                          className="grid gap-0.5"
                          style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
                        >
                          {rowBp.seatNumbers.map((sNum) => renderSeatBox(sNum))}
                          {rowBp.trailingSpacers ? (
                            Array.from({ length: rowBp.trailingSpacers }).map((_, spIdx) => (
                              <div key={`spacer-${spIdx}`} className="aspect-square opacity-0 pointer-events-none" />
                            ))
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Central Aisle */}
                <div className="flex flex-col items-center self-stretch justify-center px-0.5">
                  <div className="w-0 border-l border-dashed border-emerald-400/40 h-full" />
                </div>

                {/* Right Block */}
                <div className="flex-1">
                  {!isCbtB ? (
                    // CBT A Right: 14 rows x 7 cols = 98 seats
                    <div
                      className="grid gap-0.5"
                      style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
                    >
                      {cbtARightRows.flat().map((sNum) => renderSeatBox(sNum))}
                    </div>
                  ) : (
                    // CBT B Right: 9 rows, 63 seats + Pengawas/Server
                    <div className="space-y-0.5">
                      {CBT_B_RIGHT_BLUEPRINT.map((rowBp, rIdx) => (
                        <div
                          key={`cbt-b-right-${rIdx}`}
                          className="grid gap-0.5"
                          style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
                        >
                          {rowBp.seatNumbers.map((sNum) => renderSeatBox(sNum))}
                        </div>
                      ))}
                      {/* Physical Facilities representations for CBT B */}
                      <div className="pt-1.5 space-y-1">
                        <div className="h-5 rounded bg-white/10 border border-white/15 flex items-center justify-center gap-1 text-[7.5px] font-bold text-slate-300">
                          <Shield className="w-2.5 h-2.5 text-slate-400" />
                          <span>Pengawas</span>
                        </div>
                        <div className="h-5 rounded bg-white/10 border border-white/15 flex items-center justify-center gap-1 text-[7.5px] font-bold text-slate-300">
                          <Server className="w-2.5 h-2.5 text-slate-400" />
                          <span>Server CBT</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer text beneath mini map */}
              <div className="flex items-center justify-between text-[9px] text-white/70 pt-1.5 border-t border-white/10">
                <span>7 Kursi / Baris</span>
                <span className="text-emerald-300 font-bold font-mono">
                  {availableCount} Kursi Tersedia
                </span>
                <span>Lorong Tengah</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Statistics Metrics Strip (Bottom of banner) */}
        <div className="mt-6 grid grid-cols-1 gap-3 border-t border-white/10 pt-6 sm:grid-cols-3">
          <div className="text-center">
            <p className="text-2xl font-black text-white font-mono">{totalCapacity}</p>
            <p className="text-[11px] text-emerald-300/80 font-medium">Total Kursi PC</p>
          </div>
          <div className="border-y border-white/10 py-3 text-center sm:border-x sm:border-y-0 sm:py-0">
            <p className="text-2xl font-black text-white font-mono">7</p>
            <p className="text-[11px] text-emerald-300/80 font-medium">Kolom per blok</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-white font-mono">2</p>
            <p className="text-[11px] text-emerald-300/80 font-medium">Blok kursi</p>
          </div>
        </div>
      </div>
    </section>
  );
}
