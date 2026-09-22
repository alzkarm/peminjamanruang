'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Room, Booking, AcademicBlock } from '@/lib/types';
import {
  formatDateIndo,
  formatShortDateIndo,
  checkTimeOverlap,
  getDayOfWeekNumber,
  getJakartaDateString,
  formatLocalDateYMD,
  addDaysToDateStr,
  addMonthsToDateStr,
} from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { addJakartaDays, mapPublicEventToBooking, usePublicSchedule } from '@/lib/public-schedule';
import { EventDetailModal } from './EventDetailModal';
import { AuthGateModal } from '@/components/common/AuthGateModal';
import { CalendarGrid } from './CalendarGrid';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Building,
  Building2,
  Users,
  Info,
  Calendar,
  CalendarDays,
  CalendarRange,
  LayoutGrid,
  Sparkles,
  CheckCircle2,
  GraduationCap,
  Lock,
  Eye,
  PlusCircle,
  Plus,
  Search,
  ChevronDown,
  Check,
  X,
  Rows3,
} from 'lucide-react';

interface CalendarTimelineProps {
  rooms: Room[];
  initialDate?: string;
  selectedRoomId?: string;
  viewMode?: 'day' | 'week' | 'month';
  onViewModeChange?: (mode: 'day' | 'week' | 'month') => void;
}

const TIME_SLOTS = [
  '00:00',
  '00:30',
  '01:00',
  '01:30',
  '02:00',
  '02:30',
  '03:00',
  '03:30',
  '04:00',
  '04:30',
  '05:00',
  '05:30',
  '06:00',
  '06:30',
  '07:00',
  '07:30',
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
  '19:30',
  '20:00',
  '20:30',
  '21:00',
  '21:30',
  '22:00',
  '22:30',
  '23:00',
  '23:30',
];

function getNextSlotTime(slot: string): string {
  const [hStr, mStr] = slot.split(':');
  let h = parseInt(hStr, 10);
  let m = parseInt(mStr, 10) + 30;
  if (m >= 60) {
    h += 1;
    m -= 60;
  }
  if (h >= 24) {
    return '24:00';
  }
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];
function formatFloorFilterLabel(floor: string) {
  if (!floor) return 'Lantai -';
  if (floor.toUpperCase() === 'BASEMENT') return 'Basement';
  if (floor.toLowerCase() === 'dasar') return 'Lantai Dasar';
  if (/^\d+$/.test(floor)) return `Lantai ${floor}`;
  return floor.startsWith('Lantai') ? floor : `Lantai ${floor}`;
}

function getWeekDates(dateStr: string): string[] {
  const curr = new Date(`${dateStr}T00:00:00Z`);
  const day = curr.getUTCDay();
  const diff = curr.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(curr.setUTCDate(diff));

  return Array.from({ length: 7 }, (_, index) => {
    const nextDay = new Date(monday);
    nextDay.setUTCDate(monday.getUTCDate() + index);
    return nextDay.toISOString().slice(0, 10);
  });
}

