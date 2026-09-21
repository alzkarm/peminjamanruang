'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock3,
  Lock,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { Room } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import { AuthGateModal } from './AuthGateModal';

interface RoomCardProps {
  room: Room;
  variant?: 'default' | 'compact';
  isAvailableToday?: boolean;
  activeBookingTitle?: string;
  activeTime?: string;
  onSelect?: (room: Room) => void;
  onPinjamClick?: (room: Room) => void;
}

const roomTypeLabels: Record<Room['type'], string> = {
  auditorium: 'Auditorium',
  classroom: 'Ruang kelas',
  lab: 'Laboratorium',
  meeting: 'Ruang rapat',
  studio: 'Studio',
  hall: 'Aula',
};

export function RoomCard({
  room,
  variant = 'default',
  isAvailableToday = true,
  activeBookingTitle,
  activeTime,
  onPinjamClick,
}: RoomCardProps) {
  const { currentUser } = useAppStore();
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const isGuest = !currentUser || currentUser.role === 'guest';

  const handlePinjamClick = (event: React.MouseEvent) => {
    if (onPinjamClick) {
      event.preventDefault();
      onPinjamClick(room);
      return;
    }

    if (isGuest) {
      event.preventDefault();
      setAuthGateOpen(true);
    }
  };

  if (variant === 'compact') {
    return (
      <>
        <article className="group flex h-full min-h-[270px] flex-col overflow-hidden rounded-[13px_3px_13px_13px] border border-slate-200 bg-white shadow-sm card-hover">
          <div className="relative h-[112px] w-full overflow-hidden bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={room.imageUrl}
              alt={`Tampilan ${room.name}`}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-slate-950/10" aria-hidden="true" />
            <span className={`absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[9px] font-extrabold shadow-sm backdrop-blur ${isAvailableToday ? 'bg-emerald-50/95 text-emerald-800' : 'bg-amber-50/95 text-amber-900'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isAvailableToday ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden="true" />
              {isAvailableToday ? 'Tersedia' : 'Terjadwal'}
            </span>
            <span className="absolute bottom-2.5 left-2.5 bg-[#052f26]/90 px-2 py-1 font-mono text-[9px] font-bold tracking-wide text-white backdrop-blur">
              {room.code}
            </span>
          </div>

          <div className="flex flex-1 flex-col px-3.5 py-3">
            <h3 className="truncate text-sm font-extrabold leading-snug tracking-tight text-slate-950 transition-colors group-hover:text-yarsi-primary">
              {room.name}
            </h3>
            <p className="mt-1 truncate text-[10px] font-medium text-slate-500">
              {room.building && !/main lt/i.test(room.building) ? <>{room.building} <span className="px-1 text-slate-300">·</span> </> : null}Lantai {room.floor}
            </p>

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-2.5 text-[10px]">
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-600">
                <Users className="h-3.5 w-3.5 text-yarsi-primary" aria-hidden="true" />
                {room.capacity} orang
              </span>
              <span className={`inline-flex min-w-0 items-center gap-1.5 font-bold ${isAvailableToday ? 'text-emerald-700' : 'text-amber-700'}`} title={activeBookingTitle}>
                {isAvailableToday ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />}
                <span className="truncate">{isAvailableToday ? 'Hari ini' : activeTime || 'Ada agenda'}</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 border-t border-slate-200">
            <Link href={`/schedule?roomId=${room.id}`} className="inline-flex min-h-11 items-center justify-center gap-1.5 border-r border-slate-200 px-2 text-[10px] font-extrabold text-slate-700 hover:bg-slate-50 hover:text-yarsi-primary">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" /> Jadwal
            </Link>
            <Link href={`/dashboard/booking/new?roomId=${room.id}`} onClick={handlePinjamClick} className="inline-flex min-h-11 items-center justify-center gap-1.5 bg-yarsi-primary px-2 text-[10px] font-extrabold text-white hover:bg-yarsi-dark">
              {isGuest && <Lock className="h-3 w-3 text-emerald-100" aria-hidden="true" />}
              Pinjam <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
        </article>

        <AuthGateModal isOpen={authGateOpen} onClose={() => setAuthGateOpen(false)} targetRoomId={room.id} targetRoomName={room.name} />
      </>
    );
  }

  return (
    <>
      <article className="group flex h-full flex-col overflow-hidden rounded-[18px_4px_18px_18px] border border-slate-200/90 bg-white shadow-card card-hover">
        <div className="relative h-48 w-full overflow-hidden bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={room.imageUrl}
            alt={`Tampilan ${room.name}`}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-slate-950/20" aria-hidden="true" />

          <div className="absolute left-3 top-3 flex items-center gap-2">
            <span className="border border-white/60 bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-yarsi-dark shadow-sm backdrop-blur">
              {roomTypeLabels[room.type]}
            </span>
            {room.requiresYayasanApproval && (
              <span className="inline-flex items-center gap-1 bg-amber-400 px-2.5 py-1 text-[10px] font-bold text-amber-950 shadow-sm">
                <ShieldAlert className="h-3 w-3" aria-hidden="true" /> Yayasan
              </span>
            )}
          </div>

          <span className="absolute bottom-3 left-3 bg-[#052f26]/90 px-2.5 py-1 font-mono text-[10px] font-bold tracking-wide text-white backdrop-blur">
            {room.code}
          </span>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <div className="flex-1">
            <h3 className="text-lg font-extrabold leading-snug tracking-tight text-slate-950 transition-colors group-hover:text-yarsi-primary">
              {room.name}
            </h3>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-yarsi-primary" aria-hidden="true" />
                {room.building && !/main lt/i.test(room.building) ? `${room.building}, ` : ''}Lantai {room.floor}
              </span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                <Users className="h-3.5 w-3.5 text-yarsi-primary" aria-hidden="true" />
                {room.capacity} orang
              </span>
            </div>

            <p className="mt-4 line-clamp-2 text-xs leading-5 text-slate-500">{room.description}</p>

            {room.facilities.length > 0 && (
              <p className="mt-3 line-clamp-1 text-[11px] font-medium text-slate-600">
                {room.facilities.slice(0, 3).join(' · ')}
                {room.facilities.length > 3 ? ` · +${room.facilities.length - 3}` : ''}
              </p>
            )}
          </div>

          <div className={`mt-5 border-l-2 px-3 py-2.5 ${isAvailableToday ? 'border-emerald-500 bg-emerald-50/70' : 'border-amber-500 bg-amber-50/75'}`}>
            {isAvailableToday ? (
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                Tersedia pada tanggal yang dipilih
              </div>
            ) : (
              <div className="flex items-start gap-2 text-xs font-bold text-amber-900">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                <span className="line-clamp-1">{activeBookingTitle ? `Terjadwal: ${activeBookingTitle}` : 'Memiliki agenda aktif'}</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 border-t border-slate-200">
          <Link href={`/schedule?roomId=${room.id}`} className="inline-flex min-h-12 items-center justify-center gap-2 border-r border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-yarsi-primary">
            <Calendar className="h-4 w-4" aria-hidden="true" /> Jadwal
          </Link>
          <Link href={`/dashboard/booking/new?roomId=${room.id}`} onClick={handlePinjamClick} className="inline-flex min-h-12 items-center justify-center gap-2 bg-yarsi-primary px-3 text-xs font-bold text-white hover:bg-yarsi-dark">
            {isGuest && <Lock className="h-3.5 w-3.5 text-emerald-100" aria-hidden="true" />}
            Pinjam <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </article>

      <AuthGateModal isOpen={authGateOpen} onClose={() => setAuthGateOpen(false)} targetRoomId={room.id} targetRoomName={room.name} />
    </>
  );
}
