'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Clock } from 'lucide-react';

export interface HotspotRoom {
  id: string;
  roomId: string;
  name: string;
  code: string;
  floor: string;
  defaultStatus: 'Tersedia' | 'Terjadwal';
  defaultTimeSlot: string;
  capacity: number;
  // Coordinate on the building image (percentage 0 - 100)
  x: number;
  y: number;
  // Floating card anchor position (percentage 0 - 100)
  cardX: number;
  cardY: number;
  cardSide: 'left' | 'right';
  detailUrl: string;
}

const HOTSPOTS: HotspotRoom[] = [
  {
    id: 'aud-rahman',
    roomId: 'room-aud-rahman',
    name: 'Auditorium Ar-Rahman',
    code: 'MY-1201',
    floor: 'Lantai 12',
    defaultStatus: 'Terjadwal',
    defaultTimeSlot: '09:00 - 12:00',
    capacity: 700,
    x: 52,
    y: 22,
    cardX: 80,
    cardY: 18,
    cardSide: 'right',
    detailUrl: '/dashboard/booking/new?room=room-aud-rahman',
  },
  {
    id: 'senat-rektorat',
    roomId: 'room-senat-8',
    name: 'Ruang Rapat Senat',
    code: 'MY-0801',
    floor: 'Lantai 8',
    defaultStatus: 'Tersedia',
    defaultTimeSlot: '08:00 - 17:00',
    capacity: 45,
    x: 56,
    y: 44,
    cardX: 80,
    cardY: 52,
    cardSide: 'right',
    detailUrl: '/dashboard/booking/new?room=room-senat-8',
  },
  {
    id: 'cbt-center',
    roomId: 'room-cbt-center',
    name: 'Smart CBT Center',
    code: 'CBT-01',
    floor: 'Lantai 5',
    defaultStatus: 'Terjadwal',
    defaultTimeSlot: '08:00 - 11:30',
    capacity: 200,
    x: 31,
    y: 52,
    cardX: 20,
    cardY: 42,
    cardSide: 'left',
    detailUrl: '/cbt-room',
  },
  {
    id: 'lab-ai',
    roomId: 'room-lab-ai',
    name: 'Lab AI & Smart Class',
    code: 'GC-0504',
    floor: 'Lantai 3',
    defaultStatus: 'Tersedia',
    defaultTimeSlot: '10:00 - 16:00',
    capacity: 50,
    x: 27,
    y: 68,
    cardX: 20,
    cardY: 74,
    cardSide: 'left',
    detailUrl: '/dashboard/booking/new?room=room-lab-ai',
  },
];

interface InteractiveBuildingProps {
  onSelectRoom?: (roomName: string) => void;
  selectedDate?: string;
  activeBookings?: Array<{ roomId: string; startTime: string; endTime: string; status: string }>;
}

