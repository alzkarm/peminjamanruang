'use client';

import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { CbtSeatBooking, CbtFaculty, CbtRoomId, CbtBookingStatus } from '@/lib/types';
import { AlertCircle, CheckCircle2, MousePointer, RefreshCw } from 'lucide-react';

/** Faculty → color mapping */
export const FACULTY_COLORS: Record<CbtFaculty, { bg: string; border: string; label: string; text: string }> = {
  FEB: { bg: '#93C5FD', border: '#60A5FA', label: 'Fak. Ekonomi & Bisnis', text: '#1E3A5F' },
  FH: { bg: '#F87171', border: '#EF4444', label: 'Fak. Hukum', text: '#7F1D1D' },
  FTI: { bg: '#FB923C', border: '#F97316', label: 'Fak. Teknologi Informasi', text: '#7C2D12' },
  FK: { bg: '#4ADE80', border: '#22C55E', label: 'Fak. Kedokteran', text: '#14532D' },
  FKG: { bg: '#C4B5FD', border: '#A78BFA', label: 'Fak. Kedokteran Gigi', text: '#3B0764' },
  FP: { bg: '#A855F7', border: '#9333EA', label: 'Fak. Psikologi', text: '#FFFFFF' },
};

export interface CbtRoomConfig {
  id: CbtRoomId;
  name: string;
  totalSeats: number;
  leftStart: number;
  leftEnd: number;
  rightStart: number;
  rightEnd: number;
  seatsPerRow: number;
  /** If true, uses custom layout logic (e.g., CBT Room B's asymmetrical pillar layout) */
  useCustomLayout?: boolean;
}

export interface CbtRowBlueprint {
  qLabel: string;
  subLabel?: string;
  seatNumbers: number[];
  leadingSpacers?: number;
  trailingSpacers?: number;
}

/**
 * CBT Room B Left Block — exactly matches physical paper blueprint (14 rows, 96 PCs total).
 * From bottom row Q23 (seats 197–203, snake starting right-to-left) to top row Q02 (seats 342–348).
 * Displayed top-to-bottom: Q02 at top, Q23 at bottom.
 */
export const CBT_B_LEFT_BLUEPRINT: CbtRowBlueprint[] = [
  { qLabel: 'Q02', subLabel: 'Q14', seatNumbers: [342, 343, 344, 345, 346, 347, 348] },
  { qLabel: 'Q04', subLabel: 'Q13', seatNumbers: [341, 340, 339, 338, 337, 336, 335] },
  { qLabel: 'Q06', subLabel: 'Q12', seatNumbers: [314, 315, 316, 317, 318, 319, 320] },
  { qLabel: 'Q08', subLabel: 'Q11', seatNumbers: [313, 312, 311, 310, 309, 308, 307] },
  { qLabel: 'Q10', subLabel: 'Q10', seatNumbers: [286, 287, 288, 289, 290, 291, 292] },
  { qLabel: 'Q12', subLabel: 'Q9',  seatNumbers: [285, 284, 283, 282, 281, 280, 279] },
  { qLabel: 'Q14', subLabel: 'Q8',  seatNumbers: [258, 259, 260, 261, 262, 263, 264] },
  { qLabel: 'Q16', subLabel: 'Q7',  seatNumbers: [257, 256, 255, 254, 253, 252, 251] },
  { qLabel: 'Q18', subLabel: 'Q6',  seatNumbers: [230, 231, 232, 233, 234, 235, 236] },
  { qLabel: 'Q19', subLabel: 'Q5',  seatNumbers: [229, 228, 227, 226, 225], trailingSpacers: 2 },
  { qLabel: 'Q20', subLabel: 'Q4',  seatNumbers: [218, 219, 220, 221, 222, 223, 224] },
  { qLabel: 'Q21', subLabel: 'Q3',  seatNumbers: [217, 216, 215, 214, 213, 212, 211] },
  { qLabel: 'Q22', subLabel: 'Q2',  seatNumbers: [204, 205, 206, 207, 208, 209, 210] },
  { qLabel: 'Q23', subLabel: 'Q1',  seatNumbers: [203, 202, 201, 200, 199, 198, 197] },
];

/**
 * CBT Room B Right Block — exactly matches physical paper blueprint (9 rows, 63 PCs total).
 * From top row Q01 (seats 349–355) down to row Q17 (seats 237–243).
 * Below Q17 sit RUANG PENGAWAS and RUANG SERVER / PANEL LISTRIK.
 */
