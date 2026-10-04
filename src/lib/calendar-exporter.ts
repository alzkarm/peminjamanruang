/**
 * Utility for exporting approved room bookings to Google Calendar and iCal (.ics)
 * Task 2.5: Tombol "Add to Google Calendar / iCal"
 */

import { Booking } from './types';

function parseJakartaDateTime(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  // Jakarta is UTC+7
  const localDate = new Date(Date.UTC(year, month - 1, day, hours - 7, minutes, 0));
  return localDate;
}

function formatToIcsDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Generate a direct link to open Google Calendar with prefilled event details
 */
export function getGoogleCalendarUrl(booking: Booking): string {
  try {
    const startDate = parseJakartaDateTime(booking.date, booking.startTime);
    const endDate = parseJakartaDateTime(booking.date, booking.endTime);

    const startUtc = formatToIcsDate(startDate);
    const endUtc = formatToIcsDate(endDate);

    const title = encodeURIComponent(`[SIPERU YARSI] ${booking.title}`);
    const location = encodeURIComponent(
      `${booking.roomName} (Lantai ${booking.floor}), ${booking.building || 'Universitas YARSI'}`
    );
    const details = encodeURIComponent(
      `Kode Peminjaman: ${booking.bookingCode}\n` +
      `Peminjam: ${booking.userName} (${booking.userNimNidn || '-'})\n` +
      `Unit/Organisasi: ${booking.userOrganization || booking.department || '-'}\n` +
      `Ruangan: ${booking.roomName} (Lt. ${booking.floor})\n` +
      `Kegiatan: ${booking.title}\n` +
      `Verifikasi Dokumen: https://siperu.yarsi.ac.id/verify/${booking.passToken || booking.bookingCode}\n\n` +
      `Catatan: Harap hadir 15 menit sebelum acara dimulai dan tunjukkan QR Pass kepada petugas satpam/CS.`
    );

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startUtc}/${endUtc}&details=${details}&location=${location}`;
  } catch (err) {
    console.error('Error generating Google Calendar URL:', err);
    return '#';
  }
}

/**
 * Generate iCalendar (.ics) file string
 */
export function generateIcsContent(booking: Booking): string {
  const startDate = parseJakartaDateTime(booking.date, booking.startTime);
  const endDate = parseJakartaDateTime(booking.date, booking.endTime);
  const now = new Date();

  const uid = `siperu-${booking.bookingCode || booking.id}@yarsi.ac.id`;
  const location = `${booking.roomName} (Lantai ${booking.floor}), ${booking.building || 'Universitas YARSI'}`;
  const description = `Kegiatan: ${booking.title}\\nKode: ${booking.bookingCode}\\nPeminjam: ${booking.userName}\\nRuangan: ${booking.roomName}`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Universitas YARSI//SIPERU Booking Engine//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatToIcsDate(now)}`,
    `DTSTART:${formatToIcsDate(startDate)}`,
    `DTEND:${formatToIcsDate(endDate)}`,
    `SUMMARY:[SIPERU] ${booking.title.replace(/[\n\r]/g, ' ')}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Pengingat: Peminjaman Ruangan SIPERU dimulai dalam 30 menit',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Trigger client-side download of the .ics file
 */
export function downloadIcsFile(booking: Booking): void {
  try {
    const icsData = generateIcsContent(booking);
    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `Jadwal-SIPERU-${booking.bookingCode || 'booking'}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Error downloading ICS file:', err);
    alert('Gagal mengunduh file iCal. Silakan coba gunakan Google Calendar.');
  }
}