export function InteractiveBuilding({
  onSelectRoom,
  selectedDate,
  activeBookings = [],
}: InteractiveBuildingProps) {
  const [hoveredHotspot, setHoveredHotspot] = useState<string | null>(null);
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);

  // Compute live status based on activeBookings if available
  const getHotspotStatus = (hotspot: HotspotRoom) => {
    const booking = activeBookings.find(
      (b) =>
        b.roomId === hotspot.roomId &&
        ['APPROVED', 'PENDING_LPF', 'RECOMMENDED_YAYASAN'].includes(b.status)
    );

    if (booking) {
      return {
        status: 'Terjadwal' as const,
        timeSlot: `${booking.startTime} - ${booking.endTime}`,
        isAvailable: false,
      };
    }

    return {
      status: hotspot.defaultStatus,
      timeSlot: hotspot.defaultTimeSlot,
      isAvailable: hotspot.defaultStatus === 'Tersedia',
    };
  };

  return (
    <div className="relative w-[90%] ml-auto mt-[68px] -translate-x-6 select-none lg:scale-[1.18] xl:scale-[1.22] 2xl:scale-[1.26] lg:translate-x-[12%] xl:translate-x-[15%] 2xl:translate-x-[18%] origin-bottom-right transition-transform duration-300">
      {/* Main Relative Container with Preserved Aspect Ratio - 100% flat & transparent */}
      <div className="relative w-full aspect-[1024/592] overflow-visible">
        {/* Building Image Container with Crisp, Thin Bottom Fade Mask */}
        <div
          className="relative w-full h-full overflow-visible"
          style={{
            maskImage:
              'linear-gradient(to bottom, rgb(0, 0, 0) 0%, rgb(0, 0, 0) 93%, rgba(0, 0, 0, 0) 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, rgb(0, 0, 0) 0%, rgb(0, 0, 0) 93%, rgba(0, 0, 0, 0) 100%)',
          }}
        >
          <Image
            src="/images/building-yarsi.png"
            alt="Gedung Menara Universitas YARSI"
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 1200px"
            className="object-contain object-center pointer-events-none bg-transparent"
            priority
          />
        </div>

        {/* SVG Connecting Lines Layer */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {HOTSPOTS.map((hotspot) => {
            const isHovered = hoveredHotspot === hotspot.id;
            const isActive = activeHotspot === hotspot.id;
            const { isAvailable } = getHotspotStatus(hotspot);

            const strokeColor =
              isHovered || isActive
                ? '#34D399'
                : 'rgba(255, 255, 255, 0.35)';

            return (
              <g key={`svg-${hotspot.id}`}>
                {/* Thin, Semi-transparent Connecting Line */}
                <line
                  x1={hotspot.x}
                  y1={hotspot.y}
                  x2={hotspot.cardX}
                  y2={hotspot.cardY}
                  stroke={strokeColor}
                  strokeWidth={isHovered || isActive ? '0.6' : '0.45'}
                  strokeDasharray={isHovered || isActive ? 'none' : '1.5 1.5'}
                  className="transition-all duration-300"
                  vectorEffect="non-scaling-stroke"
                />

                {/* Target Pin on Building */}
                <circle
                  cx={hotspot.x}
                  cy={hotspot.y}
                  r={isHovered || isActive ? '1.8' : '1.3'}
                  fill={isAvailable ? '#10B981' : '#F59E0B'}
                  stroke="#FFFFFF"
                  strokeWidth="0.3"
                  className="transition-all duration-300"
                />

                {/* Pulse Ring at Building Anchor */}
                <circle
                  cx={hotspot.x}
                  cy={hotspot.y}
                  r="2.8"
                  fill="none"
                  stroke={isAvailable ? '#34D399' : '#FBBF24'}
                  strokeWidth="0.35"
                  opacity={isHovered || isActive ? '0.9' : '0.6'}
                  className="animate-ping"
                  style={{ transformOrigin: `${hotspot.x}% ${hotspot.y}%` }}
                />

                {/* Terminal Anchor Dot on Card Edge */}
                <circle
                  cx={hotspot.cardX}
                  cy={hotspot.cardY}
                  r="0.8"
                  fill={isAvailable ? '#34D399' : '#FBBF24'}
                  opacity="0.8"
                />
              </g>
            );
          })}
        </svg>

        {/* Hotspot Click Targets directly on Building */}
        {HOTSPOTS.map((hotspot) => (
          <button
            key={`pin-btn-${hotspot.id}`}
            type="button"
            onClick={() => {
              setActiveHotspot(activeHotspot === hotspot.id ? null : hotspot.id);
              if (onSelectRoom) onSelectRoom(hotspot.name);
            }}
            onMouseEnter={() => setHoveredHotspot(hotspot.id)}
            onMouseLeave={() => setHoveredHotspot(null)}
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
            style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
            aria-label={`Pilih ${hotspot.name}`}
          >
            <span className="sr-only">{hotspot.name}</span>
          </button>
        ))}

        {/* Floating Hotspot Cards matching Mockup */}
        {HOTSPOTS.map((hotspot) => {
          const isHovered = hoveredHotspot === hotspot.id;
          const isActive = activeHotspot === hotspot.id;
          const { status, timeSlot, isAvailable } = getHotspotStatus(hotspot);

          // Card Alignment:
          // 'left' cardSide: right edge anchors at cardX
          // 'right' cardSide: left edge anchors at cardX
          const transformStyle =
            hotspot.cardSide === 'left'
              ? 'translate(-100%, -50%)'
              : 'translate(-32px, -50%)';

          return (
            <div
              key={`card-${hotspot.id}`}
              style={{
                left: `${hotspot.cardX}%`,
                top: `${hotspot.cardY}%`,
                transform: transformStyle,
              }}
              onMouseEnter={() => setHoveredHotspot(hotspot.id)}
              onMouseLeave={() => setHoveredHotspot(null)}
              onClick={() => {
                setActiveHotspot(activeHotspot === hotspot.id ? null : hotspot.id);
                if (onSelectRoom) onSelectRoom(hotspot.name);
              }}
              className={`absolute z-30 transition-all duration-300 cursor-pointer ${
                isHovered || isActive ? 'scale-105 z-40' : 'scale-100'
              }`}
            >
              {/* Compact Dark Card */}
              <div
                className={`w-[130px] sm:w-[148px] p-1.5 sm:p-2 rounded-xl border backdrop-blur-xl transition-all duration-300 ${
                  isActive
                    ? 'bg-[#06140F]/95 border-emerald-400/80 shadow-[0_0_18px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400/50'
                    : isHovered
                    ? 'bg-[#06140F]/90 border-emerald-400/50 shadow-[0_8px_20px_rgba(0,0,0,0.6)]'
                    : 'bg-[#04120D]/85 border-white/10 hover:border-emerald-500/30 shadow-[0_4px_16px_rgba(0,0,0,0.5)]'
                }`}
              >
                {/* Room Name */}
                <h4 className="text-[10px] sm:text-[11px] font-bold text-white leading-tight tracking-tight truncate">
                  {hotspot.name}
                </h4>

                {/* Floor & Code */}
                <p className="text-[9px] sm:text-[10px] text-emerald-300/85 font-medium mt-0.5 tracking-wide">
                  {hotspot.floor} • {hotspot.code}
                </p>

                {/* Text Hierarchy 3: Status Indicator with Time */}
                <div className="mt-1.5 pt-1.5 border-t border-white/10 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                      <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          isAvailable ? 'bg-emerald-400' : 'bg-amber-400'
                        }`}
                      />
                      <span
                        className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                          isAvailable ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                    </span>
                    <span
                      className={`text-[9px] sm:text-[10px] font-semibold truncate ${
                        isAvailable ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-0.5 text-[8px] sm:text-[9px] text-slate-300 font-mono shrink-0">
                    <Clock className="w-2 h-2 text-slate-400 shrink-0" />
                    {timeSlot}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-emerald-200/80">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Tersedia</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>Terjadwal</span>
        </div>
        <span className="text-white/30">•</span>
        <span className="text-[10px] text-slate-300">Klik kartu untuk filter ruangan</span>
      </div>
    </div>
  );
}

