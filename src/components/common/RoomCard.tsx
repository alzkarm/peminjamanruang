'use client';

import React from 'react';
import Link from 'next/link';
import { Room } from '@/lib/types';
import {
  Users,
  Building,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  ArrowRight,
} from 'lucide-react';

interface RoomCardProps {
  room: Room;
  isAvailableToday?: boolean;
  activeBookingTitle?: string;
  onSelect?: (room: Room) => void;
}

export function RoomCard({
  room,
  isAvailableToday = true,
  activeBookingTitle,
  onSelect,
}: RoomCardProps) {
  const typeLabels: Record<Room['type'], string> = {
    auditorium: 'Auditorium',
    classroom: 'Smart Classroom',
    lab: 'Laboratorium',
    meeting: 'Ruang Rapat',
    studio: 'Studio',
    hall: 'Aula Serbaguna',
  };

  return (
    <article className="group flex h-full flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,.03)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_18px_42px_-24px_rgba(0,106,78,.38)]">
      <div>
        <div className="relative h-44 w-full overflow-hidden bg-slate-100 sm:h-48">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={room.imageUrl}
            alt={room.name}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-slate-950/5" />

          <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
            <span className="rounded-md border border-white/25 bg-slate-950/55 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-md">
              {typeLabels[room.type]}
            </span>
            {room.requiresYayasanApproval && (
              <span className="flex items-center gap-1 rounded-md bg-amber-400 px-2 py-1 text-[10px] font-extrabold text-amber-950 shadow-sm">
                <ShieldAlert className="h-3 w-3" />
                Yayasan
              </span>
            )}
          </div>

          <div className="absolute bottom-3 left-4 right-4 text-white">
            <span className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wide text-emerald-50 backdrop-blur-sm">
              {room.code}
            </span>
            <h3 className="mt-1.5 line-clamp-1 text-lg font-extrabold leading-snug tracking-tight text-white transition-colors group-hover:text-emerald-200">
              {room.name}
            </h3>
          </div>
        </div>

        <div className="space-y-4 p-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-slate-100 pb-3 text-xs text-slate-600">
            <div className="flex min-w-0 items-center gap-2">
              <Building className="h-4 w-4 shrink-0 text-yarsi-primary" />
              <span className="truncate font-semibold">{room.building} · Lt. {room.floor}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-800">
              <Users className="h-4 w-4 shrink-0 text-yarsi-primary" />
              <span className="font-bold">{room.capacity}</span>
              <span className="sr-only">orang</span>
            </div>
          </div>

          <p className="line-clamp-2 min-h-10 text-xs leading-5 text-slate-600">
            {room.description}
          </p>

          <div className="flex min-h-6 flex-wrap gap-1.5">
            {room.facilities.slice(0, 3).map((f, i) => (
              <span
                key={i}
                className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600"
              >
                {f}
              </span>
            ))}
            {room.facilities.length > 3 && (
              <span className="px-1 py-0.5 text-[10px] font-bold text-yarsi-primary">
                +{room.facilities.length - 3}
              </span>
            )}
          </div>

          <div aria-live="polite">
            {isAvailableToday ? (
              <div className="flex min-h-10 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs text-emerald-900">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span><strong className="font-bold">Tanpa jadwal aktif</strong> pada tanggal ini</span>
              </div>
            ) : (
              <div className="flex min-h-10 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs text-amber-950">
                <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500 ring-4 ring-amber-100" />
                <span className="min-w-0 truncate font-semibold">
                  {activeBookingTitle ? `Terjadwal: ${activeBookingTitle}` : 'Memiliki jadwal pada tanggal ini'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1.05fr] gap-2 border-t border-slate-100 bg-slate-50/60 p-3">
        <Link
          href={`/schedule?roomId=${room.id}`}
          aria-label={`Lihat jadwal ${room.name}`}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-center text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-100"
        >
          <Calendar className="h-3.5 w-3.5 text-slate-500" />
          Jadwal
        </Link>

        <Link
          href={`/dashboard/booking/new?roomId=${room.id}`}
          aria-label={`Ajukan peminjaman ${room.name}`}
          onClick={() => onSelect?.(room)}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-yarsi-primary px-3 text-center text-xs font-extrabold text-white shadow-sm hover:-translate-y-0.5 hover:bg-yarsi-dark hover:shadow-md"
        >
          Ajukan
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}
