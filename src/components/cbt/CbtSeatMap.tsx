'use client';

import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { CbtSeatBooking, CbtFaculty } from '@/lib/types';
import { AlertCircle, CheckCircle2, MousePointer, RefreshCw } from 'lucide-react';

/** Faculty → color mapping */
export const FACULTY_COLORS: Record<CbtFaculty, { bg: string; border: string; label: string; text: string }> = {
  FEB: { bg: '#93C5FD', border: '#60A5FA', label: 'Fak. Ekonomi & Bisnis',    text: '#1E3A5F' },
  FH:  { bg: '#F87171', border: '#EF4444', label: 'Fak. Hukum',               text: '#7F1D1D' },
  FTI: { bg: '#FB923C', border: '#F97316', label: 'Fak. Teknologi Informasi', text: '#7C2D12' },
  FK:  { bg: '#4ADE80', border: '#22C55E', label: 'Fak. Kedokteran',          text: '#14532D' },
  FKG: { bg: '#C4B5FD', border: '#A78BFA', label: 'Fak. Kedokteran Gigi',    text: '#3B0764' },
  FP:  { bg: '#A855F7', border: '#9333EA', label: 'Fak. Psikologi',           text: '#FFFFFF' },
};

const TOTAL_SEATS   = 200;
const SEATS_PER_ROW = 7;
const LEFT_START    = 1;
const LEFT_END      = 100;
const RIGHT_START   = 101;
const RIGHT_END     = 200;

/** Converts an array of seat numbers to formatted range strings e.g. "#001–#010, #015" */
export function formatSeatList(seats: number[]): string {
  if (!seats || !seats.length) return '';
  const sorted = [...seats].sort((a, b) => a - b);
  const ranges: string[] = [];
  let rangeStart = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    const current = sorted[i];
    if (current === prev + 1) {
      prev = current;
    } else {
      if (rangeStart === prev) {
        ranges.push(`#${String(rangeStart).padStart(3, '0')}`);
      } else {
        ranges.push(`#${String(rangeStart).padStart(3, '0')}–#${String(prev).padStart(3, '0')}`);
      }
      rangeStart = current;
      prev = current;
    }
  }

  return ranges.join(', ');
}

interface CbtSeatMapProps {
  bookings: CbtSeatBooking[];
  faculty?: CbtFaculty | '';
  capacity?: number;
  selectedSeats?: number[];
  onSelectedSeatsChange?: (seats: number[]) => void;
}

interface SeatInfo {
  seatNumber: number;
  status: 'available' | 'booked' | 'selected';
  faculty?: CbtFaculty;
  bookingTitle?: string;
  bookedBy?: string;
}

/** Split array into chunks of `size` */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Generates a sequential range of seat numbers between `from` and `to` (inclusive),
 * excluding any seats in `bookedSet`. Respects `capacity` by truncating.
 */
function buildSequentialRange(
  from: number,
  to: number,
  bookedSet: Set<number>,
  existingSelected: number[],
  capacity: number
): number[] {
  const min = Math.min(from, to);
  const max = Math.max(from, to);
  const rangeSeats: number[] = [];

  for (let i = min; i <= max; i++) {
    if (bookedSet.has(i)) continue; // skip booked seats
    rangeSeats.push(i);
  }

  // Merge with existing selected, deduplicate, and truncate to capacity
  const merged = new Set([...existingSelected, ...rangeSeats]);
  let result = Array.from(merged).sort((a, b) => a - b);

  // Capacity validation: truncate if exceeds
  if (capacity > 0 && result.length > capacity) {
    result = result.slice(0, capacity);
  }

  return result;
}

