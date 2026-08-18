import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Booking, AcademicBlock, BookingStatus } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
  const [hours, minutes] = timeStr.split(":").map(Number);
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
  excludeBookingId?: string
): ConflictCheckResult {
  // 1. Check academic blocks
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

  // 2. Check existing bookings (Approved or In Review)
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
    const statusLabel =
      bookingConflict.status === "APPROVED"
        ? "Telah Disetujui"
        : "Sedang Dalam Antrean Review";
    return {
      hasConflict: true,
      reason: `Terbentur Peminjaman (${statusLabel}): ${bookingConflict.title} oleh ${bookingConflict.userName} (${bookingConflict.startTime} - ${bookingConflict.endTime})`,
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
        label: "Pending LPF (Admin Univ)",
        bg: "bg-amber-50 text-amber-800 border-amber-300 ring-amber-500/20",
        dot: "bg-amber-500",
        iconName: "Clock",
      };
    case "RECOMMENDED_YAYASAN":
    case "RECOMMENDED" as any:
      return {
        label: "Direkomendasikan (Menunggu Yayasan)",
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
        label: "Perlu Revisi (Dikembalikan)",
        bg: "bg-amber-100 text-amber-900 border-amber-400 ring-amber-500/20",
        dot: "bg-amber-600",
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
        iconName: "Sparkles",
      };
    case "ACADEMIC_BLOCKED":
      return {
        label: "Jadwal Kuliah (Locked)",
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