export const CBT_B_RIGHT_BLUEPRINT: CbtRowBlueprint[] = [
  { qLabel: 'Q01', seatNumbers: [349, 350, 351, 352, 353, 354, 355] },
  { qLabel: 'Q03', seatNumbers: [334, 333, 332, 331, 330, 329, 328] },
  { qLabel: 'Q05', seatNumbers: [321, 322, 323, 324, 325, 326, 327] },
  { qLabel: 'Q07', seatNumbers: [306, 305, 304, 303, 302, 301, 300] },
  { qLabel: 'Q09', seatNumbers: [293, 294, 295, 296, 297, 298, 299] },
  { qLabel: 'Q11', seatNumbers: [278, 277, 276, 275, 274, 273, 272] },
  { qLabel: 'Q13', seatNumbers: [265, 266, 267, 268, 269, 270, 271] },
  { qLabel: 'Q15', seatNumbers: [250, 249, 248, 247, 246, 245, 244] },
  { qLabel: 'Q17', seatNumbers: [237, 238, 239, 240, 241, 242, 243] },
];

export const CBT_ROOMS: Record<CbtRoomId, CbtRoomConfig> = {
  'cbt-a': {
    id: 'cbt-a',
    name: 'Ruang CBT A',
    totalSeats: 196,
    leftStart: 1,
    leftEnd: 98,
    rightStart: 99,
    rightEnd: 196,
    seatsPerRow: 7,
  },
  'cbt-b': {
    id: 'cbt-b',
    name: 'Ruang CBT B',
    totalSeats: 159,
    leftStart: 197,
    leftEnd: 348,
    rightStart: 237,
    rightEnd: 355,
    seatsPerRow: 7,
    useCustomLayout: true,
  },
};

export function getCbtRoomConfig(roomId: CbtRoomId): CbtRoomConfig {
  return CBT_ROOMS[roomId] || CBT_ROOMS['cbt-a'];
}

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
  roomId?: CbtRoomId;
  faculty?: CbtFaculty | '';
  capacity?: number;
  selectedSeats?: number[];
  onSelectedSeatsChange?: (seats: number[]) => void;
}

