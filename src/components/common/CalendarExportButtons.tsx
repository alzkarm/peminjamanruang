'use client';

import React from 'react';
import { Booking } from '@/lib/types';
import { getGoogleCalendarUrl, downloadIcsFile } from '@/lib/calendar-exporter';
import { Calendar, Download, ExternalLink } from 'lucide-react';

interface CalendarExportButtonsProps {
  booking: Booking;
  variant?: 'compact' | 'full';
  className?: string;
}

export function CalendarExportButtons({
  booking,
  variant = 'full',
  className = '',
}: CalendarExportButtonsProps) {
  const googleCalUrl = getGoogleCalendarUrl(booking);

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <a
          href={googleCalUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Tambahkan ke Google Calendar"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 transition-colors"
        >
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span>Google Calendar</span>
        </a>

        <button
          type="button"
          onClick={() => downloadIcsFile(booking)}
          title="Unduh file kalender .ics (Apple Calendar / Outlook)"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-300 transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-slate-600" />
          <span>iCal (.ics)</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-yarsi-primary" />
          <span>Sinkronisasi ke Kalender Pribadi</span>
        </span>
        <span className="text-[10px] text-slate-400">Pengingat H-30 Menit</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <a
          href={googleCalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200 shadow-2xs hover:border-blue-400 transition-all text-center"
        >
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span>Add to Google Calendar</span>
          <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
        </a>

        <button
          type="button"
          onClick={() => downloadIcsFile(booking)}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-300 shadow-2xs transition-all text-center"
        >
          <Download className="w-3.5 h-3.5 text-slate-600" />
          <span>Download iCal (.ics)</span>
        </button>
      </div>
    </div>
  );
}
