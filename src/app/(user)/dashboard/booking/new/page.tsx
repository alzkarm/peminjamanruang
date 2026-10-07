'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { ApiError, roomsApi, facilitiesApi } from '@/lib/api';
import { Booking, BookingCategory, BookingEquipment, BookingLogistikItem, Room, Facility } from '@/lib/types';
import { BookingSuccessModal } from '@/components/booking/BookingSuccessModal';
import { formatDateIndo, getJakartaDateTimeIso } from '@/lib/utils';
import {
  Calendar,
  Clock,
  Building2,
  AlertCircle,
  CheckCircle2,
  FileText,
  UploadCloud,
  ArrowRight,
  PackageCheck,
  Plus,
  Trash2,
  ChevronDown,
  Search,
  X,
  Repeat,
  CalendarRange,
} from 'lucide-react';
import Link from 'next/link';

interface EquipmentItem {
  id: string;
  name: string;
  category: string;
  isSpecial?: boolean;
  description?: string;
}

const STANDARD_EQUIPMENTS: EquipmentItem[] = [
  { id: 'eq-proj-laser', name: 'Laser Projector & Motorized Screen', category: 'audio_visual' },
  { id: 'eq-sound-mic', name: 'Wireless Microphone Set & Sound System', category: 'audio_visual' },
  { id: 'eq-hybrid-zoom', name: 'Hybrid Meeting / PTZ 4K Camera Kit', category: 'audio_visual' },
  { id: 'eq-extra-chairs', name: 'Kursi Tambahan Futura (50 Pcs)', category: 'furniture' },
  { id: 'eq-extra-tables', name: 'Meja Registrasi & Taplak Standar', category: 'furniture' },
  { id: 'eq-power-sockets', name: 'Colokan Listrik / Kabel Roll 10 Meter', category: 'connectivity' },
  { id: 'eq-podium-vip', name: 'Podium Resmi & Banner Stand', category: 'furniture' },
  { id: 'eq-videotron', name: 'Videotron LED Display 8x4m (Khusus Auditorium)', category: 'audio_visual', isSpecial: true },
];

const WEEKDAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

const WEEKDAY_ITEMS = [
  { id: 'Senin', short: 'Sen', full: 'Senin' },
  { id: 'Selasa', short: 'Sel', full: 'Selasa' },
  { id: 'Rabu', short: 'Rab', full: 'Rabu' },
  { id: 'Kamis', short: 'Kam', full: 'Kamis' },
  { id: 'Jumat', short: 'Jum', full: 'Jumat' },
  { id: 'Sabtu', short: 'Sab', full: 'Sabtu' },
  { id: 'Minggu', short: 'Min', full: 'Minggu' },
];

const INDO_DAYS_MAP: Record<number, string> = {
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
  0: 'Minggu',
};

function getConsecutiveDates(startDateStr: string, endDateStr: string): string[] {
  const result: string[] = [];
  if (!startDateStr || !endDateStr || endDateStr < startDateStr) return result;

  const [sYear, sMonth, sDay] = startDateStr.split('-').map(Number);
  const [eYear, eMonth, eDay] = endDateStr.split('-').map(Number);

  const current = new Date(sYear, sMonth - 1, sDay, 12, 0, 0);
  const end = new Date(eYear, eMonth - 1, eDay, 12, 0, 0);

  while (current <= end) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    result.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }
  return result;
}

function getRecurringDates(startDateStr: string, endDateStr: string, days: string[]): string[] {
  const result: string[] = [];
  if (!startDateStr || !endDateStr || endDateStr < startDateStr || days.length === 0) return result;

  const [sYear, sMonth, sDay] = startDateStr.split('-').map(Number);
  const [eYear, eMonth, eDay] = endDateStr.split('-').map(Number);

  const current = new Date(sYear, sMonth - 1, sDay, 12, 0, 0);
  const end = new Date(eYear, eMonth - 1, eDay, 12, 0, 0);

  while (current <= end) {
    const dayName = INDO_DAYS_MAP[current.getDay()];
    if (days.includes(dayName)) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      result.push(`${y}-${m}-${d}`);
    }
    current.setDate(current.getDate() + 1);
  }
  return result;
}

type AvailabilityState = 'available' | 'unavailable' | 'unknown';

interface RoomAvailability {
  state: AvailabilityState;
  conflicts?: Array<{ startTime: string; endTime: string; status: string }>;
}

function formatFloor(room: Room) {
  const floor = room.floorName || String(room.floor);
  return floor.toUpperCase() === 'BASEMENT' || floor.toLowerCase() === 'dasar'
    ? `Lantai ${floor}`
    : `Lantai ${floor}`;
}

function floorOrder(room: Room) {
  const floor = (room.floorName || String(room.floor)).toLowerCase();
  if (floor === 'basement') return -1;
  if (floor === 'dasar') return 0;
  const numericFloor = Number(floor.replace(/\D/g, ''));
  return Number.isFinite(numericFloor) ? numericFloor : room.floor;
}

function formatFloorFilterLabel(floor: string) {
  if (floor.toUpperCase() === 'BASEMENT') return 'BASEMENT';
  if (floor.toLowerCase() === 'dasar') return 'Dasar';
  return `Lantai ${floor}`;
}

function NewBookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { currentUser, addBooking } = useAppStore();

  // Prefilled params from URL
  const initialRoomId = searchParams.get('roomId') || '';
  const initialDate = searchParams.get('date') || '';
  const initialStartTime = searchParams.get('startTime') || '';
  const initialEndTime = searchParams.get('endTime') || '';

  // Form State
  const [roomId, setRoomId] = useState(initialRoomId);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isRoomsLoading, setIsRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [roomSearch, setRoomSearch] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [isRoomMenuOpen, setIsRoomMenuOpen] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(-1);
  const [availabilityByRoom, setAvailabilityByRoom] = useState<Record<string, RoomAvailability>>({});
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [availabilityRetry, setAvailabilityRetry] = useState(0);
  const roomSelectorRef = useRef<HTMLDivElement>(null);
  const availabilityRunRef = useRef(0);
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<BookingCategory>('seminar');
  const [description, setDescription] = useState('');
  const [estimatedAttendees, setEstimatedAttendees] = useState(50);
  const [isPerSemester, setIsPerSemester] = useState(false);
  const [repeatType, setRepeatType] = useState<'consecutive' | 'recurring'>('consecutive');
  const [tenggatPelaksanaan, setTenggatPelaksanaan] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Senin']);
  const [isDayDropdownOpen, setIsDayDropdownOpen] = useState(false);

  const computedDates = useMemo(() => {
    if (!isPerSemester || !date || !tenggatPelaksanaan || tenggatPelaksanaan < date) {
      return date ? [date] : [];
    }
    if (repeatType === 'consecutive') {
      return getConsecutiveDates(date, tenggatPelaksanaan);
    } else {
      return getRecurringDates(date, tenggatPelaksanaan, selectedDays);
    }
  }, [isPerSemester, date, tenggatPelaksanaan, repeatType, selectedDays]);

  useEffect(() => {
    if (date) {
      const day = formatDateIndo(date).split(',')[0];
      if (day && WEEKDAYS.includes(day)) {
        setSelectedDays((prev) => (prev.length <= 1 ? [day] : prev));
      }
    }
  }, [date]);

  const handleToggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day)
        ? prev.length > 1
          ? prev.filter((d) => d !== day)
          : prev
        : [...prev, day]
    );
  };

  const handleSelectAllWeekdays = () => {
    if (selectedDays.length === WEEKDAYS.length) {
      const currentDay = formatDateIndo(date).split(',')[0];
      setSelectedDays(WEEKDAYS.includes(currentDay) ? [currentDay] : ['Senin']);
    } else {
      setSelectedDays([...WEEKDAYS]);
    }
  };

  // Applicant info
  const [mounted, setMounted] = useState(false);
  const [userName, setUserName] = useState(currentUser?.name || '');
  const [userNimNidn, setUserNimNidn] = useState(currentUser?.identifier || '');
  const [userPhone, setUserPhone] = useState(currentUser?.phone || '');
  const [userOrganization, setUserOrganization] = useState(currentUser?.organization || '');
  const [department, setDepartment] = useState(currentUser?.department || '');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (currentUser && currentUser.role !== 'guest') {
      if (currentUser.name) setUserName(currentUser.name);
      if (currentUser.identifier) setUserNimNidn(currentUser.identifier);
      if (currentUser.phone) setUserPhone(currentUser.phone);
      if (currentUser.organization) setUserOrganization(currentUser.organization);
      if (currentUser.department) setDepartment(currentUser.department);
    }
  }, [currentUser]);

  // Facilities Checklist (Opsional, default kosong)
  const [selectedEquipments, setSelectedEquipments] = useState<
    Record<string, { selected: boolean; quantity: number; notes: string }>
  >({});

  // Dynamic Custom Logistics List (Opsional, default kosong)
  const [customLogistics, setCustomLogistics] = useState<BookingLogistikItem[]>([]);
  const [newLogistikItem, setNewLogistikItem] = useState('');
  const [newLogistikQty, setNewLogistikQty] = useState(1);
  const [newLogistikNotes, setNewLogistikNotes] = useState('');

  // Document Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  // Prioritas 5: Internal Approval Confirmation Checkbox
  const [isInternalApproved, setIsInternalApproved] = useState<boolean>(true);

  // Dynamic Facilities from Superadmin Master Data
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [isLoadingFacilities, setIsLoadingFacilities] = useState(true);

  // Success Modal State & Data
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadRooms = useCallback(async () => {
    setIsRoomsLoading(true);
    setRoomsError(null);
    setRooms([]);

    try {
      const data = await roomsApi.getAll();
      setRooms(data);
      if (initialRoomId && !data.some((room) => room.id === initialRoomId)) {
        setRoomId('');
        setErrorMessage('Ruangan dari tautan kalender tidak ditemukan atau sudah tidak aktif.');
      }
    } catch (err: any) {
      setRoomsError(err?.message || 'Daftar ruangan tidak dapat dimuat.');
    } finally {
      setIsRoomsLoading(false);
    }
  }, [initialRoomId]);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    async function loadFacilities() {
      try {
        const data = await facilitiesApi.getAll(true);
        if (data && data.length > 0) {
          setFacilities(data);
        }
      } catch (err) {
        console.warn('Gagal memuat master fasilitas, fallback ke standar:', err);
      } finally {
        setIsLoadingFacilities(false);
      }
    }
    loadFacilities();
  }, []);

  const dynamicEquipments = useMemo<EquipmentItem[]>(() => {
    if (facilities.length > 0) {
      return facilities.map((f) => ({
        id: f.id,
        name: f.name,
        category: f.category,
        isSpecial: f.isSpecial,
        description: f.description,
      }));
    }
    return STANDARD_EQUIPMENTS;
  }, [facilities]);

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (roomSelectorRef.current && !roomSelectorRef.current.contains(event.target as Node)) {
        setIsRoomMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, []);

  const hasCompleteSchedule = Boolean(date && startTime && endTime && startTime < endTime);
  const scheduleRange = useMemo(
    () =>
      hasCompleteSchedule
        ? { startTime: getJakartaDateTimeIso(date, startTime), endTime: getJakartaDateTimeIso(date, endTime) }
        : null,
    [date, endTime, hasCompleteSchedule, startTime]
  );

  const refreshAvailability = useCallback(() => {
    setAvailabilityRetry((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!scheduleRange || rooms.length === 0) {
      availabilityRunRef.current += 1;
      setAvailabilityByRoom({});
      setAvailabilityError(null);
      setIsAvailabilityLoading(false);
      return;
    }

    const runId = availabilityRunRef.current + 1;
    availabilityRunRef.current = runId;
    const results: Record<string, RoomAvailability> = {};
    let nextIndex = 0;
    let failedRequests = 0;

    setIsAvailabilityLoading(true);
    setAvailabilityError(null);
    setAvailabilityByRoom({});

    const worker = async () => {
      while (nextIndex < rooms.length) {
        const room = rooms[nextIndex++];
        try {
          const result = await roomsApi.checkAvailability(room.id, scheduleRange.startTime, scheduleRange.endTime);
          results[room.id] = {
            state: result.isAvailable ? 'available' : 'unavailable',
            conflicts: result.conflicts,
          };
        } catch {
          failedRequests += 1;
          results[room.id] = { state: 'unknown' };
        }
      }
    };

    void Promise.all(Array.from({ length: Math.min(8, rooms.length) }, worker)).then(() => {
      if (availabilityRunRef.current !== runId) return;
      setAvailabilityByRoom(results);
      setIsAvailabilityLoading(false);
      if (failedRequests > 0) {
        setAvailabilityError(
          failedRequests === rooms.length
            ? 'Ketersediaan ruangan tidak dapat dimuat. Silakan coba lagi.'
            : 'Sebagian status ketersediaan tidak dapat dimuat. Ruangan tanpa status tidak dapat dipilih.'
        );
      }
    });

    return () => {
      if (availabilityRunRef.current === runId) availabilityRunRef.current += 1;
    };
  }, [availabilityRetry, rooms, scheduleRange]);

  const floors = useMemo(
    () =>
      Array.from(new Set(rooms.map((room) => room.floorName || String(room.floor)))).sort((first, second) => {
        const firstRoom = rooms.find((room) => (room.floorName || String(room.floor)) === first);
        const secondRoom = rooms.find((room) => (room.floorName || String(room.floor)) === second);
        return (firstRoom ? floorOrder(firstRoom) : 0) - (secondRoom ? floorOrder(secondRoom) : 0);
      }),
    [rooms]
  );

  const matchingRooms = useMemo(() => {
    const normalizedQuery = roomSearch.trim().toLowerCase();
    return rooms
      .filter((room) => {
        const roomFloor = room.floorName || String(room.floor);
        const matchesFloor = selectedFloor === 'all' || roomFloor === selectedFloor;
        const matchesSearch =
          !normalizedQuery ||
          room.name.toLowerCase().includes(normalizedQuery) ||
          room.code.toLowerCase().includes(normalizedQuery);
        return matchesFloor && matchesSearch;
      })
      .filter((room) => {
        if (!hasCompleteSchedule || showUnavailable) return true;
        return availabilityByRoom[room.id]?.state === 'available';
      })
      .sort((first, second) => {
        const firstAvailability = availabilityByRoom[first.id]?.state;
        const secondAvailability = availabilityByRoom[second.id]?.state;
        const firstRank = firstAvailability === 'available' ? 0 : firstAvailability === 'unavailable' ? 1 : 2;
        const secondRank = secondAvailability === 'available' ? 0 : secondAvailability === 'unavailable' ? 1 : 2;
        return firstRank - secondRank || floorOrder(first) - floorOrder(second) || first.name.localeCompare(second.name, 'id');
      });
  }, [availabilityByRoom, hasCompleteSchedule, roomSearch, rooms, selectedFloor, showUnavailable]);

  const selectedRoom = rooms.find((room) => room.id === roomId);
  const selectedRoomAvailability = roomId ? availabilityByRoom[roomId] : undefined;

  const unavailableLabel = (availability?: RoomAvailability) => {
    const conflict = availability?.conflicts?.[0];
    if (!conflict) return 'Tidak tersedia';
    const now = Date.now();
    return new Date(conflict.startTime).getTime() <= now && new Date(conflict.endTime).getTime() > now
      ? 'Sedang Digunakan'
      : 'Sudah Dibooking';
  };

  const isCapacityExceeded = selectedRoom?.capacity !== null && selectedRoom !== undefined
    ? estimatedAttendees > selectedRoom.capacity
    : false;

  // Validation State & Refs for Interactive Feedback & Auto-Scroll
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  const roomSearchInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const startTimeInputRef = useRef<HTMLInputElement>(null);
  const endTimeInputRef = useRef<HTMLInputElement>(null);
  const tenggatInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const attendeesInputRef = useRef<HTMLInputElement>(null);
  const orgInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
  const internalApprovalRef = useRef<HTMLInputElement>(null);
  const internalApprovalContainerRef = useRef<HTMLDivElement>(null);

  const clearFieldError = useCallback((fieldName: string) => {
    setFieldErrors((prev) => {
      if (!prev[fieldName]) return prev;
      const updated = { ...prev };
      delete updated[fieldName];
      return updated;
    });
    setErrorMessage('');
  }, []);

  // Real-time calculation of form validity
  const isFormValid = useMemo(() => {
    const isRoomValid = Boolean(selectedRoom && selectedRoomAvailability?.state === 'available');
    const isDateValid = Boolean(date);
    const isStartTimeValid = Boolean(startTime);
    const isEndTimeValid = Boolean(endTime && (!startTime || endTime > startTime));
    const isMultiDayValid = !isPerSemester || Boolean(tenggatPelaksanaan && (!date || tenggatPelaksanaan >= date));
    const isTitleValid = Boolean(title.trim());
    const isAttendeesValid = Number(estimatedAttendees) > 0 && !isCapacityExceeded;
    const isOrgValid = Boolean(userOrganization.trim());
    const isDescValid = Boolean(description.trim());
    const isApprovalValid = Boolean(isInternalApproved);

    return Boolean(
      isRoomValid &&
      isDateValid &&
      isStartTimeValid &&
      isEndTimeValid &&
      isMultiDayValid &&
      isTitleValid &&
      isAttendeesValid &&
      isOrgValid &&
      isDescValid &&
      isApprovalValid
    );
  }, [
    selectedRoom,
    selectedRoomAvailability,
    date,
    startTime,
    endTime,
    isPerSemester,
    tenggatPelaksanaan,
    title,
    estimatedAttendees,
    isCapacityExceeded,
    userOrganization,
    description,
    isInternalApproved,
  ]);

  const handleEquipmentToggle = (eqId: string) => {
    setSelectedEquipments((prev) => {
      const current = prev[eqId] || { selected: false, quantity: 1, notes: '' };
      return {
        ...prev,
        [eqId]: {
          ...current,
          selected: !current.selected,
        },
      };
    });
  };

  const handleEquipmentQty = (eqId: string, qty: number) => {
    setSelectedEquipments((prev) => ({
      ...prev,
      [eqId]: {
        ...(prev[eqId] || { selected: true, quantity: 1, notes: '' }),
        quantity: Math.max(1, qty),
      },
    }));
  };

  const handleAddCustomLogistik = () => {
    if (!newLogistikItem.trim()) return;
    setCustomLogistics([
      ...customLogistics,
      {
        jenisItem: newLogistikItem.trim(),
        jumlah: Math.max(1, newLogistikQty),
        catatan: newLogistikNotes.trim() || undefined,
      },
    ]);
    setNewLogistikItem('');
    setNewLogistikQty(1);
    setNewLogistikNotes('');
  };

  const handleRemoveCustomLogistik = (index: number) => {
    setCustomLogistics(customLogistics.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadedFileName(file.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Check all required fields in visual order and collect errors
    const newErrors: Record<string, boolean> = {};
    const emptyFields: { name: string; ref: React.RefObject<any>; message: string }[] = [];

    // 1. Room
    if (!selectedRoom || selectedRoomAvailability?.state !== 'available') {
      newErrors.room = true;
      emptyFields.push({
        name: 'room',
        ref: roomSearchInputRef,
        message: !selectedRoom
          ? 'Silakan pilih ruangan yang tersedia terlebih dahulu.'
          : 'Ruangan yang dipilih sedang tidak tersedia atau dalam verifikasi.',
      });
    }

    // 2. Date
    if (!date) {
      newErrors.date = true;
      emptyFields.push({
        name: 'date',
        ref: dateInputRef,
        message: 'Tanggal pelaksanaan kegiatan wajib diisi.',
      });
    }

    // 3. Start Time
    if (!startTime) {
      newErrors.startTime = true;
      emptyFields.push({
        name: 'startTime',
        ref: startTimeInputRef,
        message: 'Jam mulai kegiatan wajib diisi.',
      });
    }

    // 4. End Time
    if (!endTime || (startTime && endTime <= startTime)) {
      newErrors.endTime = true;
      emptyFields.push({
        name: 'endTime',
        ref: endTimeInputRef,
        message: !endTime
          ? 'Jam selesai kegiatan wajib diisi.'
          : 'Jam selesai harus lebih akhir dari jam mulai kegiatan.',
      });
    }

    // 5. Tenggat Pelaksanaan (if Multi-Day / Per Semester)
    if (isPerSemester && (!tenggatPelaksanaan || (date && tenggatPelaksanaan < date))) {
      newErrors.tenggatPelaksanaan = true;
      emptyFields.push({
        name: 'tenggatPelaksanaan',
        ref: tenggatInputRef,
        message: !tenggatPelaksanaan
          ? 'Tanggal selesai / tenggat pelaksanaan wajib diisi untuk peminjaman berturut-turut/berkala.'
          : 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai pelaksanaan.',
      });
    }

    // 6. Title
    if (!title.trim()) {
      newErrors.title = true;
      emptyFields.push({
        name: 'title',
        ref: titleInputRef,
        message: 'Nama atau judul kegiatan wajib diisi.',
      });
    }

    // 7. Estimated Attendees
    if (!estimatedAttendees || Number(estimatedAttendees) <= 0 || isCapacityExceeded) {
      newErrors.estimatedAttendees = true;
      emptyFields.push({
        name: 'estimatedAttendees',
        ref: attendeesInputRef,
        message: isCapacityExceeded
          ? `Jumlah peserta (${estimatedAttendees}) melebihi kapasitas ruangan (${selectedRoom?.capacity ?? 0} orang).`
          : 'Estimasi jumlah peserta wajib diisi lebih dari 0.',
      });
    }

    // 8. Organization
    if (!userOrganization.trim()) {
      newErrors.userOrganization = true;
      emptyFields.push({
        name: 'userOrganization',
        ref: orgInputRef,
        message: 'Organisasi atau unit pengusul kegiatan wajib diisi.',
      });
    }

    // 9. Description
    if (!description.trim()) {
      newErrors.description = true;
      emptyFields.push({
        name: 'description',
        ref: descriptionInputRef,
        message: 'Deskripsi singkat acara dan kebutuhan ruangan wajib diisi.',
      });
    }

    // 10. Internal Approval Checkbox
    if (!isInternalApproved) {
      newErrors.isInternalApproved = true;
      emptyFields.push({
        name: 'isInternalApproved',
        ref: internalApprovalRef,
        message: 'Anda wajib mencentang konfirmasi persetujuan internal fakultas sebelum mengajukan permohonan.',
      });
    }

    // If any required field is invalid or missing: highlight and auto-scroll
    if (emptyFields.length > 0) {
      setFieldErrors(newErrors);
      const firstEmpty = emptyFields[0];
      setErrorMessage(firstEmpty.message);

      if (firstEmpty.ref.current) {
        firstEmpty.ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          try {
            firstEmpty.ref.current?.focus?.();
          } catch {
            // ignore
          }
        }, 150);
      }
      return;
    }

    let datesToBook: string[] | undefined = undefined;
    if (isPerSemester && tenggatPelaksanaan) {
      datesToBook = repeatType === 'consecutive'
        ? getConsecutiveDates(date, tenggatPelaksanaan)
        : getRecurringDates(date, tenggatPelaksanaan, selectedDays);

      if (datesToBook.length === 0) {
        setErrorMessage(
          repeatType === 'consecutive'
            ? 'Tidak ada tanggal pelaksanaan yang valid dalam rentang hari yang dipilih.'
            : 'Tidak ada tanggal yang cocok antara tanggal pelaksanaan dan tenggat pelaksanaan untuk hari yang dipilih.'
        );
        return;
      }
    }

    if (!selectedRoom || !scheduleRange) {
      setErrorMessage('Pilih ruangan yang tersedia sebelum mengirim permohonan.');
      return;
    }

    if (selectedRoomAvailability?.state !== 'available') {
      setErrorMessage('Ketersediaan ruangan belum dapat dikonfirmasi. Pilih ruangan lain atau coba lagi.');
      return;
    }

    setIsSubmitting(true);

    // Format equipment list
    const equipmentsList: BookingEquipment[] = Object.entries(selectedEquipments)
      .filter(([_, val]) => val.selected)
      .map(([id, val]) => {
        const eqObj = dynamicEquipments.find((e) => e.id === id);
        return {
          equipmentId: id,
          equipmentName: eqObj?.name || id,
          quantity: val.quantity,
          notes: val.notes,
        };
      });

    // Combine standard and custom logistics
    const combinedLogistik: BookingLogistikItem[] = [
      ...equipmentsList.map((eq) => ({
        jenisItem: eq.equipmentName,
        jumlah: eq.quantity,
        catatan: eq.notes,
      })),
      ...customLogistics,
    ];

    const recurringText = isPerSemester
      ? repeatType === 'consecutive'
        ? `Multi-Hari: ${formatDateIndo(date)} s.d. ${formatDateIndo(tenggatPelaksanaan)} (${datesToBook?.length || 0} hari)`
        : `Jadwal Rutin: Setiap ${selectedDays.join(', ')} (s.d. ${formatDateIndo(tenggatPelaksanaan)}, ${datesToBook?.length || 0} sesi)`
      : undefined;

    const fullNotes = recurringText
      ? `${description ? `${description}\n\n` : ''}[${recurringText}]`
      : description;

    try {
      const latestAvailability = await roomsApi.checkAvailability(
        selectedRoom.id,
        scheduleRange.startTime,
        scheduleRange.endTime
      );

      if (!latestAvailability.isAvailable) {
        setIsSubmitting(false);
        setErrorMessage('Ruangan baru saja dibooking pengguna lain. Pilih ruangan atau waktu lain.');
        refreshAvailability();
        return;
      }

      const created = await addBooking(
        {
          roomId: selectedRoom.id,
          roomName: selectedRoom.name,
          building: '',
          floor: selectedRoom.floor,
          userId: currentUser?.id || 'usr-temp',
          userName: userName || currentUser?.name || 'Civitas YARSI',
          userEmail: currentUser?.email || `${userNimNidn || 'user'}@yarsi.ac.id`,
          userNimNidn: userNimNidn || currentUser?.identifier || '',
          userRole: currentUser?.role || 'user',
          userPhone,
          userOrganization,
          department,
          title,
          category,
          jenisKegiatan: category.toUpperCase(),
          description: fullNotes,
          notes: fullNotes,
          catatan: fullNotes,
          estimatedAttendees: Number(estimatedAttendees),
          date,
          dates: datesToBook,
          startTime,
          endTime,
          isPerSemester,
          tenggatPelaksanaan: isPerSemester ? tenggatPelaksanaan : undefined,
          semester: recurringText,
          requiresYayasanApproval: selectedRoom.requiresYayasanApproval,
          isLeaderApproved: isInternalApproved,
          equipments: equipmentsList,
          logistik: combinedLogistik,
          documentName: uploadedFileName || undefined,
        },
        selectedFile || undefined
      );

      setIsSubmitting(false);
      setSubmitSuccess(true);
      setCreatedBooking(created as any);
      setIsSuccessModalOpen(true);
    } catch (err: any) {
      setIsSubmitting(false);
      const isBookingConflict = err instanceof ApiError
        ? err.statusCode === 409
        : err?.statusCode === 409 || err?.response?.status === 409 || err?.data?.code === 'BOOKING_CONFLICT';

      if (isBookingConflict) {
        setErrorMessage('Ruangan baru saja dibooking pengguna lain. Ketersediaan telah diperbarui, silakan pilih ruangan atau waktu lain.');
        refreshAvailability();
      } else {
        setErrorMessage(err?.message || 'Gagal mengirimkan permohonan peminjaman ruangan.');
      }
    }
  };

  const isGuest = !mounted || !currentUser || currentUser.role === 'guest';

  if (!mounted) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 flex items-center justify-center">
        <div className="animate-pulse space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 mx-auto" />
          <p className="text-xs text-slate-400 font-medium">Memuat data formulir SIPERU...</p>
        </div>
      </div>
    );
  }

  if (isGuest) {
    const loginQuery = new URLSearchParams();
    loginQuery.append('redirect', '/dashboard/booking/new');
    if (roomId) loginQuery.append('roomId', roomId);
    if (date) loginQuery.append('date', date);
    if (startTime) loginQuery.append('startTime', startTime);
    if (endTime) loginQuery.append('endTime', endTime);

    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl p-8 sm:p-12 text-center space-y-6 dark:bg-slate-900 dark:border-slate-700">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-yarsi-primary mx-auto flex items-center justify-center shadow-inner dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400">
            <Building2 className="w-8 h-8" />
          </div>

          <div className="max-w-lg mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-yarsi-primary bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 dark:text-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/30">
              Autentikasi LDAP SSO Diperlukan
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 dark:text-slate-100">
              Pengajuan Peminjaman Ruangan
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed dark:text-slate-400">
              Anda sedang menjelajah dalam Mode Tamu. Untuk mengisi formulir reservasi ruangan, memilih logistik, dan mengunggah dokumen persetujuan, silakan masuk dengan akun SSO LDAP YARSI Anda.
            </p>
          </div>

          {selectedRoom && (
            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 max-w-md mx-auto text-left flex items-center justify-between gap-3 dark:bg-emerald-500/10 dark:border-emerald-500/30">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Ruangan Terpilih</p>
                <p className="text-sm font-extrabold text-slate-900 mt-0.5 dark:text-slate-100">{selectedRoom.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Kapasitas {selectedRoom.capacity !== null ? `${selectedRoom.capacity} Orang` : 'belum tersedia'}</p>
              </div>
              <span className="text-[11px] font-bold text-yarsi-primary bg-white px-2.5 py-1 rounded-full border border-emerald-200 shadow-xs shrink-0 dark:text-emerald-300 dark:bg-slate-900 dark:border-emerald-500/30">
                Tersimpan
              </span>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-center dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              Kembali ke Katalog
            </Link>

            <Link
              href={`/auth/login?${loginQuery.toString()}`}
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-yarsi-primary hover:bg-yarsi-dark shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span>Masuk dengan LDAP SSO</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-7 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Header */}
      <div className="border-l-4 border-yarsi-primary pl-5">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-slate-500 hover:text-yarsi-primary dark:text-slate-400 dark:hover:text-emerald-300"
          >
            ← Kembali ke Dashboard
          </Link>
        </div>
        <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-yarsi-primary dark:text-emerald-400">Pengajuan baru</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl dark:text-slate-100">
          Ajukan peminjaman ruang
        </h1>
        <p className="mt-2 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
          Tentukan jadwal, jelaskan kegiatan, lalu lengkapi fasilitas dan dokumen yang diperlukan.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-2xl text-xs text-rose-900 flex items-start gap-3 animate-shake dark:bg-rose-500/10 dark:border-rose-500/50 dark:text-rose-400">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 dark:text-rose-400" />
          <div>
            <p className="font-bold text-rose-950 dark:text-rose-300">Validasi Pengajuan</p>
            <p className="mt-0.5 text-rose-800 dark:text-rose-300">{errorMessage}</p>
          </div>
        </div>
      )}

      {submitSuccess && (
        <div className="p-6 bg-emerald-50 border-2 border-emerald-400 rounded-3xl text-center space-y-2 animate-fade-in shadow-xl dark:bg-emerald-500/10 dark:border-emerald-500/50">
          <div className="w-12 h-12 rounded-full bg-emerald-600 text-white mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-emerald-950 dark:text-emerald-400">
            Permohonan berhasil dikirim
          </h2>
          <p className="text-xs text-emerald-800 dark:text-emerald-200">
            Permohonan Anda telah masuk ke antrean LPF. Anda akan dialihkan ke dashboard.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-8">
        {/* STEP 1: ROOM & TIME SELECTION */}
        <div className="space-y-6 rounded-[18px_4px_18px_18px] border border-slate-200/90 bg-white p-6 shadow-card sm:p-8 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 rounded-xl bg-emerald-50 text-yarsi-primary dark:bg-emerald-500/10 dark:text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                1. Ruangan & Jadwal Pelaksanaan
              </h2>
              <p className="text-xs text-slate-400">
                Pilih ruangan kampus YARSI dan tentukan tanggal serta rentang jam kegiatan
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Room Selector */}
            <div className="min-w-0 space-y-3" ref={roomSelectorRef}>
              <label htmlFor="room-search" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Pilih Ruangan *
              </label>

              {roomsError ? (
                <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-400" role="alert">
                  <p className="font-bold">{roomsError}</p>
                  <button type="button" onClick={() => void loadRooms()} className="mt-2 min-h-10 rounded-lg bg-white px-3 font-bold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100 dark:bg-slate-900 dark:text-rose-400 dark:ring-rose-500/30 dark:hover:bg-rose-500/15">
                    Coba Lagi
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                      <input
                        ref={roomSearchInputRef}
                        id="room-search"
                        type="search"
                        value={roomSearch}
                        onChange={(event) => {
                          setRoomSearch(event.target.value);
                          setIsRoomMenuOpen(true);
                          setActiveResultIndex(-1);
                          clearFieldError('room');
                        }}
                        onFocus={() => setIsRoomMenuOpen(true)}
                        onKeyDown={(event) => {
                          if (event.key === 'ArrowDown') {
                            event.preventDefault();
                            setIsRoomMenuOpen(true);
                            setActiveResultIndex((index) => Math.min(index + 1, matchingRooms.length - 1));
                          } else if (event.key === 'ArrowUp') {
                            event.preventDefault();
                            setActiveResultIndex((index) => Math.max(index - 1, 0));
                          } else if (event.key === 'Enter' && activeResultIndex >= 0) {
                            event.preventDefault();
                            const room = matchingRooms[activeResultIndex];
                            if (room && availabilityByRoom[room.id]?.state === 'available') {
                              setRoomId(room.id);
                              setRoomSearch(room.name);
                              setIsRoomMenuOpen(false);
                              clearFieldError('room');
                            }
                          } else if (event.key === 'Escape') {
                            setIsRoomMenuOpen(false);
                          }
                        }}
                        placeholder="Cari nama atau kode ruangan..."
                        disabled={isRoomsLoading}
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={isRoomMenuOpen}
                        aria-controls="room-results"
                        aria-activedescendant={activeResultIndex >= 0 ? `room-result-${matchingRooms[activeResultIndex]?.id}` : undefined}
                        className={`w-full rounded-xl border py-3 pl-10 pr-10 text-xs font-medium outline-none transition-all disabled:cursor-wait disabled:opacity-60 sm:text-sm ${
                          fieldErrors.room
                            ? 'border-red-500 ring-2 ring-red-500 bg-red-50/40 text-red-900 placeholder:text-red-300 dark:border-rose-500 dark:ring-rose-500/40 dark:bg-rose-500/10 dark:text-rose-400'
                            : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-yarsi-primary focus:ring-2 focus:ring-yarsi-primary dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100'
                        }`}
                      />
                      {roomSearch && (
                        <button type="button" onClick={() => { setRoomSearch(''); setRoomId(''); clearFieldError('room'); }} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200" aria-label="Hapus pencarian ruangan">
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    <select
                      value={selectedFloor}
                      onChange={(event) => { setSelectedFloor(event.target.value); setIsRoomMenuOpen(true); }}
                      aria-label="Filter lantai"
                      className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-yarsi-primary focus:ring-2 focus:ring-yarsi-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      <option value="all">Semua lantai</option>
                      {floors.map((floor) => (
                        <option key={floor} value={floor}>{formatFloorFilterLabel(floor)}</option>
                      ))}
                    </select>
                  </div>

                  {fieldErrors.room && (
                    <p className="text-[11px] font-semibold text-red-600 mt-1 dark:text-rose-400">
                      {!selectedRoom
                        ? 'Silakan pilih ruangan yang tersedia terlebih dahulu.'
                        : 'Ruangan yang dipilih sedang tidak tersedia atau dalam verifikasi.'}
                    </p>
                  )}

                  <label className="flex min-h-10 items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={showUnavailable}
                      onChange={(event) => { setShowUnavailable(event.target.checked); setIsRoomMenuOpen(true); }}
                      disabled={!hasCompleteSchedule || isAvailabilityLoading}
                      className="h-4 w-4 rounded border-slate-300 text-yarsi-primary focus:ring-yarsi-primary disabled:cursor-not-allowed dark:border-slate-600 dark:text-emerald-400"
                    />
                    Tampilkan ruangan yang tidak tersedia
                  </label>

                  <div className="relative">
                    {isRoomMenuOpen && (
                      <div id="room-results" role="listbox" aria-label="Hasil pencarian ruangan" className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                        {isRoomsLoading ? (
                          <p className="p-3 text-xs text-slate-500 dark:text-slate-400">Memuat daftar ruangan...</p>
                        ) : isAvailabilityLoading ? (
                          <p className="p-3 text-xs text-slate-500 dark:text-slate-400" aria-live="polite">Memeriksa ketersediaan ruangan...</p>
                        ) : matchingRooms.length === 0 ? (
                          <p className="p-3 text-xs text-slate-500 dark:text-slate-400">
                            {hasCompleteSchedule && !isAvailabilityLoading && !availabilityError
                              ? 'Tidak ada ruangan yang tersedia pada waktu tersebut'
                              : 'Ruangan tidak ditemukan'}
                          </p>
                        ) : (
                          floors.map((floor) => {
                            const floorRooms = matchingRooms.filter((room) => (room.floorName || String(room.floor)) === floor);
                            if (floorRooms.length === 0) return null;
                            return (
                              <div key={floor} className="py-1">
                                <p className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">{`Lantai ${floor}`}</p>
                                {floorRooms.map((room) => {
                                  const resultIndex = matchingRooms.findIndex((item) => item.id === room.id);
                                  const availability = availabilityByRoom[room.id];
                                  const isAvailable = availability?.state === 'available';
                                  const status = !hasCompleteSchedule
                                    ? 'Pilih tanggal dan waktu untuk melihat ketersediaan'
                                    : isAvailabilityLoading
                                      ? 'Memeriksa ketersediaan...'
                                      : isAvailable
                                        ? 'Tersedia'
                                        : availability?.state === 'unknown'
                                          ? 'Ketersediaan belum dapat diverifikasi'
                                          : unavailableLabel(availability);
                                  return (
                                    <button
                                      key={room.id}
                                      id={`room-result-${room.id}`}
                                      type="button"
                                      role="option"
                                      aria-selected={room.id === roomId}
                                      aria-disabled={!isAvailable}
                                      disabled={!isAvailable}
                                      onMouseEnter={() => setActiveResultIndex(resultIndex)}
                                      onClick={() => {
                                        setRoomId(room.id);
                                        setRoomSearch(room.name);
                                        setIsRoomMenuOpen(false);
                                        clearFieldError('room');
                                      }}
                                      className={`flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-xs transition-colors ${isAvailable
                                          ? 'text-slate-800 hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none dark:text-slate-200 dark:hover:bg-emerald-500/10 dark:focus:bg-emerald-500/10'
                                          : 'cursor-not-allowed text-slate-400 opacity-75'
                                        } ${activeResultIndex === resultIndex ? 'bg-emerald-50 dark:bg-emerald-500/10' : ''}`}
                                    >
                                      <span className="min-w-0">
                                        <span className="block truncate font-bold">{room.name}</span>
                                        <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">
                                          {[room.code, formatFloor(room), room.capacity !== null ? `${room.capacity} orang` : null].filter(Boolean).join(' · ')}
                                        </span>
                                      </span>
                                      <span className={`shrink-0 text-[10px] font-bold ${isAvailable ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>{status}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {availabilityError && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-400" role="alert">
                      <span>{availabilityError}</span>
                      <button type="button" onClick={refreshAvailability} className="min-h-9 shrink-0 rounded-lg bg-white px-3 font-bold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100 dark:bg-slate-900 dark:text-rose-400 dark:ring-rose-500/30 dark:hover:bg-rose-500/15">Coba Lagi</button>
                    </div>
                  )}

                  {selectedRoom && (
                    <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs dark:border-slate-700 dark:bg-slate-800/60">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 dark:text-slate-200">{selectedRoom.name}</p>
                          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                            {[selectedRoom.code, formatFloor(selectedRoom), selectedRoom.capacity !== null ? `${selectedRoom.capacity} orang` : null].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold ${selectedRoomAvailability?.state === 'available' ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>
                          {!hasCompleteSchedule ? 'Belum diperiksa' : selectedRoomAvailability?.state === 'available' ? 'Tersedia' : selectedRoomAvailability?.state === 'unavailable' ? unavailableLabel(selectedRoomAvailability) : 'Belum diverifikasi'}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Date & Time Selectors */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 dark:text-slate-300">
                  Tanggal Pelaksanaan *
                </label>
                <div
                  className="relative cursor-pointer"
                  onClick={() => {
                    const el = document.getElementById('booking-date-input') as HTMLInputElement;
                    try { el?.showPicker?.(); } catch { }
                  }}
                >
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    ref={dateInputRef}
                    id="booking-date-input"
                    type="date"
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      if (e.target.value) clearFieldError('date');
                    }}
                    onClick={(e) => {
                      try { e.currentTarget.showPicker?.(); } catch { }
                    }}
                    className={`w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium border rounded-xl focus:outline-none transition-all cursor-pointer ${
                      fieldErrors.date
                        ? 'border-red-500 ring-2 ring-red-500 bg-red-50/40 text-red-900 dark:border-rose-500 dark:ring-rose-500/40 dark:bg-rose-500/10 dark:text-rose-400'
                        : 'border-slate-200 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-yarsi-primary dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200'
                    }`}
                  />
                </div>
                {fieldErrors.date && (
                  <p className="text-[11px] font-semibold text-red-600 mt-1 dark:text-rose-400">Tanggal pelaksanaan kegiatan wajib diisi.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 dark:text-slate-300">
                    Jam Mulai (WIB) *
                  </label>
                  <input
                    ref={startTimeInputRef}
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      if (e.target.value) clearFieldError('startTime');
                    }}
                    onClick={(e) => {
                      try { e.currentTarget.showPicker?.(); } catch { }
                    }}
                    className={`w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium border rounded-xl focus:outline-none transition-all cursor-pointer ${
                      fieldErrors.startTime
                        ? 'border-red-500 ring-2 ring-red-500 bg-red-50/40 text-red-900 dark:border-rose-500 dark:ring-rose-500/40 dark:bg-rose-500/10 dark:text-rose-400'
                        : 'border-slate-200 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-yarsi-primary dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200'
                    }`}
                  />
                  {fieldErrors.startTime && (
                    <p className="text-[11px] font-semibold text-red-600 mt-1 dark:text-rose-400">Jam mulai wajib diisi.</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 dark:text-slate-300">
                    Jam Selesai (WIB) *
                  </label>
                  <input
                    ref={endTimeInputRef}
                    type="time"
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(e.target.value);
                      if (e.target.value && (!startTime || e.target.value > startTime)) clearFieldError('endTime');
                    }}
                    onClick={(e) => {
                      try { e.currentTarget.showPicker?.(); } catch { }
                    }}
                    className={`w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium border rounded-xl focus:outline-none transition-all cursor-pointer ${
                      fieldErrors.endTime
                        ? 'border-red-500 ring-2 ring-red-500 bg-red-50/40 text-red-900 dark:border-rose-500 dark:ring-rose-500/40 dark:bg-rose-500/10 dark:text-rose-400'
                        : 'border-slate-200 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-yarsi-primary dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200'
                    }`}
                  />
                  {fieldErrors.endTime && (
                    <p className="text-[11px] font-semibold text-red-600 mt-1 dark:text-rose-400">
                      {!endTime ? 'Jam selesai wajib diisi.' : 'Jam selesai harus lebih akhir dari jam mulai.'}
                    </p>
                  )}
                </div>
              </div>

              {/* Checkbox Peminjaman Lebih dari 1 Hari */}
              <div className="p-3.5 sm:p-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-2xl transition-all dark:bg-slate-800/60 dark:hover:bg-slate-700/50 dark:border-slate-700">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isPerSemester}
                    onChange={(e) => {
                      setIsPerSemester(e.target.checked);
                      if (!e.target.checked) clearFieldError('tenggatPelaksanaan');
                    }}
                    className="mt-0.5 w-4 h-4 text-yarsi-primary rounded border-slate-300 focus:ring-yarsi-primary cursor-pointer accent-emerald-600 dark:text-emerald-400 dark:border-slate-600"
                  />
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                        Peminjaman Lebih dari 1 Hari
                      </span>
                      {isPerSemester ? (
                        repeatType === 'consecutive' ? (
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                            {computedDates.length > 0 ? `${computedDates.length} Hari Berturut-turut` : 'Multi-Hari'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/30">
                            {computedDates.length > 0 ? `${computedDates.length} Sesi Terjadwal` : 'Jadwal Berkala'}
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-600 dark:bg-slate-700/80 dark:text-slate-300">
                          Opsi Multi-Hari & Berkala
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed dark:text-slate-400">
                      Centang jika ruangan dipinjam untuk beberapa hari berturut-turut atau terjadwal secara rutin berkala.
                    </p>
                  </div>
                </label>

                {isPerSemester && (
                  <div className="mt-4 pt-3.5 border-t border-slate-200/80 space-y-4 animate-fade-in dark:border-slate-700">
                    {/* Mode Selector (Tabs) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1.5 dark:text-slate-300">
                        Pilih Tipe Durasi / Penjadwalan:
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        <button
                          type="button"
                          onClick={() => setRepeatType('consecutive')}
                          className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                            repeatType === 'consecutive'
                              ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-400/20 dark:bg-blue-500/15 dark:border-blue-500/50 dark:ring-blue-500/20'
                              : 'bg-white border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-700 dark:hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <CalendarRange className={`w-4 h-4 mt-0.5 shrink-0 ${repeatType === 'consecutive' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                            <div>
                              <div className={`text-xs font-bold ${repeatType === 'consecutive' ? 'text-blue-900 dark:text-blue-200' : 'text-slate-800 dark:text-slate-200'}`}>
                                Hari Berturut-turut (Multi-Hari)
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5 leading-snug dark:text-slate-400">
                                Peminjaman untuk beberapa hari berurutan (seminar, pelatihan, workshop, atau pameran).
                              </div>
                            </div>
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                            repeatType === 'consecutive' ? 'border-blue-600 bg-blue-600 dark:border-blue-400 dark:bg-blue-500' : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {repeatType === 'consecutive' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRepeatType('recurring')}
                          className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                            repeatType === 'recurring'
                              ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-400/20 dark:bg-emerald-500/15 dark:border-emerald-500/50 dark:ring-emerald-500/20'
                              : 'bg-white border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-700 dark:hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <Repeat className={`w-4 h-4 mt-0.5 shrink-0 ${repeatType === 'recurring' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                            <div>
                              <div className={`text-xs font-bold ${repeatType === 'recurring' ? 'text-emerald-900 dark:text-emerald-200' : 'text-slate-800 dark:text-slate-200'}`}>
                                Jadwal Rutin Berkala
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5 leading-snug dark:text-slate-400">
                                Peminjaman berulang pada hari dan jam yang sama setiap minggu (jadwal kuliah, praktikum, atau rapat rutin).
                              </div>
                            </div>
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                            repeatType === 'recurring' ? 'border-emerald-600 bg-emerald-600 dark:border-emerald-400 dark:bg-emerald-500' : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {repeatType === 'recurring' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Mode Content */}
                    {repeatType === 'consecutive' ? (
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5 dark:bg-slate-900 dark:border-slate-700">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Tanggal Selesai Pelaksanaan (Rentang Hari) *
                        </label>
                        <input
                          ref={repeatType === 'consecutive' ? tenggatInputRef : undefined}
                          type="date"
                          min={date || undefined}
                          value={tenggatPelaksanaan}
                          onChange={(e) => {
                            setTenggatPelaksanaan(e.target.value);
                            if (e.target.value && (!date || e.target.value >= date)) clearFieldError('tenggatPelaksanaan');
                          }}
                          onClick={(e) => {
                            try { e.currentTarget.showPicker?.(); } catch { }
                          }}
                          className={`w-full px-3 py-2 text-xs border rounded-xl focus:outline-none transition-all font-semibold cursor-pointer ${
                            fieldErrors.tenggatPelaksanaan
                              ? 'border-red-500 ring-2 ring-red-500 bg-red-50/40 text-red-900 dark:border-rose-500 dark:ring-rose-500/40 dark:bg-rose-500/10 dark:text-rose-400'
                              : 'border-slate-200 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200'
                          }`}
                        />
                        {fieldErrors.tenggatPelaksanaan && (
                          <p className="text-[11px] font-semibold text-red-600 mt-1 dark:text-rose-400">
                            {!tenggatPelaksanaan
                              ? 'Tanggal selesai pelaksanaan wajib diisi.'
                              : 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.'}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400">
                          Mulai dari <span className="font-semibold text-slate-600 dark:text-slate-300">{date ? formatDateIndo(date) : '(pilih tanggal pelaksanaan di atas)'}</span> hingga tanggal selesai yang dipilih.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3.5 bg-white p-3.5 rounded-xl border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1 dark:text-slate-300">
                            Tenggat Akhir Pelaksanaan *
                          </label>
                          <input
                            ref={repeatType === 'recurring' ? tenggatInputRef : undefined}
                            type="date"
                            min={date || undefined}
                            value={tenggatPelaksanaan}
                            onChange={(e) => {
                              setTenggatPelaksanaan(e.target.value);
                              if (e.target.value && (!date || e.target.value >= date)) clearFieldError('tenggatPelaksanaan');
                            }}
                            onClick={(e) => {
                              try { e.currentTarget.showPicker?.(); } catch { }
                            }}
                            className={`w-full px-3 py-2 text-xs border rounded-xl focus:outline-none transition-all font-semibold cursor-pointer ${
                              fieldErrors.tenggatPelaksanaan
                                ? 'border-red-500 ring-2 ring-red-500 bg-red-50/40 text-red-900 dark:border-rose-500 dark:ring-rose-500/40 dark:bg-rose-500/10 dark:text-rose-400'
                                : 'border-slate-200 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200'
                            }`}
                          />
                          {fieldErrors.tenggatPelaksanaan && (
                            <p className="text-[11px] font-semibold text-red-600 mt-1 dark:text-rose-400">
                              {!tenggatPelaksanaan
                                ? 'Tenggat pelaksanaan jadwal berkala wajib diisi.'
                                : 'Tenggat pelaksanaan tidak boleh lebih awal dari tanggal mulai.'}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-400 mt-1">
                            Batas akhir periode jadwal berkala
                          </p>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              Pilih Hari Rutin:
                            </label>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedDays(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'])}
                                className="px-2 py-0.5 text-[10px] font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer dark:border-slate-700 dark:bg-slate-800/60 dark:hover:bg-slate-700 dark:text-slate-200"
                              >
                                Sen – Jum
                              </button>
                              <button
                                type="button"
                                onClick={handleSelectAllWeekdays}
                                className="px-2 py-0.5 text-[10px] font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer dark:border-slate-700 dark:bg-slate-800/60 dark:hover:bg-slate-700 dark:text-slate-200"
                              >
                                {selectedDays.length === WEEKDAYS.length ? 'Reset 1 Hari' : 'Semua Hari'}
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                            {WEEKDAY_ITEMS.map((item) => {
                              const isChecked = selectedDays.includes(item.id);
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => handleToggleDay(item.id)}
                                  title={`Hari ${item.full}`}
                                  className={`w-full py-2 sm:py-2.5 px-0.5 text-center rounded-xl border font-bold transition-all cursor-pointer select-none flex flex-col items-center justify-center ${
                                    isChecked
                                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-600/25'
                                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700 dark:hover:border-slate-600'
                                  }`}
                                >
                                  <span className="text-xs sm:text-sm font-extrabold tracking-tight">{item.short}</span>
                                </button>
                              );
                            })}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] pt-2 px-0.5 text-slate-500 dark:text-slate-400">
                            <span className="truncate">
                              Hari aktif:{' '}
                              <strong className="text-emerald-700 font-bold dark:text-emerald-300">
                                {selectedDays.length === 7
                                  ? 'Setiap Hari (Senin – Minggu)'
                                  : selectedDays.join(', ')}
                              </strong>
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                              ({selectedDays.length} hari per minggu)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Schedule Preview Bar */}
                    {date && tenggatPelaksanaan && tenggatPelaksanaan >= date && (
                      <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-2 dark:bg-emerald-500/10 dark:border-emerald-500/30">
                        <div className="flex flex-wrap items-center justify-between gap-1 text-xs font-bold text-emerald-950 dark:text-emerald-400">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>
                              {repeatType === 'consecutive'
                                ? `Total ${computedDates.length} Hari Berturut-turut Terjadwal`
                                : `Total ${computedDates.length} Sesi Pertemuan Terjadwal`}
                            </span>
                          </span>
                          <span className="text-[11px] font-medium text-emerald-800 dark:text-emerald-200">
                            {startTime && endTime ? `${startTime} – ${endTime} WIB` : ''}
                          </span>
                        </div>

                        {computedDates.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {computedDates.slice(0, 6).map((d) => (
                              <span
                                key={d}
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-white border border-emerald-200 text-emerald-900 shadow-2xs dark:bg-slate-900 dark:border-emerald-500/30 dark:text-emerald-100"
                              >
                                {formatDateIndo(d)}
                              </span>
                            ))}
                            {computedDates.length > 6 && (
                              <span className="text-[10px] font-bold text-emerald-700 px-1.5 dark:text-emerald-300">
                                + {computedDates.length - 6} sesi lainnya
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-[11px] text-amber-700 dark:text-amber-400">
                            Tidak ada tanggal yang cocok dengan jadwal hari yang dipilih pada rentang waktu ini.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!hasCompleteSchedule ? (
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                  <Clock className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">Ketersediaan belum diperiksa</p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">Pilih tanggal dan waktu untuk melihat ketersediaan</p>
                  </div>
                </div>
              ) : isAvailabilityLoading ? (
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100" aria-live="polite">
                  <Clock className="h-5 w-5 shrink-0 animate-pulse text-yarsi-primary dark:text-emerald-400" aria-hidden="true" />
                  <div>
                    <p className="font-bold text-emerald-950 dark:text-emerald-400">Memeriksa ketersediaan ruangan</p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300">Status tersedia akan ditampilkan setelah pemeriksaan selesai.</p>
                  </div>
                </div>
              ) : selectedRoomAvailability?.state === 'available' ? (
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                  <div>
                    <p className="font-bold text-emerald-950 dark:text-emerald-400">Ruangan tersedia</p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300">Ketersediaan diperiksa langsung dari sistem penjadwalan.</p>
                  </div>
                </div>
              ) : selectedRoom && selectedRoomAvailability?.state === 'unavailable' ? (
                <div className="flex items-start gap-2.5 rounded-2xl border-2 border-rose-300 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-400" role="alert">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                  <div>
                    <p className="font-black text-rose-950 dark:text-rose-300">{unavailableLabel(selectedRoomAvailability)}</p>
                    <p className="mt-0.5 text-[11px] text-rose-800 dark:text-rose-300">Pilih ruangan lain atau ganti jam kegiatan agar permohonan dapat disubmit.</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* STEP 2: EVENT DETAILS & JENIS KEGIATAN */}
        <div className="space-y-6 rounded-[18px_4px_18px_18px] border border-slate-200/90 bg-white p-6 shadow-card sm:p-8 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                2. Informasi Kegiatan
              </h2>
              <p className="text-xs text-slate-400">
                Jelaskan kegiatan dan unit pengusul agar proses verifikasi lebih cepat
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1 dark:text-slate-300">
                  Nama / Judul Kegiatan *
                </label>
                <input
                  ref={titleInputRef}
                  type="text"
                  placeholder="Contoh: Seminar Nasional AI Healthcare & Workshop Python FTI"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (e.target.value.trim()) clearFieldError('title');
                  }}
                  className={`w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium border rounded-xl focus:outline-none transition-all ${
                    fieldErrors.title
                      ? 'border-red-500 ring-2 ring-red-500 bg-red-50/40 text-red-900 placeholder:text-red-300 dark:border-rose-500 dark:ring-rose-500/40 dark:bg-rose-500/10 dark:text-rose-400'
                      : 'border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-yarsi-primary dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100'
                  }`}
                />
                {fieldErrors.title && (
                  <p className="text-[11px] font-semibold text-red-600 mt-1 dark:text-rose-400">Nama / Judul kegiatan wajib diisi.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 dark:text-slate-300">
                  Jenis Kegiatan *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as BookingCategory)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-bold bg-emerald-50/70 border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-emerald-950 dark:bg-emerald-500/10 dark:border-emerald-500/40 dark:text-emerald-300"
                >
                  <option value="seminar">Seminar</option>
                  <option value="workshop">Workshop</option>
                  <option value="pelatihan">Pelatihan</option>
                  <option value="rapat">Rapat</option>
                  <option value="kunjungan">Kunjungan</option>
                  <option value="kuliah_tamu">Kuliah / Kuliah Tamu</option>
                  <option value="akreditasi">Akreditasi</option>
                  <option value="ormawa">Kegiatan Ormawa / Civitas</option>
                  <option value="yayasan">Acara Yayasan</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 dark:text-slate-300">
                  Estimasi Jumlah Peserta *
                </label>
                <input
                  ref={attendeesInputRef}
                  type="number"
                  min={1}
                  value={estimatedAttendees}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setEstimatedAttendees(val);
                    if (val > 0 && (!selectedRoom?.capacity || val <= selectedRoom.capacity)) {
                      clearFieldError('estimatedAttendees');
                    }
                  }}
                  className={`w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium border rounded-xl focus:outline-none transition-all ${
                    fieldErrors.estimatedAttendees || isCapacityExceeded
                      ? 'border-red-500 ring-2 ring-red-500 bg-red-50/40 text-red-900 dark:border-rose-500 dark:ring-rose-500/40 dark:bg-rose-500/10 dark:text-rose-400'
                      : 'border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-yarsi-primary dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100'
                  }`}
                />
                {fieldErrors.estimatedAttendees && !isCapacityExceeded && (
                  <p className="text-[11px] font-semibold text-red-600 mt-1 dark:text-rose-400">Estimasi jumlah peserta wajib diisi lebih dari 0.</p>
                )}
                {isCapacityExceeded && (
                  <p className="text-[11px] text-rose-600 mt-1 font-semibold dark:text-rose-400">
                    Jumlah peserta ({estimatedAttendees}) melebihi kapasitas ruang ({selectedRoom?.capacity ?? 'belum tersedia'} orang).
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1 dark:text-slate-300">
                  Organisasi / Unit Pengusul *
                </label>
                <input
                  ref={orgInputRef}
                  type="text"
                  value={userOrganization}
                  onChange={(e) => {
                    setUserOrganization(e.target.value);
                    if (e.target.value.trim()) clearFieldError('userOrganization');
                  }}
                  placeholder="Contoh: BEM Fakultas Teknologi Informasi"
                  className={`w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium border rounded-xl focus:outline-none transition-all ${
                    fieldErrors.userOrganization
                      ? 'border-red-500 ring-2 ring-red-500 bg-red-50/40 text-red-900 placeholder:text-red-300 dark:border-rose-500 dark:ring-rose-500/40 dark:bg-rose-500/10 dark:text-rose-400'
                      : 'border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-yarsi-primary dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100'
                  }`}
                />
                {fieldErrors.userOrganization && (
                  <p className="text-[11px] font-semibold text-red-600 mt-1 dark:text-rose-400">Organisasi / Unit pengusul kegiatan wajib diisi.</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 dark:text-slate-300">
                Deskripsi Singkat Acara & Kebutuhan Ruangan *
              </label>
              <textarea
                ref={descriptionInputRef}
                rows={3}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (e.target.value.trim()) clearFieldError('description');
                }}
                placeholder="Tuliskan tujuan acara, susunan pembicara, dan catatan teknis pendukung..."
                className={`w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium border rounded-xl focus:outline-none transition-all ${
                  fieldErrors.description
                    ? 'border-red-500 ring-2 ring-red-500 bg-red-50/40 text-red-900 placeholder:text-red-300 dark:border-rose-500 dark:ring-rose-500/40 dark:bg-rose-500/10 dark:text-rose-400'
                    : 'border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-yarsi-primary dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100'
                }`}
              />
              {fieldErrors.description && (
                <p className="text-[11px] font-semibold text-red-600 mt-1 dark:text-rose-400">Deskripsi kegiatan wajib diisi.</p>
              )}
            </div>
          </div>
        </div>

        {/* STEP 3: LOGISTICS & FASILITAS TAMBAHAN (BookingLogistik Model) */}
        <div className="space-y-6 rounded-[18px_4px_18px_18px] border border-slate-200/90 bg-white p-6 shadow-card sm:p-8 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  3. Fasilitas Tambahan
                </h2>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700">
                  Opsional
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pilih perlengkapan atau fasilitas tambahan yang perlu disiapkan jika diperlukan (opsional)
              </p>
            </div>
          </div>

          {/* Quick Equipment Checklist (Dynamic from Superadmin Master Data) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Fasilitas Standar &amp; Tambahan Ruang:</p>
              {isLoadingFacilities && (
                <span className="text-[10px] text-slate-400 font-medium">Sinkronisasi fasilitas...</span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {dynamicEquipments.map((eq) => {
                const state = selectedEquipments[eq.id] || {
                  selected: false,
                  quantity: 1,
                  notes: '',
                };

                return (
                  <div
                    key={eq.id}
                    onClick={() => handleEquipmentToggle(eq.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${state.selected
                        ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-500/30 dark:bg-emerald-500/10 dark:border-emerald-500/40'
                        : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100 dark:bg-slate-800/50 dark:border-slate-700 dark:hover:bg-slate-700/60'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={state.selected}
                      onChange={() => { }}
                      className="mt-0.5 rounded text-yarsi-primary focus:ring-yarsi-primary dark:text-emerald-400"
                    />

                    <div className="flex-1 text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-slate-800 dark:text-slate-200">{eq.name}</p>
                        {eq.isSpecial && (
                          <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:border-rose-500/30">
                            Khusus
                          </span>
                        )}
                      </div>
                      {Boolean(eq.description) && (
                        <p className="text-[10.5px] text-slate-400 mt-0.5 leading-snug">
                          {eq.description}
                        </p>
                      )}
                      {state.selected && (
                        <div
                          className="pt-1.5 flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">Jumlah:</span>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={state.quantity}
                            onChange={(e) =>
                              handleEquipmentQty(eq.id, parseInt(e.target.value) || 1)
                            }
                            className="w-16 px-2 py-0.5 text-xs border rounded bg-white text-slate-800 font-bold dark:bg-slate-900 dark:text-slate-200"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Logistics Multi-Item Table */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Daftar Rincian Logistik Tambahan:</p>

            {customLogistics.length > 0 && (
              <div className="space-y-2">
                {customLogistics.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs dark:bg-slate-800/60 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{item.jenisItem}</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-yarsi-primary font-bold rounded dark:bg-emerald-500/20 dark:text-emerald-300">
                        {item.jumlah} Unit
                      </span>
                      {item.catatan && (
                        <span className="text-slate-500 italic dark:text-slate-400">"{item.catatan}"</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomLogistik(idx)}
                      className="text-rose-500 hover:text-rose-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Custom Logistics Input Bar */}
            <div className="p-3 bg-slate-100/70 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-center gap-2 dark:bg-slate-800/60 dark:border-slate-700">
              <input
                type="text"
                placeholder="Jenis Item (misal: Kabel Colokan Listrik 10m)"
                value={newLogistikItem}
                onChange={(e) => setNewLogistikItem(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary dark:bg-slate-900 dark:border-slate-700"
              />
              <input
                type="number"
                min={1}
                max={100}
                placeholder="Jumlah"
                value={newLogistikQty}
                onChange={(e) => setNewLogistikQty(parseInt(e.target.value) || 1)}
                className="w-20 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-bold dark:bg-slate-900 dark:border-slate-700"
              />
              <input
                type="text"
                placeholder="Catatan penempatan (opsional)"
                value={newLogistikNotes}
                onChange={(e) => setNewLogistikNotes(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl dark:bg-slate-900 dark:border-slate-700"
              />
              <button
                type="button"
                onClick={handleAddCustomLogistik}
                className="w-full sm:w-auto px-4 py-2 bg-yarsi-primary hover:bg-yarsi-dark text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shrink-0 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Item</span>
              </button>
            </div>
          </div>
        </div>

        {/* STEP 4: DOCUMENT UPLOAD (dokumenUrl / attachment) */}
        <div className="space-y-6 rounded-[18px_4px_18px_18px] border border-slate-200/90 bg-white p-6 shadow-card sm:p-8 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                4. Dokumen Pendukung
              </h2>
              <p className="text-xs text-slate-400">
                Lampirkan proposal atau poster bila diperlukan (maks. 15 MB)
              </p>
            </div>
          </div>

          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center space-y-3 bg-slate-50 hover:bg-slate-100/60 transition-colors dark:border-slate-700 dark:bg-slate-800/60 dark:hover:bg-slate-700/50">
            <FileText className="w-10 h-10 text-slate-400 mx-auto" />
            <div>
              {uploadedFileName ? (
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Berkas Terpilih: <span className="text-yarsi-primary font-mono dark:text-emerald-400">{uploadedFileName}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setUploadedFileName('');
                    }}
                    className="mt-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline dark:text-rose-400"
                  >
                    Hapus / Ganti Berkas
                  </button>
                </div>
              ) : (
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Belum ada berkas yang dipilih (opsional)
                </p>
              )}
              <p className="text-[11px] text-slate-400 mt-1">
                Format yang didukung: PDF, PNG, JPG, DOC, atau DOCX.
              </p>
            </div>

            <label className="inline-block cursor-pointer px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs dark:bg-slate-900 dark:hover:bg-slate-800/80 dark:border-slate-700 dark:text-slate-200">
              <span>Pilih Dokumen (PDF / Gambar)</span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* STEP 5: VERIFIKASI INTERNAL HIMA / BEM (PRIORITAS 5) */}
        <div
          ref={internalApprovalContainerRef}
          className={`space-y-4 rounded-[18px_4px_18px_18px] border p-6 sm:p-8 transition-all ${
            fieldErrors.isInternalApproved
              ? 'border-red-500 ring-2 ring-red-500 bg-red-50/70 dark:border-rose-500/60 dark:ring-rose-500/30 dark:bg-rose-500/10'
              : 'border-emerald-300 bg-emerald-50/80 dark:border-emerald-500/40 dark:bg-emerald-500/10'
          }`}
        >
          <div className="flex items-start gap-3">
            <input
              ref={internalApprovalRef}
              type="checkbox"
              id="internalApprovalCheck"
              checked={isInternalApproved}
              onChange={(e) => {
                setIsInternalApproved(e.target.checked);
                if (e.target.checked) clearFieldError('isInternalApproved');
              }}
              className={`mt-1 w-5 h-5 rounded focus:ring-yarsi-primary cursor-pointer ${
                fieldErrors.isInternalApproved
                  ? 'text-red-600 border-red-500 focus:ring-red-500 dark:text-rose-400 dark:border-rose-500'
                  : 'text-yarsi-primary border-emerald-400 focus:ring-yarsi-primary dark:text-emerald-400 dark:border-emerald-500'
              }`}
            />
            <label htmlFor="internalApprovalCheck" className="cursor-pointer space-y-1">
              <p className={`text-sm font-bold leading-snug ${fieldErrors.isInternalApproved ? 'text-red-950 dark:text-rose-300' : 'text-emerald-950 dark:text-emerald-300'}`}>
                Konfirmasi Persetujuan Internal *
              </p>
              <p className={`text-xs leading-relaxed ${fieldErrors.isInternalApproved ? 'text-red-800 dark:text-rose-300' : 'text-emerald-800 dark:text-emerald-200'}`}>
                Saya menyatakan bahwa kegiatan ini telah diketahui atau disetujui oleh pimpinan fakultas, dekanat, BEM/DPM, atau pembina kegiatan terkait.
              </p>
            </label>
          </div>
          {fieldErrors.isInternalApproved && (
            <p className="text-xs font-bold text-red-600 dark:text-rose-400">
              Anda wajib mencentang konfirmasi persetujuan internal sebelum mengirim permohonan.
            </p>
          )}
        </div>

        {/* SUBMIT BUTTON BAR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Batal
          </Link>

          <div className="w-full sm:w-auto flex flex-col sm:items-end gap-1.5">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                isSubmitting
                  ? 'bg-slate-300 text-slate-500 cursor-wait dark:bg-slate-700 dark:text-slate-400'
                  : isFormValid
                    ? 'bg-yarsi-primary hover:bg-yarsi-dark text-white shadow-lg hover:shadow-xl shadow-emerald-900/20 active:scale-95 cursor-pointer dark:bg-emerald-600 dark:hover:bg-emerald-500'
                    : 'bg-slate-300 hover:bg-slate-400 text-slate-600 shadow-none cursor-pointer dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-400'
              }`}
            >
              {isSubmitting ? (
                <span>Mengirim permohonan...</span>
              ) : (
                <>
                  <span>Kirim Permohonan Peminjaman</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            {!isFormValid && (
              <span className="text-[11px] text-slate-400 font-medium text-center sm:text-right">
                Lengkapi seluruh field wajib bertanda (*) untuk mengaktifkan warna hijau
              </span>
            )}
          </div>
        </div>
      </form>

      {/* Interactive Success Modal with 1x24 Jam Warning */}
      <BookingSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        booking={createdBooking}
      />
    </div>
  );
}

export default function NewBookingPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Memuat Formulir...</div>}>
      <NewBookingForm />
    </Suspense>
  );
}