interface SeatInfo {
  seatNumber: number;
  status: 'available' | 'booked' | 'selected';
  bookingStatus?: CbtBookingStatus;
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
 * Row definition for a rendered block row.
 * Contains the SeatInfo cells and optional spacer counts.
 */
interface BlockRow {
  seats: SeatInfo[];
  qLabel: string;
  subLabel?: string;
  leadingSpacers?: number;
  trailingSpacers?: number;
}

/**
 * Builds custom block rows from blueprint definition.
 */
function buildBlueprintBlock(
  blueprint: CbtRowBlueprint[],
  buildSeat: (i: number) => SeatInfo,
): BlockRow[] {
  return blueprint.map((row) => ({
    seats: row.seatNumbers.map(buildSeat),
    qLabel: row.qLabel,
    subLabel: row.subLabel,
    leadingSpacers: row.leadingSpacers || 0,
    trailingSpacers: row.trailingSpacers || 0,
  }));
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
  const isBooked = seat.status === 'booked';
  const isSelected = seat.status === 'selected';
  const isApproved = isBooked && seat.bookingStatus === 'APPROVED';
  const isPending = isBooked && !isApproved;
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
          isBooked && isApproved && facultyTheme
            ? { backgroundColor: facultyTheme.bg, color: facultyTheme.text, border: `1.5px solid ${facultyTheme.border}` }
            : isBooked && isPending
              ? { backgroundColor: '#FEF08A', color: '#713F12', border: '1.5px solid #EAB308' }
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
        <div className="absolute z-50 hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[220px] pointer-events-none">
          <div className="bg-slate-900 text-white text-[10px] leading-snug px-2.5 py-1.5 rounded-lg shadow-xl text-center">
            <div className="font-semibold text-slate-300">
              Kursi #{seat.seatNumber} {seat.faculty ? `• ${seat.faculty}` : ''}
            </div>
            <div className={`font-bold mt-0.5 ${isPending ? 'text-amber-300' : 'text-emerald-300'}`}>
              {isPending
                ? 'Belum di-ACC (Kuning / Pending)'
                : `Sudah di-ACC (${seat.bookingTitle || 'Disetujui'})`}
            </div>
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
  seatsPerRow,
}: {
  rows: SeatInfo[][];
  label: string;
  rangeLabel: string;
  seatsPerRow: number;
  onMouseDown: (seatNumber: number, e: React.MouseEvent) => void;
  onMouseEnter: (seatNumber: number) => void;
  onMouseUp: (seatNumber: number) => void;
}) {
  return (
    <div className="flex-1 min-w-0">
      {/* Block header */}
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

            {/* Seat cells (seatsPerRow per row) */}
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
              {row.length < seatsPerRow &&
                Array.from({ length: seatsPerRow - row.length }).map((_, fi) => (
                  <div key={`f-${fi}`} className="w-8 h-8 sm:w-9 sm:h-9" />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Custom SeatBlock for CBT Room B — supports per-row Q labels, leading spacers (pillar),
 * and asymmetrical row sizes.
 */
function CustomSeatBlock({
  blockRows,
  label,
  rangeLabel,
  onMouseDown,
  onMouseEnter,
  onMouseUp,
  seatsPerRow,
  extraBottomContent,
}: {
  blockRows: BlockRow[];
  label: string;
  rangeLabel: string;
  seatsPerRow: number;
  onMouseDown: (seatNumber: number, e: React.MouseEvent) => void;
  onMouseEnter: (seatNumber: number) => void;
  onMouseUp: (seatNumber: number) => void;
  extraBottomContent?: React.ReactNode;
}) {
  return (
    <div className="flex-1 min-w-0">
      {/* Block header */}
      <div className="flex items-center justify-between mb-3 pb-1.5 border-b border-slate-200">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        <span className="text-[10px] font-mono font-medium text-slate-400">{rangeLabel}</span>
      </div>

      {/* Rows with custom Q labels */}
      <div className="space-y-1">
        {blockRows.map((br, idx) => (
          <div key={idx} className="flex items-center gap-1">
            {/* Q-Format Row label */}
            <div className="w-8 sm:w-10 shrink-0 text-right pr-1 flex flex-col items-end justify-center select-none leading-none">
              <span className="text-[9px] font-mono font-bold text-slate-600 dark:text-slate-300">{br.qLabel}</span>
              {br.subLabel && (
                <span className="text-[7.5px] font-mono font-medium text-slate-400">({br.subLabel})</span>
              )}
            </div>

            <div className="flex gap-1">
              {/* Leading spacers */}
              {br.leadingSpacers && br.leadingSpacers > 0 ? (
                Array.from({ length: br.leadingSpacers }).map((_, si) => (
                  <div
                    key={`lead-${si}`}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-slate-200/60 border border-dashed border-slate-300 flex items-center justify-center"
                    title="Pilar / Tiang"
                  >
                    <span className="text-[7px] text-slate-400 font-bold">▨</span>
                  </div>
                ))
              ) : null}

              {/* Seat cells */}
              {br.seats.map((seat) => (
                <SeatCell
                  key={seat.seatNumber}
                  seat={seat}
                  onMouseDown={onMouseDown}
                  onMouseEnter={onMouseEnter}
                  onMouseUp={onMouseUp}
                />
              ))}

              {/* Trailing spacers */}
              {br.trailingSpacers && br.trailingSpacers > 0 ? (
                Array.from({ length: br.trailingSpacers }).map((_, ti) => (
                  <div
                    key={`trail-${ti}`}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-slate-100/60 border border-dashed border-slate-200 flex items-center justify-center"
                    title="Area Kosong"
                  >
                    <span className="text-[7px] text-slate-300 font-bold">·</span>
                  </div>
                ))
              ) : null}
            </div>
          </div>
        ))}

        {extraBottomContent}
      </div>
    </div>
  );
}

export default function CbtSeatMap({
  bookings,
  roomId = 'cbt-a',
  capacity = 0,
  selectedSeats = [],
  onSelectedSeatsChange,
}: CbtSeatMapProps) {
  const roomConfig = getCbtRoomConfig(roomId);
  const {
    totalSeats: TOTAL_SEATS,
    leftStart: LEFT_START,
    leftEnd: LEFT_END,
    rightStart: RIGHT_START,
    rightEnd: RIGHT_END,
    seatsPerRow: SEATS_PER_ROW,
    useCustomLayout,
  } = roomConfig;

  // ─── Sequential Drag State (refs for real-time tracking without stale closures) ───
  const isDraggingRef = useRef(false);
  const dragAnchorRef = useRef<number | null>(null);   // The seat where mouse-down started
  const lastDragTargetRef = useRef<number | null>(null);   // The latest seat the cursor is over
  const lastClickedRef = useRef<number | null>(null);   // Last single-clicked seat (for Shift-Click)
  const preDragSelectionRef = useRef<number[]>([]);          // Selection snapshot BEFORE the drag started
  const selectedSeatsRef = useRef<number[]>(selectedSeats || []);
  selectedSeatsRef.current = selectedSeats || [];

  // Build seat-number → booking map
  const bookedSeatMap = useMemo(() => {
    const map = new Map<number, { faculty: CbtFaculty; title: string; bookedBy: string; bookingStatus: CbtBookingStatus }>();
    for (const booking of bookings) {
      // Skip REJECTED bookings — those seats are available again
      if (booking.status === 'REJECTED') continue;
      const bStatus = booking.status || 'PENDING';
      for (let s = booking.seatStart; s <= booking.seatEnd; s++) {
        map.set(s, {
          faculty: booking.faculty,
          title: booking.title,
          bookedBy: booking.user?.fullName || 'Pengguna',
          bookingStatus: bStatus,
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
        bookingStatus: booked.bookingStatus,
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

  // ─── Standard layout rows (Room A) ───
  const leftRows = useMemo(() => {
    if (useCustomLayout) return []; // handled by custom block rows
    const seats: SeatInfo[] = [];
    for (let i = LEFT_START; i <= LEFT_END; i++) seats.push(buildSeat(i));
    return chunk(seats, SEATS_PER_ROW);
  }, [buildSeat, useCustomLayout, LEFT_START, LEFT_END, SEATS_PER_ROW]);

  const rightRows = useMemo(() => {
    if (useCustomLayout) return []; // handled by custom block rows
    const seats: SeatInfo[] = [];
    for (let i = RIGHT_START; i <= RIGHT_END; i++) seats.push(buildSeat(i));
    return chunk(seats, SEATS_PER_ROW);
  }, [buildSeat, useCustomLayout, RIGHT_START, RIGHT_END, SEATS_PER_ROW]);

  // ─── Custom layout rows (Room B) ───
  const customLeftBlockRows = useMemo(() => {
    if (!useCustomLayout) return [];
    return buildBlueprintBlock(CBT_B_LEFT_BLUEPRINT, buildSeat);
  }, [buildSeat, useCustomLayout]);

  const customRightBlockRows = useMemo(() => {
    if (!useCustomLayout) return [];
    return buildBlueprintBlock(CBT_B_RIGHT_BLUEPRINT, buildSeat);
  }, [buildSeat, useCustomLayout]);

  // Total available seats count
  const totalBooked = bookedSeatMap.size;
  const totalAvailable = TOTAL_SEATS - totalBooked;

  // Faculty breakdown (only approved seats show faculty colors)
  const facultyBreakdown = useMemo(() => {
    const bd: Record<string, number> = {};
    for (const b of bookings) {
      if (b.status === 'REJECTED') continue;
      if (b.status === 'APPROVED') {
        bd[b.faculty] = (bd[b.faculty] || 0) + (b.seatEnd - b.seatStart + 1);
      }
    }
    return bd;
  }, [bookings]);

  // Pending count (yellow seats)
  const pendingSeatsCount = useMemo(() => {
    let count = 0;
    for (const b of bookings) {
      if (b.status === 'REJECTED') continue;
      if (b.status !== 'APPROVED') {
        count += (b.seatEnd - b.seatStart + 1);
      }
    }
    return count;
  }, [bookings]);

  const isFullCapacity = capacity > 0 && selectedSeats.length === capacity;

  // Dynamic range labels
  const leftRangeLabel = roomId === 'cbt-b'
    ? '96 Kursi (Q02–Q23)'
    : `Kursi ${String(LEFT_START).padStart(3, '0')} – ${String(LEFT_END).padStart(3, '0')}`;
  const rightRangeLabel = roomId === 'cbt-b'
    ? '63 Kursi (Q01–Q17)'
    : `Kursi ${String(RIGHT_START).padStart(3, '0')} – ${String(RIGHT_END).padStart(3, '0')}`;

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
          {/* LEFT BLOCK */}
          {useCustomLayout ? (
            <CustomSeatBlock
              blockRows={customLeftBlockRows}
              label="Blok Kiri"
              rangeLabel={leftRangeLabel}
              onMouseDown={handleSeatMouseDown}
              onMouseEnter={handleSeatMouseEnter}
              onMouseUp={handleSeatMouseUp}
              seatsPerRow={SEATS_PER_ROW}
            />
          ) : (
            <SeatBlock
              rows={leftRows}
              label="Blok Kiri"
              rangeLabel={leftRangeLabel}
              onMouseDown={handleSeatMouseDown}
              onMouseEnter={handleSeatMouseEnter}
              onMouseUp={handleSeatMouseUp}
              seatsPerRow={SEATS_PER_ROW}
            />
          )}

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

          {/* RIGHT BLOCK */}
          {useCustomLayout ? (
            <CustomSeatBlock
              blockRows={customRightBlockRows}
              label="Blok Kanan"
              rangeLabel={rightRangeLabel}
              onMouseDown={handleSeatMouseDown}
              onMouseEnter={handleSeatMouseEnter}
              onMouseUp={handleSeatMouseUp}
              seatsPerRow={SEATS_PER_ROW}
              extraBottomContent={
                roomId === 'cbt-b' ? (
                  <div className="mt-3 pl-8 sm:pl-10 pr-1 space-y-2">
                    <div className="h-[92px] rounded-lg border-2 border-slate-300 bg-slate-100/90 flex flex-col items-center justify-center p-2 text-center shadow-sm">
                      <span className="text-[10px] font-extrabold text-slate-700 tracking-wider uppercase">
                        RUANG PENGAWAS
                      </span>
                      <span className="text-[8.5px] text-slate-500 mt-0.5">Area Pengawas CBT</span>
                    </div>
                    <div className="h-[92px] rounded-lg border-2 border-slate-300 bg-slate-100/90 flex flex-col items-center justify-center p-2 text-center shadow-sm">
                      <span className="text-[10px] font-extrabold text-slate-700 tracking-wider uppercase">
                        RUANG SERVER / PANEL LISTRIK
                      </span>
                      <span className="text-[8.5px] text-slate-500 mt-0.5">Petugas DPT Only</span>
                    </div>
                  </div>
                ) : null
              }
            />
          ) : (
            <SeatBlock
              rows={rightRows}
              label="Blok Kanan"
              rangeLabel={rightRangeLabel}
              onMouseDown={handleSeatMouseDown}
              onMouseEnter={handleSeatMouseEnter}
              onMouseUp={handleSeatMouseUp}
              seatsPerRow={SEATS_PER_ROW}
            />
          )}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="border-t border-slate-200 pt-3">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
          Legenda Status &amp; Alokasi Fakultas
        </h4>
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Pending (Kuning) Indicator */}
          <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border bg-yellow-50 border-amber-300 shadow-xs">
            <div
              className="w-3.5 h-3.5 rounded-sm shrink-0"
              style={{ backgroundColor: '#FEF08A', border: '1.5px solid #EAB308' }}
            />
            <span className="font-bold text-amber-900">Belum di-ACC (Kuning)</span>
            <span className="text-amber-700 text-[10px]">Pending Approval</span>
            {pendingSeatsCount > 0 && (
              <span className="font-extrabold text-amber-800 bg-amber-200/80 px-1.5 py-0.2 rounded text-[10px]">
                {pendingSeatsCount} kursi
              </span>
            )}
          </div>

          <span className="text-slate-300 text-xs px-1">|</span>
          <span className="text-slate-500 text-xs font-semibold">Sudah di-ACC:</span>

          {(Object.entries(FACULTY_COLORS) as [CbtFaculty, (typeof FACULTY_COLORS)[CbtFaculty]][]).map(
            ([code, color]) => {
              const count = facultyBreakdown[code] || 0;
              return (
                <div
                  key={code}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border"
                  style={{
                    backgroundColor: count > 0 ? `${color.bg}33` : '#F8FAFC',
                    borderColor: count > 0 ? color.border : '#E2E8F0',
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
        </div>
      </div>
    </div>
  );
}