/** Renders a single seat cell */
function SeatCell({
  seat,
  onMouseDown,
  onMouseEnter,
  onMouseUp,
}: {
  seat: SeatInfo;
  onMouseDown: (seatNumber: number, e: React.MouseEvent) => void;
  onMouseEnter: (seatNumber: number) => void;
  onMouseUp: (seatNumber: number) => void;
}) {
  const isBooked   = seat.status === 'booked';
  const isSelected = seat.status === 'selected';
  const facultyTheme = seat.faculty ? FACULTY_COLORS[seat.faculty] : null;

  return (
    <div
      className="relative group cursor-pointer select-none"
      onMouseDown={(e) => {
        if (e.button === 0) {
          e.preventDefault(); // Prevent text selection ghosting during drag
          onMouseDown(seat.seatNumber, e);
        }
      }}
      onMouseEnter={() => onMouseEnter(seat.seatNumber)}
      onMouseUp={() => onMouseUp(seat.seatNumber)}
    >
      <div
        className={[
          'w-8 h-8 sm:w-9 sm:h-9 flex flex-col items-center justify-center rounded-md',
          'text-[8px] sm:text-[9px] font-bold select-none transition-all duration-75',
          isBooked
            ? 'shadow-sm cursor-not-allowed opacity-90'
            : isSelected
            ? 'bg-blue-50 text-blue-900 border-2 border-blue-500 shadow-md ring-2 ring-blue-400/50 ring-offset-1 z-10 scale-105 font-extrabold cursor-pointer'
            : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 hover:text-slate-800 hover:border-slate-300 cursor-pointer',
        ].join(' ')}
        style={
          isBooked && facultyTheme
            ? { backgroundColor: facultyTheme.bg, color: facultyTheme.text, border: `1.5px solid ${facultyTheme.border}` }
            : isSelected
            ? {
                borderColor: '#2563EB',
                borderWidth: '2px',
                borderStyle: 'solid',
                backgroundColor: '#EFF6FF',
                color: '#1E3A8A',
              }
            : undefined
        }
      >
        <span className={[
          'text-[6px] leading-none mb-0.5',
          isSelected ? 'text-blue-600 font-black opacity-100' : 'opacity-60'
        ].join(' ')}>
          ▣
        </span>
        <span className="leading-none">{seat.seatNumber}</span>
      </div>

      {/* Tooltip — booked seat */}
      {isBooked && (
        <div className="absolute z-50 hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[180px] pointer-events-none">
          <div className="bg-slate-900 text-white text-[10px] leading-snug px-2.5 py-1.5 rounded-lg shadow-xl">
            <div className="font-bold text-red-300">{seat.faculty} — #{seat.seatNumber} (Terisi)</div>
            <div className="text-slate-300 mt-0.5 truncate">{seat.bookingTitle}</div>
            <div className="text-slate-400 truncate">{seat.bookedBy}</div>
          </div>
          <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mt-1" />
        </div>
      )}

      {/* Tooltip — selected seat */}
      {isSelected && (
        <div className="absolute z-50 hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-max pointer-events-none">
          <div className="bg-blue-900 text-white text-[10px] px-2 py-1 rounded-lg shadow-xl font-medium border border-blue-500">
            Terpilih: #{seat.seatNumber}
          </div>
          <div className="w-2 h-2 bg-blue-900 rotate-45 mx-auto -mt-1" />
        </div>
      )}
    </div>
  );
}