export function CalendarTimeline({
  rooms,
  initialDate,
  selectedRoomId,
  viewMode: controlledViewMode,
  onViewModeChange,
}: CalendarTimelineProps) {
  const { currentUser } = useAppStore();
  const isGuest = !currentUser || currentUser.role === 'guest';
  const todayDateStr = getJakartaDateString();

  // Current selected date (defaults to today)
  const [currentDateStr, setCurrentDateStr] = useState<string>(
    initialDate || todayDateStr
  );
  const [internalViewMode, setInternalViewMode] = useState<'day' | 'week' | 'month'>('day');

  const activeViewMode = controlledViewMode || internalViewMode;

  const setViewMode = (mode: 'day' | 'week' | 'month') => {
    setInternalViewMode(mode);
    onViewModeChange?.(mode);
  };

  const [searchRoom, setSearchRoom] = useState<string>('');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>(
    selectedRoomId || 'all'
  );
  const [isRoomDropdownOpen, setIsRoomDropdownOpen] = useState(false);
  const roomDropdownRef = useRef<HTMLDivElement>(null);

  const [selectedFloor, setSelectedFloor] = useState<string>('all');
  const [isFloorDropdownOpen, setIsFloorDropdownOpen] = useState(false);
  const floorDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedRoomId) {
      setSelectedRoomFilter(selectedRoomId);
    }
  }, [selectedRoomId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        roomDropdownRef.current &&
        !roomDropdownRef.current.contains(event.target as Node)
      ) {
        setIsRoomDropdownOpen(false);
      }
      if (
        floorDropdownRef.current &&
        !floorDropdownRef.current.contains(event.target as Node)
      ) {
        setIsFloorDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedRoomObj = rooms.find((r) => r.id === selectedRoomFilter);

  const [activeRoomId, setActiveRoomId] = useState<string>(
    selectedRoomId || (rooms[0]?.id ?? '')
  );

  useEffect(() => {
    if (selectedRoomId) {
      setActiveRoomId(selectedRoomId);
    }
  }, [selectedRoomId]);

  useEffect(() => {
    if (!activeRoomId && rooms.length > 0) {
      setActiveRoomId(selectedRoomId || rooms[0].id);
    }
  }, [activeRoomId, rooms, selectedRoomId]);

  const weekDates = getWeekDates(currentDateStr);
  const monthStart = currentDateStr.slice(0, 7) + '-01';
  const scheduleStartDate = activeViewMode === 'week'
    ? weekDates[0]
    : activeViewMode === 'month'
      ? monthStart
      : currentDateStr;
  const scheduleEndDate = activeViewMode === 'week'
    ? addJakartaDays(weekDates[6], 1)
    : activeViewMode === 'month'
      ? addMonthsToDateStr(monthStart, 1)
      : addJakartaDays(currentDateStr, 1);
  const publicSchedule = usePublicSchedule(scheduleStartDate, scheduleEndDate);
  const bookings = publicSchedule.events.map(mapPublicEventToBooking);
  const academicBlocks: AcademicBlock[] = [];

  // Modal detail
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedAcademic, setSelectedAcademic] = useState<AcademicBlock | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Status Filter Toggles (Semua Aktif secara default)
  const [filterStatuses, setFilterStatuses] = useState<{
    approved: boolean;
    recommended: boolean;
    pending: boolean;
    available: boolean;
  }>({
    approved: true,
    recommended: true,
    pending: true,
    available: true,
  });

  const toggleStatus = (key: keyof typeof filterStatuses) => {
    setFilterStatuses((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Scroll refs for Day & Week views
  const dayScrollRef = useRef<HTMLDivElement>(null);
  const weekScrollRef = useRef<HTMLDivElement>(null);

  // Calendar starts at top (00:00) so users immediately see the full 24-hour schedule
  useEffect(() => {
    if (dayScrollRef.current) {
      dayScrollRef.current.scrollTop = 0;
    }
    if (weekScrollRef.current) {
      weekScrollRef.current.scrollTop = 0;
    }
  }, [activeViewMode]);

  // Auth Gate for Guest slot click
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [targetSlot, setTargetSlot] = useState<{
    roomId: string;
    roomName: string;
    date: string;
    startTime: string;
    endTime: string;
  } | null>(null);

  const handleSlotClick = (
    e: React.MouseEvent,
    roomId: string,
    roomName: string,
    date: string,
    startTime: string,
    endTime: string
  ) => {
    if (isGuest) {
      e.preventDefault();
      setTargetSlot({ roomId, roomName, date, startTime, endTime });
      setAuthGateOpen(true);
    }
  };

  // Navigate Date (timezone-safe)
  const handlePrev = () => {
    if (activeViewMode === 'day') {
      setCurrentDateStr((prev) => addDaysToDateStr(prev, -1));
    } else if (activeViewMode === 'week') {
      setCurrentDateStr((prev) => addDaysToDateStr(prev, -7));
    } else if (activeViewMode === 'month') {
      setCurrentDateStr((prev) => addMonthsToDateStr(prev, -1));
    }
  };

  const handleNext = () => {
    if (activeViewMode === 'day') {
      setCurrentDateStr((prev) => addDaysToDateStr(prev, 1));
    } else if (activeViewMode === 'week') {
      setCurrentDateStr((prev) => addDaysToDateStr(prev, 7));
    } else if (activeViewMode === 'month') {
      setCurrentDateStr((prev) => addMonthsToDateStr(prev, 1));
    }
  };

  const handleToday = () => {
    setCurrentDateStr(todayDateStr);
  };

  // Helper for room category
  const getRoomCategory = (r: Room) => {
    const name = (r.name || '').toLowerCase();
    const code = (r.code || '').toLowerCase();
    if (name.includes('pbl') || name.includes('tutorial')) return 'tutorial';
    if (name.includes('skills') || name.includes('skilss')) return 'skills';
    if (name.includes('cbt')) return 'cbt';
    if (name.includes('auditorium') || name.includes('ar-rahman') || name.includes('ar-razi')) return 'auditorium';
    if (name.includes('kuliah') || code.startsWith('uy') || code.startsWith('fk') || code.startsWith('fti')) return 'classroom';
    if (name.includes('senat') || name.includes('seminar') || name.includes('rapat') || name.includes('rektorat')) return 'meeting';
    if (name.includes('lab') || name.includes('anatomi') || name.includes('komputer')) return 'lab';
    return 'other';
  };

  // Distinct sorted floors from rooms
  const sortedFloors = Array.from(
    new Set(
      rooms
        .map((r) => (r.floorName ? String(r.floorName) : r.floor !== undefined && r.floor !== null ? String(r.floor) : ''))
        .filter(Boolean)
    )
  ).sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    if (aLower === 'basement') return -1;
    if (bLower === 'basement') return 1;
    if (aLower === 'dasar') return -1;
    if (bLower === 'dasar') return 1;
    const aNum = Number(a.replace(/\D/g, ''));
    const bNum = Number(b.replace(/\D/g, ''));
    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
    return a.localeCompare(b);
  });

  // Filtered rooms
  const filteredRooms = rooms.filter((r) => {
    if (selectedFloor !== 'all') {
      const roomFloor = r.floorName ? String(r.floorName) : r.floor !== undefined && r.floor !== null ? String(r.floor) : '';
      if (roomFloor !== selectedFloor) return false;
    }
    if (selectedRoomFilter !== 'all' && r.id !== selectedRoomFilter) return false;
    if (searchRoom.trim()) {
      const q = searchRoom.trim().toLowerCase();
      const nameMatch = (r.name || '').toLowerCase().includes(q);
      const codeMatch = (r.code || '').toLowerCase().includes(q);
      if (!nameMatch && !codeMatch) return false;
    }
    return true;
  });

  // Active room for selected room views
  const activeRoom = filteredRooms.find((r) => r.id === activeRoomId) || rooms.find((r) => r.id === activeRoomId) || filteredRooms[0] || rooms[0];

  // Day number for academic block checks (1-7)
  const currentDayNum = getDayOfWeekNumber(currentDateStr);


  // Open modal handler
  const handleOpenBooking = (b: Booking) => {
    setSelectedBooking(b);
    setSelectedAcademic(null);
    setModalOpen(true);
  };

  const handleOpenAcademic = (ab: AcademicBlock) => {
    setSelectedAcademic(ab);
    setSelectedBooking(null);
    setModalOpen(true);
  };

  const currentMonthDate = new Date(currentDateStr + 'T00:00:00');

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* Top Header & Controls - Google Calendar Style */}
      <div className="w-full bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Date Navigator & Ruangan Dropdown */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={handleToday}
            className="border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2 rounded-full transition-all shadow-xs"
          >
            Hari ini
          </button>
          <div className="flex items-center">
            <button
              type="button"
              onClick={handlePrev}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
              title={
                activeViewMode === 'day'
                  ? 'Hari Sebelumnya'
                  : activeViewMode === 'week'
                    ? 'Minggu Sebelumnya'
                    : 'Bulan Sebelumnya'
              }
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
              title={
                activeViewMode === 'day'
                  ? 'Hari Berikutnya'
                  : activeViewMode === 'week'
                    ? 'Minggu Berikutnya'
                    : 'Bulan Berikutnya'
              }
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-800 tracking-tight">
              {activeViewMode === 'day' && formatDateIndo(currentDateStr)}
              {activeViewMode === 'week' &&
                weekDates.length > 0 &&
                `${formatShortDateIndo(weekDates[0])} – ${formatShortDateIndo(weekDates[weekDates.length - 1])}`}
              {activeViewMode === 'month' &&
                `${MONTH_NAMES[currentMonthDate.getMonth()]} ${currentMonthDate.getFullYear()}`}
            </h2>
            <p className="text-[11px] text-slate-500">
              {selectedFloor === 'all'
                ? `Semua Ruangan Kampus YARSI (${filteredRooms.length} Ruang)`
                : `${formatFloorFilterLabel(selectedFloor)} (${filteredRooms.length} Ruang)`}
            </p>
          </div>

          {/* Ruangan Searchable Dropdown - Dekat dengan Tanggal */}
          <div className="relative" ref={roomDropdownRef}>
            <button
              type="button"
              onClick={() => setIsRoomDropdownOpen(!isRoomDropdownOpen)}
              className="flex items-center gap-2 text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full px-4 py-2 text-slate-700 transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
              aria-label="Pilih Ruangan"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="max-w-[130px] sm:max-w-[180px] truncate">
                {selectedRoomObj
                  ? selectedRoomObj.code
                    ? `${selectedRoomObj.name} (${selectedRoomObj.code})`
                    : selectedRoomObj.name
                  : 'Ruangan'}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isRoomDropdownOpen ? 'rotate-180' : ''
                  }`}
              />
            </button>

            {isRoomDropdownOpen && (
              <div className="absolute left-0 mt-2 w-72 sm:w-84 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 p-3">
                {/* Search Bar inside Ruangan dropdown */}
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Cari ruangan atau kode..."
                    value={searchRoom}
                    onChange={(e) => setSearchRoom(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-8 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    autoFocus
                  />
                  {searchRoom && (
                    <button
                      type="button"
                      onClick={() => setSearchRoom('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Options List */}
                <div className="max-h-60 overflow-y-auto space-y-1 divide-y divide-slate-50 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
                  {/* Option: Semua Ruangan */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRoomFilter('all');
                      setSearchRoom('');
                      setIsRoomDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${selectedRoomFilter === 'all'
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                      }`}
                  >
                    <span>Semua Ruangan</span>
                    {selectedRoomFilter === 'all' && (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                  </button>

                  {/* Filtered Rooms List */}
                  {rooms
                    .filter((r) => {
                      if (selectedFloor !== 'all') {
                        const roomFloor = r.floorName ? String(r.floorName) : r.floor !== undefined && r.floor !== null ? String(r.floor) : '';
                        if (roomFloor !== selectedFloor) return false;
                      }
                      if (!searchRoom.trim()) return true;
                      const q = searchRoom.trim().toLowerCase();
                      return (
                        (r.name || '').toLowerCase().includes(q) ||
                        (r.code || '').toLowerCase().includes(q)
                      );
                    })
                    .map((r) => {
                      const isSelected = selectedRoomFilter === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            setSelectedRoomFilter(r.id);
                            setIsRoomDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${isSelected
                            ? 'bg-emerald-50 text-emerald-900 font-bold'
                            : 'text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="truncate font-semibold text-slate-800">{r.name}</p>
                              {r.code && (
                                <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                                  {r.code}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                              {r.floorName ? `Lt. ${r.floorName}` : r.floor !== undefined && r.floor !== null ? `Lt. ${r.floor}` : ''}
                              {r.building ? ` · ${r.building}` : ''}
                              {r.capacity ? ` · Kap. ${r.capacity} orang` : ''}
                            </p>
                          </div>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Lantai Dropdown - Disamping Ruangan */}
          <div className="relative" ref={floorDropdownRef}>
            <button
              type="button"
              onClick={() => setIsFloorDropdownOpen(!isFloorDropdownOpen)}
              className="flex items-center gap-2 text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full px-4 py-2 text-slate-700 transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
              aria-label="Pilih Lantai"
            >
              <Rows3 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="max-w-[120px] truncate">
                {selectedFloor === 'all'
                  ? 'Lantai'
                  : formatFloorFilterLabel(selectedFloor)}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isFloorDropdownOpen ? 'rotate-180' : ''
                  }`}
              />
            </button>

            {isFloorDropdownOpen && (
              <div className="absolute left-0 mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 p-2 max-h-72 overflow-y-auto space-y-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
                {/* Option: Semua Lantai */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFloor('all');
                    setIsFloorDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${selectedFloor === 'all'
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <Rows3 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Semua Lantai</span>
                  </div>
                  {selectedFloor === 'all' && (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                </button>

                {sortedFloors.map((fl) => {
                  const isSelected = selectedFloor === fl;
                  const roomCountOnFloor = rooms.filter((r) => {
                    const rFl = r.floorName ? String(r.floorName) : r.floor !== undefined && r.floor !== null ? String(r.floor) : '';
                    return rFl === fl;
                  }).length;

                  return (
                    <button
                      key={fl}
                      type="button"
                      onClick={() => {
                        setSelectedFloor(fl);
                        if (selectedRoomObj) {
                          const rFl = selectedRoomObj.floorName ? String(selectedRoomObj.floorName) : selectedRoomObj.floor !== undefined && selectedRoomObj.floor !== null ? String(selectedRoomObj.floor) : '';
                          if (rFl !== fl) {
                            setSelectedRoomFilter('all');
                          }
                        }
                        setIsFloorDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${isSelected
                          ? 'bg-emerald-50 text-emerald-900 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <Rows3 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-700' : 'text-slate-400'}`} />
                        <span>{formatFloorFilterLabel(fl)}</span>
                        <span className="text-[10px] text-slate-400">
                          ({roomCountOnFloor} ruang)
                        </span>
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: View Mode Toggle: Google Calendar Segmented Style */}
        <div className="flex items-center bg-slate-100 p-1 rounded-full border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setViewMode('day')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all duration-150 ${activeViewMode === 'day'
              ? 'bg-emerald-700 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Hari</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all duration-150 ${activeViewMode === 'week'
              ? 'bg-emerald-700 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>Minggu</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('month')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all duration-150 ${activeViewMode === 'month'
              ? 'bg-emerald-700 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Bulan</span>
          </button>
        </div>
      </div>

      {publicSchedule.error && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 sm:flex-row sm:items-center sm:justify-between">
          <span>Jadwal publik tidak dapat dimuat. Kalender menampilkan data terakhir jika tersedia.</span>
          <button type="button" onClick={publicSchedule.retry} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-rose-700 px-4 font-bold text-white hover:bg-rose-800">
            Coba Lagi
          </button>
        </div>
      )}
      {publicSchedule.isLoading && publicSchedule.events.length === 0 && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-xs font-semibold text-emerald-800" role="status" aria-live="polite">
          Memuat jadwal publik...
        </div>
      )}

      {/* Interactive Legend & Filter Toggles */}
      <div className="flex flex-wrap items-center gap-2 px-1 text-xs">
        <span className="font-bold text-slate-700 mr-1 flex items-center gap-1">
          <span>Keterangan & Filter:</span>
        </span>

        {/* 1. Disetujui / terjadwal */}
        <button
          type="button"
          onClick={() => toggleStatus('approved')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-2xs border cursor-pointer ${filterStatuses.approved
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-1 ring-emerald-500/30'
            : 'bg-slate-100 border-slate-200 text-slate-400 opacity-60'
            }`}
          title={filterStatuses.approved ? 'Status aktif. Klik untuk sembunyikan.' : 'Status nonaktif. Klik untuk tampilkan.'}
        >
          <span className={`w-3 h-3 rounded-full inline-block ${filterStatuses.approved ? 'bg-emerald-600' : 'bg-slate-300'}`} />
          <span>Disetujui / terjadwal</span>
          {filterStatuses.approved && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded-full">✓ Aktif</span>}
        </button>

        {/* 2. Rekomendasi Yayasan */}
        <button
          type="button"
          onClick={() => toggleStatus('recommended')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-2xs border cursor-pointer ${filterStatuses.recommended
            ? 'bg-sky-50 border-sky-300 text-sky-900 ring-1 ring-sky-500/30'
            : 'bg-slate-100 border-slate-200 text-slate-400 opacity-60'
            }`}
          title={filterStatuses.recommended ? 'Status aktif. Klik untuk sembunyikan.' : 'Status nonaktif. Klik untuk tampilkan.'}
        >
          <span className={`w-3 h-3 rounded-full inline-block ${filterStatuses.recommended ? 'bg-sky-500' : 'bg-slate-300'}`} />
          <span>Rekomendasi Yayasan</span>
          {filterStatuses.recommended && <span className="text-[10px] font-bold text-sky-700 bg-sky-100/80 px-1.5 py-0.2 rounded-full">✓ Aktif</span>}
        </button>

        {/* 3. Menunggu persetujuan */}
        <button
          type="button"
          onClick={() => toggleStatus('pending')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-2xs border cursor-pointer ${filterStatuses.pending
            ? 'bg-amber-50 border-amber-300 text-amber-900 ring-1 ring-amber-500/30'
            : 'bg-slate-100 border-slate-200 text-slate-400 opacity-60'
            }`}
          title={filterStatuses.pending ? 'Status aktif. Klik untuk sembunyikan.' : 'Status nonaktif. Klik untuk tampilkan.'}
        >
          <span className={`w-3 h-3 rounded-full inline-block ${filterStatuses.pending ? 'bg-amber-400' : 'bg-slate-300'}`} />
          <span>Menunggu persetujuan</span>
          {filterStatuses.pending && <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.2 rounded-full">✓ Aktif</span>}
        </button>

        {/* 4. Tersedia untuk dipinjam */}
        <button
          type="button"
          onClick={() => toggleStatus('available')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-2xs border cursor-pointer ${filterStatuses.available
            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 ring-1 ring-emerald-500/30'
            : 'bg-slate-100 border-slate-200 text-slate-400 opacity-60'
            }`}
          title={filterStatuses.available ? 'Slot tersedia aktif. Klik untuk sembunyikan.' : 'Slot tersedia nonaktif. Klik untuk tampilkan.'}
        >
          <span className={`w-3 h-3 rounded border border-dashed border-emerald-500 inline-block ${filterStatuses.available ? 'bg-emerald-100' : 'bg-slate-200'}`} />
          <span>Tersedia untuk dipinjam</span>
          {filterStatuses.available && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded-full">✓ Aktif</span>}
        </button>
      </div>

      {/* VIEW 1: DAY VIEW - GOOGLE CALENDAR STYLE */}
      {activeViewMode === 'day' && (
        <div className="w-full min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Scrollable Container for Day View */}
          <div ref={dayScrollRef} className="max-h-[600px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400">
            {/* Header Row: Timezone & Day Header */}
            <div className="grid grid-cols-[72px_1fr] sm:grid-cols-[84px_1fr] border-b border-slate-200 bg-white sticky top-0 z-20 shadow-xs">
              <div className="p-3 text-[11px] font-semibold text-slate-400 border-r border-slate-200 flex items-center justify-center bg-white">
                WIB
              </div>
              <div className="py-3 px-4 flex items-center gap-3 bg-white">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shadow-xs ${currentDateStr === todayDateStr
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-100 text-slate-800'
                    }`}
                >
                  {new Date(`${currentDateStr}T00:00:00`).getDate()}
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {new Date(`${currentDateStr}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long' })}
                  </span>
                  <p className="text-xs text-slate-400">
                    {formatDateIndo(currentDateStr)}
                  </p>
                </div>
              </div>
            </div>

            {/* Timeline Grid */}
            <div className="divide-y divide-slate-100 relative">
              {TIME_SLOTS.map((slot) => {
                const nextH = getNextSlotTime(slot);

                const slotAcademics = academicBlocks.filter(
                  (ab) =>
                    ab.isActive &&
                    ab.dayOfWeek === currentDayNum &&
                    checkTimeOverlap(slot, nextH, ab.startTime, ab.endTime),
                );

                const slotBookings = bookings.filter((b) => {
                  if (b.date !== currentDateStr) return false;
                  if (
                    ![
                      'APPROVED',
                      'PENDING',
                      'RECOMMENDED',
                      'PENDING_LPF',
                      'RECOMMENDED_YAYASAN',
                    ].includes(b.status)
                  )
                    return false;
                  if (!checkTimeOverlap(slot, nextH, b.startTime, b.endTime)) return false;

                  const isAppr = b.status === 'APPROVED';
                  const isRec =
                    b.status === 'RECOMMENDED' || b.status === 'RECOMMENDED_YAYASAN';
                  const isPend =
                    b.status === 'PENDING' || b.status === 'PENDING_LPF';

                  if (isAppr && !filterStatuses.approved) return false;
                  if (isRec && !filterStatuses.recommended) return false;
                  if (isPend && !filterStatuses.pending) return false;

                  // Respect room filters if applied
                  if (selectedRoomFilter !== 'all' && b.roomId !== selectedRoomFilter) {
                    return false;
                  }
                  if (searchRoom.trim()) {
                    const room = rooms.find((r) => r.id === b.roomId);
                    if (room) {
                      const q = searchRoom.trim().toLowerCase();
                      const nameMatch = (room.name || '').toLowerCase().includes(q);
                      const codeMatch = (room.code || '').toLowerCase().includes(q);
                      if (!nameMatch && !codeMatch) return false;
                    }
                  }
                  return true;
                });

                return (
                  <div
                    key={slot}
                    className="grid grid-cols-[72px_1fr] sm:grid-cols-[84px_1fr] min-h-[56px] group hover:bg-slate-50/40 transition-colors"
                  >
                    {/* Left Time Axis */}
                    <div className="p-2 border-r border-slate-200 bg-slate-50/50 flex items-start justify-center text-[11px] font-mono font-semibold text-slate-400">
                      {slot}
                    </div>

                    {/* Right Event Column */}
                    <div className="p-1.5 flex flex-wrap gap-2 items-center">
                      {slotAcademics.map((academic) => (
                        <button
                          key={academic.id}
                          type="button"
                          onClick={() => handleOpenAcademic(academic)}
                          className="flex-1 min-w-[240px] text-left p-2 rounded-r-lg border-l-4 border-purple-600 bg-purple-50 hover:bg-purple-100 text-purple-950 shadow-xs transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-slate-900 line-clamp-1">
                              {academic.roomName || 'Ruang Kuliah'}
                            </p>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-200 text-purple-900">
                              Kuliah
                            </span>
                          </div>
                          <p className="text-[11px] text-purple-800 font-medium line-clamp-1">
                            {academic.title}
                          </p>
                          <span className="font-mono text-[10px] text-purple-600">
                            {academic.startTime} - {academic.endTime}
                          </span>
                        </button>
                      ))}

                      {slotBookings.map((booking) => {
                        const isApproved = booking.status === 'APPROVED';
                        const isRecommended =
                          booking.status === 'RECOMMENDED' ||
                          booking.status === 'RECOMMENDED_YAYASAN';

                        return (
                          <button
                            key={booking.id}
                            type="button"
                            onClick={() => handleOpenBooking(booking)}
                            className={`flex-1 min-w-[240px] text-left p-2 rounded-r-lg border-l-4 shadow-xs transition-colors ${isApproved
                              ? 'border-emerald-600 bg-emerald-50 hover:bg-emerald-100 text-emerald-950'
                              : isRecommended
                                ? 'border-sky-500 bg-sky-50 hover:bg-sky-100 text-sky-950'
                                : 'border-amber-500 bg-amber-50 hover:bg-amber-100 text-amber-950'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-slate-900 line-clamp-1">
                                {(() => {
                                  const r = rooms.find((rm) => rm.id === booking.roomId);
                                  return r?.code ? `${booking.roomName || r.name} (${r.code})` : (booking.roomName || 'Ruangan Kampus');
                                })()}
                              </p>
                              <span
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isApproved
                                  ? 'bg-emerald-200 text-emerald-900'
                                  : isRecommended
                                    ? 'bg-sky-200 text-sky-900'
                                    : 'bg-amber-200 text-amber-900'
                                  }`}
                              >
                                {isApproved
                                  ? 'Disetujui'
                                  : isRecommended
                                    ? 'Rekomendasi Yayasan'
                                    : 'Menunggu'}
                              </span>
                            </div>
                            {booking.title && (
                              <p className="text-[11px] text-slate-600 line-clamp-1">
                                {booking.title}
                              </p>
                            )}
                            <span className="font-mono text-[10px] text-slate-500">
                              {booking.startTime} - {booking.endTime}
                            </span>
                          </button>
                        );
                      })}

                      {/* Tombol Pinjam Ruang Lain jika sudah ada ruangan yang terisi di jam ini */}
                      {(slotAcademics.length > 0 || slotBookings.length > 0) && filterStatuses.available && (
                        <a
                          href={`/dashboard/booking/new?date=${currentDateStr}&startTime=${slot}&endTime=${nextH}`}
                          onClick={(e) =>
                            handleSlotClick(e, '', '', currentDateStr, slot, nextH)
                          }
                          className="h-9 px-3 rounded-lg border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 flex items-center gap-1.5 text-xs font-medium transition-colors shadow-2xs whitespace-nowrap"
                          title={`Pinjam ruangan lain di jam ${slot} - ${nextH}`}
                        >
                          <Plus className="w-3.5 h-3.5 text-emerald-600" />
                          <span>+ Pinjam Ruang Lain</span>
                        </a>
                      )}

                      {slotAcademics.length === 0 && slotBookings.length === 0 && filterStatuses.available && (
                        <a
                          href={`/dashboard/booking/new?date=${currentDateStr}&startTime=${slot}&endTime=${nextH}`}
                          onClick={(e) =>
                            handleSlotClick(e, '', '', currentDateStr, slot, nextH)
                          }
                          className="w-full h-full min-h-[40px] rounded-lg border border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/40 flex items-center px-3 text-[11px] text-slate-500 hover:text-emerald-700 transition-colors"
                        >
                          <span className="w-2.5 h-2.5 rounded border border-dashed border-emerald-500 mr-2 shrink-0" />
                          <span className="font-medium">
                            Tersedia untuk dipinjam ({slot} - {nextH})
                          </span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: WEEKLY VIEW - GOOGLE CALENDAR STYLE */}
      {activeViewMode === 'week' && (
        <div className="space-y-4">
          {/* Mobile Accordion */}
          <div className="space-y-3 md:hidden">
            {weekDates.map((dayDateStr) => {
              const dayNum = getDayOfWeekNumber(dayDateStr);
              const dayBookings = bookings
                .filter((booking) => {
                  if (booking.date !== dayDateStr) return false;
                  if (
                    ![
                      'APPROVED',
                      'PENDING',
                      'RECOMMENDED',
                      'PENDING_LPF',
                      'RECOMMENDED_YAYASAN',
                    ].includes(booking.status)
                  )
                    return false;

                  const isAppr = booking.status === 'APPROVED';
                  const isRec =
                    booking.status === 'RECOMMENDED' ||
                    booking.status === 'RECOMMENDED_YAYASAN';
                  const isPend =
                    booking.status === 'PENDING' || booking.status === 'PENDING_LPF';

                  if (isAppr && !filterStatuses.approved) return false;
                  if (isRec && !filterStatuses.recommended) return false;
                  if (isPend && !filterStatuses.pending) return false;

                  return true;
                })
                .map((booking) => ({ kind: 'booking' as const, item: booking }));
              const dayAcademic = academicBlocks
                .filter(
                  (block) =>
                    block.isActive &&
                    block.dayOfWeek === dayNum,
                )
                .map((block) => ({ kind: 'academic' as const, item: block }));
              const dayAgenda = [...dayBookings, ...dayAcademic].sort((a, b) =>
                a.item.startTime.localeCompare(b.item.startTime),
              );

              return (
                <section
                  key={dayDateStr}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  <div
                    className={`flex items-center justify-between border-b px-4 py-3 ${dayDateStr === todayDateStr
                      ? 'border-emerald-200 bg-emerald-50/70'
                      : 'border-slate-100'
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${dayDateStr === todayDateStr
                          ? 'bg-emerald-700 text-white'
                          : 'bg-slate-100 text-slate-800'
                          }`}
                      >
                        {new Date(`${dayDateStr}T00:00:00`).getDate()}
                      </div>
                      <h3 className="text-xs font-bold text-slate-900">
                        {formatDateIndo(dayDateStr)}
                      </h3>
                    </div>
                    {dayDateStr === todayDateStr && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                        Hari ini
                      </span>
                    )}
                  </div>
                  {dayAgenda.length ? (
                    <div className="divide-y divide-slate-100">
                      {dayAgenda.map((entry) => (
                        <button
                          key={`${entry.kind}-${entry.item.id}`}
                          type="button"
                          onClick={() =>
                            entry.kind === 'booking'
                              ? handleOpenBooking(entry.item)
                              : handleOpenAcademic(entry.item)
                          }
                          className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                        >
                          <span className="w-[74px] shrink-0 font-mono text-xs font-bold text-slate-700">
                            {entry.item.startTime}–{entry.item.endTime}
                          </span>
                          <span
                            className={`h-8 w-1 shrink-0 rounded-full ${entry.kind === 'academic'
                              ? 'bg-purple-500'
                              : entry.item.status === 'APPROVED'
                                ? 'bg-emerald-500'
                                : 'bg-amber-500'
                              }`}
                            aria-hidden="true"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="truncate text-xs font-bold text-slate-900 block">
                              {(() => {
                                if (entry.kind === 'booking') {
                                  const r = rooms.find((rm) => rm.id === entry.item.roomId);
                                  return r?.code ? `${entry.item.roomName} (${r.code})` : entry.item.roomName;
                                }
                                return entry.item.roomName;
                              })()}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {entry.item.title || 'Terjadwal'}
                            </span>
                          </div>
                          <ChevronRight
                            className="h-4 w-4 shrink-0 text-slate-300"
                            aria-hidden="true"
                          />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-xs text-slate-400 italic">
                      Tidak ada peminjaman ruangan
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          {/* Desktop Google Calendar Week Grid */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            {/* Scrollable Container for Week View */}
            <div ref={weekScrollRef} className="overflow-auto max-h-[600px] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400">
              <div className="min-w-[900px]">
                {/* Header Row: 7 Days Google Calendar Style */}
                <div
                  className="grid border-b border-slate-200 bg-white sticky top-0 z-20 shadow-xs"
                  style={{
                    gridTemplateColumns: '72px repeat(7, minmax(110px, 1fr))',
                  }}
                >
                  <div className="p-3 font-semibold text-[11px] text-slate-400 border-r border-slate-200 flex items-center justify-center sticky left-0 top-0 bg-white z-30">
                    WIB
                  </div>
                  {weekDates.map((dayDateStr) => {
                    const isToday = dayDateStr === todayDateStr;
                    const dateObj = new Date(`${dayDateStr}T00:00:00`);
                    const dayAbbr = dateObj.toLocaleDateString('id-ID', { weekday: 'short' }).toUpperCase();
                    const dayNum = dateObj.getDate();

                    return (
                      <div
                        key={dayDateStr}
                        className={`p-2.5 text-center border-r border-slate-200 last:border-r-0 bg-white ${isToday ? 'bg-emerald-50/40' : ''
                          }`}
                      >
                        <p className={`text-[11px] font-semibold uppercase tracking-wider ${isToday ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                          {dayAbbr}
                        </p>
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm mx-auto mt-0.5 ${isToday
                            ? 'bg-emerald-700 text-white font-bold shadow-xs'
                            : 'text-slate-800 font-semibold hover:bg-slate-100'
                            }`}
                        >
                          {dayNum}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Time Slot Rows for Week */}
                <div className="divide-y divide-slate-100">
                  {TIME_SLOTS.map((slot) => {
                    const nextH = getNextSlotTime(slot);

                    return (
                      <div
                        key={slot}
                        className="grid min-h-[56px]"
                        style={{
                          gridTemplateColumns: '72px repeat(7, minmax(110px, 1fr))',
                        }}
                      >
                        <div className="p-2 border-r border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-[11px] font-mono font-semibold text-slate-400 sticky left-0 z-10">
                          {slot}
                        </div>

                        {weekDates.map((dayDateStr) => {
                          const dayNum = getDayOfWeekNumber(dayDateStr);
                          const academicList = academicBlocks.filter(
                            (ab) =>
                              ab.isActive &&
                              ab.dayOfWeek === dayNum &&
                              checkTimeOverlap(slot, nextH, ab.startTime, ab.endTime),
                          );

                          const bookingList = bookings.filter((b) => {
                            if (b.date !== dayDateStr) return false;
                            if (
                              ![
                                'APPROVED',
                                'PENDING',
                                'RECOMMENDED',
                                'PENDING_LPF',
                                'RECOMMENDED_YAYASAN',
                              ].includes(b.status)
                            )
                              return false;
                            if (!checkTimeOverlap(slot, nextH, b.startTime, b.endTime)) return false;

                            const isAppr = b.status === 'APPROVED';
                            const isRec =
                              b.status === 'RECOMMENDED' ||
                              b.status === 'RECOMMENDED_YAYASAN';
                            const isPend =
                              b.status === 'PENDING' || b.status === 'PENDING_LPF';

                            if (isAppr && !filterStatuses.approved) return false;
                            if (isRec && !filterStatuses.recommended) return false;
                            if (isPend && !filterStatuses.pending) return false;

                            // Room filter
                            if (selectedRoomFilter !== 'all' && b.roomId !== selectedRoomFilter) {
                              return false;
                            }
                            if (searchRoom.trim()) {
                              const room = rooms.find((r) => r.id === b.roomId);
                              if (room) {
                                const q = searchRoom.trim().toLowerCase();
                                const nameMatch = (room.name || '').toLowerCase().includes(q);
                                const codeMatch = (room.code || '').toLowerCase().includes(q);
                                if (!nameMatch && !codeMatch) return false;
                              }
                            }

                            return true;
                          });

                          return (
                            <div
                              key={dayDateStr}
                              className="p-1 border-r border-slate-100 last:border-r-0 group hover:bg-slate-50/60 transition-colors flex flex-col justify-between"
                            >
                              <div className="space-y-1 w-full">
                                {academicList.map((academic) => (
                                  <button
                                    key={academic.id}
                                    type="button"
                                    onClick={() => handleOpenAcademic(academic)}
                                    className="w-full p-1.5 text-left bg-purple-50 hover:bg-purple-100 border-l-[3px] border-purple-600 rounded-r-md text-purple-950 shadow-2xs block"
                                  >
                                    <p className="text-[10px] font-bold line-clamp-1">
                                      {academic.roomName || academic.title}
                                    </p>
                                    <p className="text-[9px] text-purple-700 font-mono">
                                      {academic.startTime} - {academic.endTime}
                                    </p>
                                  </button>
                                ))}

                                {bookingList.map((booking) => {
                                  const isApproved = booking.status === 'APPROVED';
                                  const isRecommended =
                                    booking.status === 'RECOMMENDED' ||
                                    booking.status === 'RECOMMENDED_YAYASAN';

                                  return (
                                    <button
                                      key={booking.id}
                                      type="button"
                                      onClick={() => handleOpenBooking(booking)}
                                      className={`w-full p-1.5 text-left rounded-r-md border-l-[3px] shadow-2xs block transition-colors ${isApproved
                                        ? 'border-emerald-600 bg-emerald-50 hover:bg-emerald-100 text-emerald-950'
                                        : isRecommended
                                          ? 'border-sky-500 bg-sky-50 hover:bg-sky-100 text-sky-950'
                                          : 'border-amber-500 bg-amber-50 hover:bg-amber-100 text-amber-950'
                                        }`}
                                    >
                                      <p className="text-[10px] font-bold line-clamp-1">
                                        {(() => {
                                          const r = rooms.find((rm) => rm.id === booking.roomId);
                                          return r?.code ? `${booking.roomName} (${r.code})` : booking.roomName;
                                        })()}
                                      </p>
                                      <p className="text-[9px] opacity-80 font-mono">
                                        {booking.startTime} - {booking.endTime}
                                      </p>
                                    </button>
                                  );
                                })}
                              </div>

                              <a
                                href={`/dashboard/booking/new?date=${dayDateStr}&startTime=${slot}&endTime=${nextH}`}
                                onClick={(e) =>
                                  handleSlotClick(
                                    e,
                                    '',
                                    'Ruangan',
                                    dayDateStr,
                                    slot,
                                    nextH,
                                  )
                                }
                                className={`w-full text-center py-1 rounded border border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-[9px] text-slate-400 hover:text-emerald-700 transition-colors block ${academicList.length > 0 || bookingList.length > 0
                                  ? 'mt-1 opacity-0 group-hover:opacity-100'
                                  : 'min-h-[44px] flex items-center justify-center'
                                  }`}
                                title={`Pinjam ruangan di jam ${slot} - ${nextH}`}
                              >
                                + Slot
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: MONTHLY VIEW FULL GRID */}
      {activeViewMode === 'month' && (
        <CalendarGrid
          rooms={filteredRooms}
          bookings={bookings.filter((b) => {
            const isAppr = b.status === 'APPROVED';
            const isRec =
              b.status === 'RECOMMENDED' || b.status === 'RECOMMENDED_YAYASAN';
            const isPend =
              b.status === 'PENDING' || b.status === 'PENDING_LPF';

            if (isAppr && !filterStatuses.approved) return false;
            if (isRec && !filterStatuses.recommended) return false;
            if (isPend && !filterStatuses.pending) return false;

            // Room filter
            if (selectedRoomFilter !== 'all' && b.roomId !== selectedRoomFilter) {
              return false;
            }
            if (searchRoom.trim()) {
              const room = rooms.find((r) => r.id === b.roomId);
              if (room) {
                const q = searchRoom.trim().toLowerCase();
                const nameMatch = (room.name || '').toLowerCase().includes(q);
                const codeMatch = (room.code || '').toLowerCase().includes(q);
                if (!nameMatch && !codeMatch) return false;
              }
            }

            return true;
          })}
          academicBlocks={academicBlocks}
          selectedDateStr={currentDateStr}
          hideHeader={true}
          onSelectDate={(date) => {
            setCurrentDateStr(date);
            setViewMode('day');
          }}
        />
      )}

      {/* Booking / Academic Detail Modal */}
      <EventDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        booking={selectedBooking}
        academicBlock={selectedAcademic}
      />

      {/* Auth Gate Modal for Guest Timeline Booking */}
      <AuthGateModal
        isOpen={authGateOpen}
        onClose={() => setAuthGateOpen(false)}
        targetRoomId={targetSlot?.roomId}
        targetRoomName={targetSlot?.roomName}
        targetDate={targetSlot?.date}
        targetStartTime={targetSlot?.startTime}
        targetEndTime={targetSlot?.endTime}
      />
    </div>
  );
}
