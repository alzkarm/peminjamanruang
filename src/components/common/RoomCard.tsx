'use client';

import React from 'react';
import Link from 'next/link';
import { Room } from '@/lib/types';
import {
  Users,
  MapPin,
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
  const getTypeBadge = (type: Room['type']) => {
    switch (type) {
      case 'auditorium':
        return <span className="bg-purple-100 text-purple-800 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-purple-200">Auditorium Akbar</span>;
      case 'classroom':
        return <span className="bg-emerald-100 text-emerald-800 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-emerald-200">Smart Classroom</span>;
      case 'lab':
        return <span className="bg-blue-100 text-blue-800 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-blue-200">Laboratorium AI & Komputer</span>;
      case 'meeting':
        return <span className="bg-amber-100 text-amber-800 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-amber-200">Ruang Rapat Eksekutif</span>;
      case 'studio':
        return <span className="bg-rose-100 text-rose-800 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-rose-200">Studio Multimedia</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-slate-200">Aula Serbaguna</span>;
    }
  };

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/80 shadow-card card-hover overflow-hidden flex flex-col justify-between">
      <div>
        {/* Image & Status Overlay */}
        <div className="relative h-44 w-full overflow-hidden bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={room.imageUrl}
            alt={room.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

          {/* Top Badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
            <div>{getTypeBadge(room.type)}</div>
            {room.requiresYayasanApproval && (
              <span className="flex items-center gap-1 bg-amber-500/95 backdrop-blur text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                <ShieldAlert className="w-3 h-3" />
                <span>Persetujuan Yayasan</span>
              </span>
            )}
          </div>

          {/* Bottom Info on Image */}
          <div className="absolute bottom-3 left-3 right-3 text-white">
            <span className="text-[11px] font-mono font-bold bg-white/20 backdrop-blur px-1.5 py-0.5 rounded border border-white/30 text-white">
              {room.code}
            </span>
            <h3 className="text-base font-bold text-white leading-snug mt-1 line-clamp-1 group-hover:text-emerald-300 transition-colors">
              {room.name}
            </h3>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 space-y-3">
          {/* Building & Capacity */}
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <Building className="w-4 h-4 text-yarsi-primary shrink-0" />
              <span className="truncate font-medium">{room.building} (Lt. {room.floor})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-yarsi-primary shrink-0" />
              <span className="font-semibold text-slate-800">{room.capacity} Orang</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {room.description}
          </p>

          {/* Facility Pills */}
          <div className="flex flex-wrap gap-1 pt-1">
            {room.facilities.slice(0, 3).map((f, i) => (
              <span
                key={i}
                className="text-[10px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded border border-slate-200/60 font-medium"
              >
                {f}
              </span>
            ))}
            {room.facilities.length > 3 && (
              <span className="text-[10px] text-yarsi-primary font-bold px-1.5 py-0.5">
                +{room.facilities.length - 3} lainnya
              </span>
            )}
          </div>

          {/* Availability Status */}
          <div className="pt-2">
            {isAvailableToday ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">Tersedia untuk reservasi hari ini</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
                <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0"></span>
                <span className="font-medium truncate">
                  {activeBookingTitle ? `Terpakai: ${activeBookingTitle}` : 'Ada jadwal aktif hari ini'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="p-4 pt-0 flex items-center gap-2">
        <Link
          href={`/schedule?roomId=${room.id}`}
          className="flex-1 text-center py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1"
        >
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>Lihat Jadwal</span>
        </Link>

        <Link
          href={`/dashboard/booking/new?roomId=${room.id}`}
          className="flex-1 text-center py-2 px-3 text-xs font-bold text-white bg-yarsi-primary hover:bg-yarsi-dark rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-1"
        >
          <span>Pinjam</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
