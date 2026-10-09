'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Clock, Calendar, Sparkles, Building2, User } from 'lucide-react';
import { roomsApi } from '@/lib/api';
import { RecentSubmission } from '@/lib/types';

export interface SubmissionPin {
  id: string;
  bookingId: string;
  roomId: string;
  roomName: string;
  roomCode: string;
  floor: string;
  title: string;
  status: string;
  statusLabel: string;
  statusColor: 'emerald' | 'amber' | 'blue' | 'sky' | 'rose';
  timeSlot: string;
  dateStr: string;
  applicant: string;
  // Coordinate on the building image (percentage 0 - 100)
  x: number;
  y: number;
  // Floating card anchor position (percentage 0 - 100)
  cardX: number;
  cardY: number;
  cardSide: 'left' | 'right';
}

const FALLBACK_SUBMISSIONS: SubmissionPin[] = [
  {
    id: 'sub-1',
    bookingId: 'cbt-a-1',
    roomId: 'room-cbt-a',
    roomName: 'Ruang CBT A',
    roomCode: 'CBT-A',
    floor: 'Lantai 5',
    title: 'Ujian Sertifikasi Kompetensi CBT',
    status: 'APPROVED',
    statusLabel: 'Disetujui',
    statusColor: 'emerald',
    timeSlot: '08:00 - 12:00',
    dateStr: '20 Okt',
    applicant: 'Fakultas Kedokteran',
    x: 32,
    y: 50,
    cardX: 18,
    cardY: 54,
    cardSide: 'left',
  },
  {
    id: 'sub-2',
    bookingId: 'aud-rahman-1',
    roomId: 'room-aud-rahman',
    roomName: 'Auditorium Ar Rahman',
    roomCode: 'MY-1201',
    floor: 'Lantai 12',
    title: 'YARSI Tech Festival 2026: AI Summit',
    status: 'PENDING',
    statusLabel: 'Menunggu',
    statusColor: 'amber',
    timeSlot: '08:00 - 16:00',
    dateStr: '20 Agu',
    applicant: 'BEM FTI',
    x: 54,
    y: 22,
    cardX: 82,
    cardY: 22,
    cardSide: 'right',
  },
  {
    id: 'sub-3',
    bookingId: 'senat-1',
    roomId: 'room-senat-8',
    roomName: 'Seminar Rektorat',
    roomCode: 'MY-0801',
    floor: 'Lantai 8',
    title: 'Simposium Nasional Kedokteran Islam',
    status: 'APPROVED',
    statusLabel: 'Disetujui',
    statusColor: 'emerald',
    timeSlot: '08:30 - 15:00',
    dateStr: '22 Agu',
    applicant: 'Fakultas Kedokteran',
    x: 56,
    y: 40,
    cardX: 82,
    cardY: 48,
    cardSide: 'right',
  },
  {
    id: 'sub-4',
    bookingId: 'fh-1',
    roomId: 'room-fh-1',
    roomName: 'Ruang Kuliah FH',
    roomCode: 'UY. 0302',
    floor: 'Lantai 3',
    title: 'Kuliah Tamu: Microservices Architecture',
    status: 'APPROVED',
    statusLabel: 'Disetujui',
    statusColor: 'emerald',
    timeSlot: '13:00 - 15:30',
    dateStr: '10 Agu',
    applicant: 'Fakultas Hukum',
    x: 28,
    y: 66,
    cardX: 18,
    cardY: 26,
    cardSide: 'left',
  },
  {
    id: 'sub-5',
    bookingId: 'pbl-1',
    roomId: 'room-pbl-25',
    roomName: 'PBL - K 25 Tutorial',
    roomCode: 'SB 25',
    floor: 'Lantai Dasar',
    title: 'Kuliah Umum Hukum Pidana 2026',
    status: 'APPROVED',
    statusLabel: 'Disetujui',
    statusColor: 'emerald',
    timeSlot: '09:00 - 11:00',
    dateStr: '15 Okt',
    applicant: 'Bagian Akademik',
    x: 44,
    y: 76,
    cardX: 18,
    cardY: 78,
    cardSide: 'left',
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
  const [submissions, setSubmissions] = useState<SubmissionPin[]>(FALLBACK_SUBMISSIONS);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch 5 latest submissions from Backend API
  useEffect(() => {
    let isMounted = true;
    async function loadRecent() {
      try {
        const data = await roomsApi.getRecentSubmissions(5);
        if (isMounted && Array.isArray(data) && data.length > 0) {
          // Predefined slots for cards so they never collide
          const cardPositions: Array<{ cardX: number; cardY: number; cardSide: 'left' | 'right' }> = [
            { cardX: 18, cardY: 26, cardSide: 'left' },
            { cardX: 82, cardY: 22, cardSide: 'right' },
            { cardX: 18, cardY: 54, cardSide: 'left' },
            { cardX: 82, cardY: 48, cardSide: 'right' },
            { cardX: 18, cardY: 78, cardSide: 'left' },
          ];

          const mapped: SubmissionPin[] = data.slice(0, 5).map((item, idx) => {
            const pos = cardPositions[idx] || cardPositions[0];

            // Calculate building pin Y coordinate based on floor level or name
            let yCoord = 50;
            const rName = (item.roomName || '').toLowerCase();
            const fLevel = item.floorLevel;
            if (fLevel >= 12 || rName.includes('auditorium')) {
              yCoord = 22;
            } else if (fLevel >= 8 || rName.includes('senat') || rName.includes('rektorat')) {
              yCoord = 40;
            } else if (fLevel >= 5 || rName.includes('cbt')) {
              yCoord = 51;
            } else if (fLevel >= 3 || rName.includes('lab') || rName.includes('kuliah')) {
              yCoord = 65;
            } else {
              yCoord = 76;
            }

            // Stagger horizontal pin positions on the building facade
            const xPositions = [32, 54, 30, 52, 42];
            const xCoord = xPositions[idx % xPositions.length];

            // Status label & color: PENDING/APPROVED aktif; alias lama display-only map ke Menunggu
            let statusLabel = 'Menunggu';
            let statusColor: SubmissionPin['statusColor'] = 'amber';
            const rawStatus = (item.status || '').toUpperCase();
            if (rawStatus === 'APPROVED') {
              statusLabel = 'Disetujui';
              statusColor = 'emerald';
            } else if (rawStatus === 'REJECTED') {
              statusLabel = 'Ditolak';
              statusColor = 'rose';
            }

            // Time and Date format
            let timeSlot = '08:00 - 12:00';
            let dateStr = 'Okt 2026';
            try {
              if (item.startTime) {
                const sDate = new Date(item.startTime);
                const sTime = sDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
                dateStr = sDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                if (item.endTime) {
                  const eTime = new Date(item.endTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
                  timeSlot = `${sTime} - ${eTime}`;
                } else {
                  timeSlot = sTime;
                }
              }
            } catch {}

            return {
              id: item.id || `pin-${idx}`,
              bookingId: item.id,
              roomId: item.roomId,
              roomName: item.roomName,
              roomCode: item.roomCode || '',
              floor: item.floorName || `Lantai ${item.floorLevel}`,
              title: item.title,
              status: rawStatus,
              statusLabel,
              statusColor,
              timeSlot,
              dateStr,
              applicant: item.applicantName || item.unitName || 'Civitas YARSI',
              x: xCoord,
              y: yCoord,
              cardX: pos.cardX,
              cardY: pos.cardY,
              cardSide: pos.cardSide,
            };
          });

          setSubmissions(mapped);
        }
      } catch (err) {
        console.warn('Fallback to default submissions for interactive building', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadRecent();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="relative w-[90%] ml-auto mt-[68px] -translate-x-6 select-none lg:scale-[1.18] xl:scale-[1.22] 2xl:scale-[1.26] lg:translate-x-[12%] xl:translate-x-[15%] 2xl:translate-x-[18%] origin-bottom-right transition-transform duration-300">
      {/* Main Relative Container with Preserved Aspect Ratio - 100% flat & transparent */}
      <div className="relative w-full aspect-[1024/592] overflow-visible bg-transparent">
        {/* Building Image - Seamless blend with background, no card/border */}
        <Image
          src="/images/building-yarsi.png"
          alt="Gedung Menara Universitas YARSI"
          fill
          unoptimized
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 1200px"
          className="object-contain object-center pointer-events-none bg-transparent"
          priority
        />

        {/* SVG Connecting Lines Layer */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {submissions.map((sub) => {
            const isHovered = hoveredHotspot === sub.id;
            const isActive = activeHotspot === sub.id;
            const pinColor =
              sub.statusColor === 'emerald'
                ? '#10B981'
                : sub.statusColor === 'sky'
                ? '#0EA5E9'
                : sub.statusColor === 'blue'
                ? '#3B82F6'
                : '#F59E0B';

            const strokeColor =
              isHovered || isActive
                ? pinColor
                : 'rgba(255, 255, 255, 0.35)';

            return (
              <g key={`svg-${sub.id}`}>
                {/* Thin, Semi-transparent Connecting Line */}
                <line
                  x1={sub.x}
                  y1={sub.y}
                  x2={sub.cardX}
                  y2={sub.cardY}
                  stroke={strokeColor}
                  strokeWidth={isHovered || isActive ? '0.6' : '0.45'}
                  strokeDasharray={isHovered || isActive ? 'none' : '1.5 1.5'}
                  className="transition-all duration-300"
                  vectorEffect="non-scaling-stroke"
                />

                {/* Target Pin on Building */}
                <circle
                  cx={sub.x}
                  cy={sub.y}
                  r={isHovered || isActive ? '1.8' : '1.3'}
                  fill={pinColor}
                  stroke="#FFFFFF"
                  strokeWidth="0.3"
                  className="transition-all duration-300"
                />

                {/* Pulse Ring at Building Anchor */}
                <circle
                  cx={sub.x}
                  cy={sub.y}
                  r="2.8"
                  fill="none"
                  stroke={pinColor}
                  strokeWidth="0.35"
                  opacity={isHovered || isActive ? '0.9' : '0.6'}
                  className="animate-ping"
                  style={{ transformOrigin: `${sub.x}% ${sub.y}%` }}
                />

                {/* Terminal Anchor Dot on Card Edge */}
                <circle
                  cx={sub.cardX}
                  cy={sub.cardY}
                  r="0.8"
                  fill={pinColor}
                  opacity="0.8"
                />
              </g>
            );
          })}
        </svg>

        {/* Hotspot Click Targets directly on Building */}
        {submissions.map((sub) => (
          <button
            key={`pin-btn-${sub.id}`}
            type="button"
            onClick={() => {
              setActiveHotspot(activeHotspot === sub.id ? null : sub.id);
              if (onSelectRoom) onSelectRoom(sub.roomName);
            }}
            onMouseEnter={() => setHoveredHotspot(sub.id)}
            onMouseLeave={() => setHoveredHotspot(null)}
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:focus:ring-emerald-500"
            style={{ left: `${sub.x}%`, top: `${sub.y}%` }}
            aria-label={`Pilih ${sub.roomName}`}
          >
            <span className="sr-only">{sub.roomName}</span>
          </button>
        ))}

        {/* Floating Hotspot Cards matching Mockup */}
        {submissions.map((sub) => {
          const isHovered = hoveredHotspot === sub.id;
          const isActive = activeHotspot === sub.id;

          const transformStyle =
            sub.cardSide === 'left'
              ? 'translate(-100%, -50%)'
              : 'translate(-32px, -50%)';

          const badgeClasses =
            sub.statusColor === 'emerald'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              : sub.statusColor === 'sky'
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
              : sub.statusColor === 'blue'
              ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
              : 'bg-amber-500/20 text-amber-300 border-amber-500/30';

          const indicatorDot =
            sub.statusColor === 'emerald'
              ? 'bg-emerald-400'
              : sub.statusColor === 'sky'
              ? 'bg-sky-400'
              : sub.statusColor === 'blue'
              ? 'bg-blue-400'
              : 'bg-amber-400';

          return (
            <div
              key={`card-${sub.id}`}
              style={{
                left: `${sub.cardX}%`,
                top: `${sub.cardY}%`,
                transform: transformStyle,
              }}
              onMouseEnter={() => setHoveredHotspot(sub.id)}
              onMouseLeave={() => setHoveredHotspot(null)}
              onClick={() => {
                setActiveHotspot(activeHotspot === sub.id ? null : sub.id);
                if (onSelectRoom) onSelectRoom(sub.roomName);
              }}
              className={`absolute z-30 hidden transition-all duration-300 cursor-pointer xl:block ${
                isHovered || isActive ? 'scale-105 z-40' : 'scale-100'
              }`}
            >
              {/* Compact Dark Card for Recent Room Submission */}
              <div
                className={`w-[140px] sm:w-[160px] p-2 sm:p-2.5 rounded-xl border backdrop-blur-xl transition-all duration-300 ${
                  isActive
                    ? 'bg-[#06140F]/95 border-emerald-400/80 shadow-[0_0_18px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400/50'
                    : isHovered
                    ? 'bg-[#06140F]/90 border-emerald-400/50 shadow-[0_8px_20px_rgba(0,0,0,0.6)]'
                    : 'bg-[#04120D]/85 border-white/10 hover:border-emerald-500/30 shadow-[0_4px_16px_rgba(0,0,0,0.5)]'
                }`}
              >
                {/* Header: Room Name & Status */}
                <div className="flex items-center justify-between gap-1 mb-1">
                  <h4 className="text-[10px] sm:text-[11px] font-bold text-white leading-tight tracking-tight truncate flex-1">
                    {sub.roomName}
                  </h4>
                  <span className={`inline-flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${badgeClasses}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${indicatorDot}`} />
                    {sub.statusLabel}
                  </span>
                </div>

                {/* Submission Activity Title */}
                <p
                  className="text-[9px] font-medium text-emerald-200/90 leading-snug line-clamp-1"
                  title={sub.title}
                >
                  {sub.title}
                </p>

                {/* Floor and Code */}
                <p className="text-[8.5px] text-slate-400 font-mono mt-0.5">
                  {sub.floor} {sub.roomCode ? `• ${sub.roomCode}` : ''}
                </p>

                {/* Date & Time Slot */}
                <div className="mt-1.5 pt-1.5 border-t border-white/10 flex items-center justify-between gap-1 text-[8.5px] text-slate-300">
                  <span className="inline-flex items-center gap-1 font-mono">
                    <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                    <span>{sub.timeSlot}</span>
                  </span>
                  <span className="text-slate-400 text-[8px] truncate">
                    {sub.dateStr}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[11px] text-emerald-200/80">
        <span className="font-semibold text-white/90 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          5 Pengajuan Ruangan Terbaru
        </span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Disetujui</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>Menunggu Approval</span>
        </div>
        <span className="text-white/30 hidden sm:inline">•</span>
        <span className="text-[10px] text-slate-300">Klik kartu untuk filter ruangan</span>
      </div>
    </div>
  );
}