/** Renders one vertical block (left or right) with Q-format row labels */
function SeatBlock({
  rows,
  label,
  rangeLabel,
  onMouseDown,
  onMouseEnter,
  onMouseUp,
}: {
  rows: SeatInfo[][];
  label: string;
  rangeLabel: string;
  onMouseDown: (seatNumber: number, e: React.MouseEvent) => void;
  onMouseEnter: (seatNumber: number) => void;
  onMouseUp: (seatNumber: number) => void;
}) {
  return (
    <div className="flex-1 min-w-0">
      {/* Block header - KEEP Kursi 001 - 100 text as is */}
      <div className="flex items-center justify-between mb-3 pb-1.5 border-b border-slate-200">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        <span className="text-[10px] font-mono font-medium text-slate-400">{rangeLabel}</span>
      </div>

      {/* Rows with Q1, Q2, Q3 row labels */}
      <div className="space-y-1">
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex items-center gap-1">
            {/* Q-Format Row label (Q1, Q2, Q3...) */}
            <span
              className="w-7 shrink-0 text-right text-[9px] font-mono font-bold text-slate-400 select-none pr-1"
              title={`Baris ${rowIdx + 1}`}
            >
              Q{rowIdx + 1}
            </span>

            {/* Seat cells (7 per row) */}
            <div className="flex gap-1">
              {row.map((seat) => (
                <SeatCell
                  key={seat.seatNumber}
                  seat={seat}
                  onMouseDown={onMouseDown}
                  onMouseEnter={onMouseEnter}
                  onMouseUp={onMouseUp}
                />
              ))}

              {/* Filler for incomplete last row */}
              {row.length < SEATS_PER_ROW &&
                Array.from({ length: SEATS_PER_ROW - row.length }).map((_, fi) => (
                  <div key={`f-${fi}`} className="w-8 h-8 sm:w-9 sm:h-9" />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CbtSeatMap({
  bookings,
  capacity = 0,
  selectedSeats = [],
  onSelectedSeatsChange,
}: CbtSeatMapProps) {
  // ─── Sequential Drag State (refs for real-time tracking without stale closures) ───
  const isDraggingRef      = useRef(false);
  const dragAnchorRef      = useRef<number | null>(null);   // The seat where mouse-down started
  const lastDragTargetRef  = useRef<number | null>(null);   // The latest seat the cursor is over
  const lastClickedRef     = useRef<number | null>(null);   // Last single-clicked seat (for Shift-Click)
  const preDragSelectionRef = useRef<number[]>([]);          // Selection snapshot BEFORE the drag started
  const selectedSeatsRef   = useRef<number[]>(selectedSeats || []);
  selectedSeatsRef.current = selectedSeats || [];

  // Build seat-number → booking map
  const bookedSeatMap = useMemo(() => {
    const map = new Map<number, { faculty: CbtFaculty; title: string; bookedBy: string }>();
    for (const booking of bookings) {
      for (let s = booking.seatStart; s <= booking.seatEnd; s++) {
        map.set(s, {
          faculty:  booking.faculty,
          title:    booking.title,
          bookedBy: booking.user?.fullName || 'Pengguna',
        });
      }
    }
    return map;
  }, [bookings]);

  // Set of booked seat numbers for quick lookup
  const bookedSet = useMemo(() => new Set(bookedSeatMap.keys()), [bookedSeatMap]);

  // ─── Global mouseup: end drag cleanly even if released outside seat area ───
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDraggingRef.current = false;
      dragAnchorRef.current = null;
      lastDragTargetRef.current = null;
      preDragSelectionRef.current = [];
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // ─── SEQUENTIAL DRAG: onMouseDown ───
  // Starts a drag. Records the anchor seat and snapshots current selection.
  const handleSeatMouseDown = useCallback((seatNumber: number, e: React.MouseEvent) => {
    if (bookedSet.has(seatNumber)) return;

    const isShift = e.shiftKey;
    const current = selectedSeatsRef.current;

    // ── Shift-Click: select sequential range from last clicked seat ──
    if (isShift && lastClickedRef.current !== null) {
      const rangeResult = buildSequentialRange(
        lastClickedRef.current,
        seatNumber,
        bookedSet,
        current,
        capacity
      );
      onSelectedSeatsChange?.(rangeResult);
      // Don't update lastClickedRef here — keep original anchor for chaining shift-clicks
      return;
    }

    // ── Normal click / start of drag ──
    isDraggingRef.current = true;
    dragAnchorRef.current = seatNumber;
    lastDragTargetRef.current = seatNumber;
    preDragSelectionRef.current = [...current]; // snapshot before drag

    // Toggle logic for single click (finalized on mouseUp if no drag occurred)
    // For now, immediately add if not selected
    if (!current.includes(seatNumber)) {
      if (capacity > 0 && current.length >= capacity) {
        isDraggingRef.current = false;
        return;
      }
      const next = [...current, seatNumber].sort((a, b) => a - b);
      selectedSeatsRef.current = next;
      onSelectedSeatsChange?.(next);
    }

    lastClickedRef.current = seatNumber;
  }, [bookedSet, capacity, onSelectedSeatsChange]);

  // ─── SEQUENTIAL DRAG: onMouseEnter ───
  // As the mouse moves over seats, recalculate the sequential range from anchor to current seat.
  // The entire range (anchor → current) is computed fresh each time, merged with the pre-drag snapshot.
  const handleSeatMouseEnter = useCallback((seatNumber: number) => {
    if (!isDraggingRef.current) return;
    if (dragAnchorRef.current === null) return;

    lastDragTargetRef.current = seatNumber;

    // Compute the sequential range from anchor to this seat
    const rangeResult = buildSequentialRange(
      dragAnchorRef.current,
      seatNumber,
      bookedSet,
      preDragSelectionRef.current,
      capacity
    );

    selectedSeatsRef.current = rangeResult;
    onSelectedSeatsChange?.(rangeResult);
  }, [bookedSet, capacity, onSelectedSeatsChange]);

  // ─── SEQUENTIAL DRAG: onMouseUp ───
  // Finalizes the drag. If user clicked an already-selected seat without dragging, toggle it off.
  const handleSeatMouseUp = useCallback((seatNumber: number) => {
    if (!isDraggingRef.current) return;

    const wasDrag = dragAnchorRef.current !== null && dragAnchorRef.current !== seatNumber;

    // If NOT a drag (same seat mousedown+mouseup) and seat was already selected before mousedown → toggle OFF
    if (!wasDrag && preDragSelectionRef.current.includes(seatNumber)) {
      const next = selectedSeatsRef.current.filter((s) => s !== seatNumber);
      selectedSeatsRef.current = next;
      onSelectedSeatsChange?.(next);
    }

    isDraggingRef.current = false;
    dragAnchorRef.current = null;
    lastDragTargetRef.current = null;
    preDragSelectionRef.current = [];
  }, [onSelectedSeatsChange]);

  // Selected set for quick O(1) lookup
  const selectedSeatSet = useMemo(() => new Set(selectedSeats), [selectedSeats]);

  /** Build SeatInfo for a seat number */
  const buildSeat = useCallback((i: number): SeatInfo => {
    const booked = bookedSeatMap.get(i);
    if (booked) {
      return {
        seatNumber: i,
        status: 'booked',
        faculty: booked.faculty,
        bookingTitle: booked.title,
        bookedBy: booked.bookedBy,
      };
    }

    if (selectedSeatSet.has(i)) {
      return {
        seatNumber: i,
        status: 'selected',
      };
    }

    return { seatNumber: i, status: 'available' };
  }, [bookedSeatMap, selectedSeatSet]);

  // Left block: seats 1–100 chunked into rows of 7
  const leftRows = useMemo(() => {
    const seats: SeatInfo[] = [];
    for (let i = LEFT_START; i <= LEFT_END; i++) seats.push(buildSeat(i));
    return chunk(seats, SEATS_PER_ROW);
  }, [buildSeat]);

  // Right block: seats 101–200 chunked into rows of 7
  const rightRows = useMemo(() => {
    const seats: SeatInfo[] = [];
    for (let i = RIGHT_START; i <= RIGHT_END; i++) seats.push(buildSeat(i));
    return chunk(seats, SEATS_PER_ROW);
  }, [buildSeat]);

  // Total available seats count
  const totalBooked = bookedSeatMap.size;
  const totalAvailable = TOTAL_SEATS - totalBooked;

  // Faculty breakdown
  const facultyBreakdown = useMemo(() => {
    const bd: Record<string, number> = {};
    for (const b of bookings) {
      bd[b.faculty] = (bd[b.faculty] || 0) + (b.seatEnd - b.seatStart + 1);
    }
    return bd;
  }, [bookings]);

  const isFullCapacity = capacity > 0 && selectedSeats.length === capacity;

  return (
    <div className="space-y-4 select-none">
      {/* ── Top Bar: ONLY 'Tersedia' Stat Badge + Drag Interaction Helper ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-slate-100 dark:border-slate-800">
        {/* ONLY keep the 'Tersedia' (Available) badge */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Tersedia: <strong>{totalAvailable} Kursi</strong>
          </span>

          <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline flex items-center gap-1.5">
            <MousePointer className="w-3.5 h-3.5 text-blue-600" />
            Seret untuk memilih deretan · Shift+Klik untuk rentang
          </span>
        </div>

        {/* Clear selection button: clicking immediately clears all blue outline borders */}
        {selectedSeats.length > 0 && (
          <button
            type="button"
            onClick={() => {
              lastClickedRef.current = null;
              onSelectedSeatsChange?.([]);
            }}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-md transition-all cursor-pointer active:scale-95"
            title="Kosongkan seluruh kursi terpilih"
          >
            <RefreshCw className="w-3 h-3" />
            Reset Pilihan ({selectedSeats.length})
          </button>
        )}
      </div>

      {/* ── Real-Time Multi-Select Feedback Banner ── */}
      {selectedSeats.length > 0 && (
        <div
          className={[
            'p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all duration-150',
            isFullCapacity
              ? 'bg-blue-50 border-blue-200 text-blue-900 shadow-sm'
              : 'bg-slate-50 border-slate-200 text-slate-800',
          ].join(' ')}
        >
          <div className="flex items-center gap-2.5">
            {isFullCapacity ? (
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            )}

            <div>
              <div className="font-bold flex items-center gap-2">
                <span>Kursi Terpilih:</span>
                <span className="font-mono text-blue-700 bg-blue-100 px-2 py-0.5 rounded text-[11px]">
                  {formatSeatList(selectedSeats)}
                </span>
              </div>

              {capacity > 0 ? (
                <p className="text-[11px] mt-0.5 font-medium">
                  {isFullCapacity ? (
                    <span className="text-blue-700 font-semibold">
                      Kapasitas terpenuhi: {selectedSeats.length} dari {capacity} kursi terpilih (Batas maksimal terkunci).
                    </span>
                  ) : (
                    <span className="text-amber-700">
                      Terpilih {selectedSeats.length} dari {capacity} kursi ({capacity - selectedSeats.length} kursi tersisa).
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Total {selectedSeats.length} kursi terpilih. Masukkan nilai Kapasitas di form untuk mengunci alokasi.
                </p>
              )}
            </div>
          </div>

          <div className="text-[10px] font-mono font-bold text-slate-500 self-end sm:self-center px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {capacity > 0 ? `${selectedSeats.length} / ${capacity} Kursi` : `${selectedSeats.length} Kursi`}
          </div>
        </div>
      )}

      {/* ── Front-of-room label ── */}
      <div className="flex justify-center">
        <div className="px-8 py-1 border-b-2 border-emerald-700 text-[10px] font-semibold text-slate-500 tracking-widest uppercase">
          ▲ Depan Ruangan / Layar Proyektor
        </div>
      </div>

      {/* ── Two-block layout with central aisle ── */}
      <div className="relative overflow-x-auto pb-2 rounded-xl select-none">
        <div className="flex gap-0 min-w-max mx-auto p-2">
          {/* LEFT BLOCK — seats 1–100 */}
          <SeatBlock
            rows={leftRows}
            label="Blok Kiri"
            rangeLabel="Kursi 001 – 100"
            onMouseDown={handleSeatMouseDown}
            onMouseEnter={handleSeatMouseEnter}
            onMouseUp={handleSeatMouseUp}
          />

          {/* CENTRAL AISLE */}
          <div className="flex flex-col items-center justify-start px-3 sm:px-5 pt-8 gap-1 shrink-0">
            {/* Dashed vertical line */}
            <div className="w-0 border-l-2 border-dashed border-slate-300/80 flex-1" />
            {/* Aisle label */}
            <span
              className="text-[8px] font-bold text-slate-400 uppercase tracking-widest select-none"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            >
              Lorong Tengah
            </span>
            <div className="w-0 border-l-2 border-dashed border-slate-300/80 flex-1" />
          </div>

          {/* RIGHT BLOCK — seats 101–200 */}
          <SeatBlock
            rows={rightRows}
            label="Blok Kanan"
            rangeLabel="Kursi 101 – 200"
            onMouseDown={handleSeatMouseDown}
            onMouseEnter={handleSeatMouseEnter}
            onMouseUp={handleSeatMouseUp}
          />
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="border-t border-slate-200 pt-3">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
          Legenda Alokasi Fakultas &amp; Status
        </h4>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(FACULTY_COLORS) as [CbtFaculty, (typeof FACULTY_COLORS)[CbtFaculty]][]).map(
            ([code, color]) => {
              const count = facultyBreakdown[code] || 0;
              return (
                <div
                  key={code}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border"
                  style={{
                    backgroundColor: count > 0 ? `${color.bg}33` : '#F8FAFC',
                    borderColor:     count > 0 ? color.border : '#E2E8F0',
                  }}
                >
                  <div
                    className="w-3.5 h-3.5 rounded-sm shrink-0"
                    style={{ backgroundColor: color.bg, border: `1.5px solid ${color.border}` }}
                  />
                  <span className="font-semibold text-slate-700">{code}</span>
                  <span className="text-slate-400 text-[10px]">{color.label}</span>
                  {count > 0 && (
                    <span className="font-bold text-slate-600">({count})</span>
                  )}
                </div>
              );
            }
          )}
          <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
            <div className="w-3.5 h-3.5 rounded-sm bg-slate-100 border border-slate-300" />
            <span className="text-slate-500 font-medium">Tersedia</span>
          </div>
          {/* Distinct bright blue outline for currently selected seats in legend */}
          <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-blue-50 border-2 border-blue-500 shadow-sm">
            <div className="w-3.5 h-3.5 rounded-sm bg-blue-100 border-2 border-blue-500" />
            <span className="text-blue-700 font-bold">Pilihan Anda (Outline Biru)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
