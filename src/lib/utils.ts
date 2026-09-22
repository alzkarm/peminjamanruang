import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Booking, AcademicBlock, BookingStatus } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getJakartaDateString(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${value.year}-${value.month}-${value.day}`;
}

export function getJakartaDateTimeIso(dateValue: string, timeValue: string): string {
  return `${dateValue}T${timeValue}:00+07:00`;
}

export function formatDateIndo(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function formatShortDateIndo(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function getDayOfWeekNumber(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  return day === 0 ? 7 : day; // 1 = Senin, 7 = Minggu
}

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.replace('.', ':').split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function checkTimeOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const a1 = timeToMinutes(startA);
  const a2 = timeToMinutes(endA);
  const b1 = timeToMinutes(startB);
  const b2 = timeToMinutes(endB);
  return Math.max(a1, b1) < Math.min(a2, b2);
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  reason?: string;
  pendingNotice?: string;
  conflictingBooking?: Booking;
  conflictingAcademic?: AcademicBlock;
}

export function checkRoomConflict(
  roomId: string,
  dateStr: string,
  startTime: string,
  endTime: string,
  bookings: Booking[],
  academicBlocks: AcademicBlock[],
  excludeBookingId?: string,
  currentUserId?: string
): ConflictCheckResult {
  // 1. Check academic blocks (HARD CONFLICT)
  const dayNum = getDayOfWeekNumber(dateStr);
  const academicConflict = academicBlocks.find(
    (ab) =>
      ab.isActive &&
      ab.roomId === roomId &&
      ab.dayOfWeek === dayNum &&
      checkTimeOverlap(startTime, endTime, ab.startTime, ab.endTime)
  );

  if (academicConflict) {
    return {
      hasConflict: true,
      reason: `Terbentur Jadwal Kuliah Reguler: ${academicConflict.title} (${academicConflict.startTime} - ${academicConflict.endTime})`,
      conflictingAcademic: academicConflict,
    };
  }

  // 2. Check active bookings (APPROVED, PENDING_LPF, RECOMMENDED_YAYASAN - STRICT HARD CONFLICT)
  const activeStatuses: BookingStatus[] = [
    "APPROVED",
    "PENDING_LPF",
    "RECOMMENDED_YAYASAN",
  ];

  const bookingConflict = bookings.find(
    (b) =>
      b.id !== excludeBookingId &&
      b.roomId === roomId &&
      b.date === dateStr &&
      activeStatuses.includes(b.status) &&
      checkTimeOverlap(startTime, endTime, b.startTime, b.endTime)
  );

  if (bookingConflict) {
    const isSelf = Boolean(
      currentUserId &&
        (bookingConflict.userId === currentUserId || bookingConflict.userNimNidn === currentUserId)
    );
    const statusLabel =
      bookingConflict.status === "APPROVED"
        ? "Telah Resmi Disetujui"
        : "Sedang Dalam Antrean Review";

    const reason = isSelf
      ? `Anda sudah memiliki permohonan (${statusLabel}): "${bookingConflict.title}" pada slot waktu (${bookingConflict.startTime} - ${bookingConflict.endTime}). Silakan batalkan permohonan tersebut di Dashboard jika ingin mengajukan ulang.`
      : `Terbentur Peminjaman (${statusLabel}): "${bookingConflict.title}" oleh ${bookingConflict.userName || 'Pengguna'} (${bookingConflict.startTime} - ${bookingConflict.endTime}). Pilih jam atau ruangan lain.`;

    return {
      hasConflict: true,
      reason,
      conflictingBooking: bookingConflict,
    };
  }

  return { hasConflict: false };
}

export function getStatusBadgeConfig(status: BookingStatus) {
  switch (status) {
    case "PENDING_LPF":
    case "PENDING" as any:
      return {
        label: "Menunggu LPF",
        bg: "bg-amber-50 text-amber-800 border-amber-300 ring-amber-500/20",
        dot: "bg-amber-500",
        iconName: "Clock",
      };
    case "RECOMMENDED_YAYASAN":
    case "RECOMMENDED" as any:
      return {
        label: "Direkomendasikan ke Yayasan",
        bg: "bg-sky-50 text-sky-800 border-sky-300 ring-sky-500/20",
        dot: "bg-sky-500",
        iconName: "Building2",
      };
    case "APPROVED":
      return {
        label: "Disetujui",
        bg: "bg-emerald-50 text-emerald-800 border-emerald-300 ring-emerald-500/20",
        dot: "bg-emerald-500",
        iconName: "CheckCircle2",
      };
    case "RETURNED":
      return {
        label: "Perlu Revisi",
        bg: "bg-orange-50 text-orange-900 border-orange-300 ring-orange-500/20",
        dot: "bg-orange-500",
        iconName: "RotateCcw",
      };
    case "REJECTED":
      return {
        label: "Ditolak",
        bg: "bg-rose-50 text-rose-800 border-rose-300 ring-rose-500/20",
        dot: "bg-rose-500",
        iconName: "XCircle",
      };
    case "CANCELLED":
    case "CANCELED" as any:
      return {
        label: "Dibatalkan",
        bg: "bg-gray-100 text-gray-700 border-gray-300 ring-gray-400/20",
        dot: "bg-gray-400",
        iconName: "Ban",
      };
    case "COMPLETED":
      return {
        label: "Selesai",
        bg: "bg-teal-50 text-teal-800 border-teal-300 ring-teal-500/20",
        dot: "bg-teal-600",
        iconName: "CheckCheck",
      };
    case "ACADEMIC_BLOCKED":
      return {
        label: "Jadwal Akademik",
        bg: "bg-purple-50 text-purple-800 border-purple-300 ring-purple-500/20",
        dot: "bg-purple-500",
        iconName: "GraduationCap",
      };
    default:
      return {
        label: String(status || "Status"),
        bg: "bg-slate-100 text-slate-700 border-slate-300 ring-slate-400/20",
        dot: "bg-slate-400",
        iconName: "Clock",
      };
  }
}

export function exportToCSV(filename: string, rows: object[]) {
  if (!rows || !rows.length) return;
  const separator = ",";
  const keys = Object.keys(rows[0]);
  const csvContent =
    keys.join(separator) +
    "\n" +
    rows
      .map((row) => {
        return keys
          .map((k) => {
            const raw = (row as Record<string, unknown>)[k];
            let cellStr = raw === null || raw === undefined ? "" : String(raw);
            cellStr = cellStr.replace(/"/g, '""');
            if (cellStr.search(/("|,|\n)/g) >= 0) cellStr = `"${cellStr}"`;
            return cellStr;
          })
          .join(separator);
      })
      .join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function getTodayDateStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatLocalDateYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days, 12, 0, 0);
  return formatLocalDateYMD(dt);
}

export function addMonthsToDateStr(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1 + months, d, 12, 0, 0);
  return formatLocalDateYMD(dt);
}

export function ensureWorkingDay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  const day = dt.getDay(); // 0 is Sunday, 6 is Saturday
  if (day === 6) {
    return addDaysToDateStr(dateStr, 2); // Jump to Monday
  }
  if (day === 0) {
    return addDaysToDateStr(dateStr, 1); // Jump to Monday
  }
  return dateStr;
}

export function getNextWorkingDay(dateStr: string): string {
  let nextDateStr = addDaysToDateStr(dateStr, 1);
  const [y, m, d] = nextDateStr.split("-").map(Number);
  let dt = new Date(y, m - 1, d, 12, 0, 0);
  while (dt.getDay() === 0 || dt.getDay() === 6) {
    nextDateStr = addDaysToDateStr(nextDateStr, 1);
    const [ny, nm, nd] = nextDateStr.split("-").map(Number);
    dt = new Date(ny, nm - 1, nd, 12, 0, 0);
  }
  return nextDateStr;
}

export function getPrevWorkingDay(dateStr: string): string {
  let prevDateStr = addDaysToDateStr(dateStr, -1);
  const [y, m, d] = prevDateStr.split("-").map(Number);
  let dt = new Date(y, m - 1, d, 12, 0, 0);
  while (dt.getDay() === 0 || dt.getDay() === 6) {
    prevDateStr = addDaysToDateStr(prevDateStr, -1);
    const [py, pm, pd] = prevDateStr.split("-").map(Number);
    dt = new Date(py, pm - 1, pd, 12, 0, 0);
  }
  return prevDateStr;
}

export function isRecurringBooking(booking?: Booking | null): boolean {
  if (!booking) return false;
  if (booking.isPerSemester || booking.bulkGroupId || booking.semester) return true;
  const rawNotes = (booking.notes || booking.catatan || booking.description || '').toLowerCase();
  return (
    rawNotes.includes('rutin semester') ||
    rawNotes.includes('peminjaman rutin') ||
    rawNotes.includes('pengulangan') ||
    rawNotes.includes('setiap hari') ||
    rawNotes.includes('setiap senin')
  );
}

export function getRecurringScheduleLabel(booking?: Booking | null): string {
  if (!booking) return '';

  if (booking.semester) {
    return booking.semester.replace(/^\[?Rutin Semester:\s*/i, '').replace(/\]$/, '');
  }

  const rawNotes = booking.notes || booking.catatan || booking.description || '';
  const match = rawNotes.match(/\[?(Rutin Semester:[^\]\n]+|Peminjaman Rutin:[^\]\n]+|Pengulangan:[^\]\n]+)\]?/i);
  if (match) {
    return match[1].replace(/^(Rutin Semester|Peminjaman Rutin|Pengulangan):\s*/i, '').trim();
  }

  if (booking.tenggatPelaksanaan) {
    return `Setiap minggu pada jam yang sama (s.d. ${formatDateIndo(booking.tenggatPelaksanaan)})`;
  }

  return 'Setiap minggu pada hari dan jam yang sama selama 1 semester akademik';
}

export function countUniqueBookingApplications(bookingsList: Booking[]): number {
  if (!bookingsList || bookingsList.length === 0) return 0;
  const groupKeys = new Set<string>();
  for (const b of bookingsList) {
    if (b.bulkGroupId) {
      groupKeys.add(`bulk_${b.bulkGroupId}_${b.status}`);
    } else if (isRecurringBooking(b)) {
      const userKey = b.userId || b.userNimNidn || (b as any).userEmail || b.userName || 'user';
      groupKeys.add(`recur_${userKey}_${b.roomId}_${b.title}_${b.status}`);
    } else {
      groupKeys.add(`single_${b.id}`);
    }
  }
  return groupKeys.size;
}


