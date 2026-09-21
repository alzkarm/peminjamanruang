'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { ApiError, roomsApi } from '@/lib/api';
import { BookingCategory, BookingEquipment, BookingLogistikItem, Room } from '@/lib/types';
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
} from 'lucide-react';
import Link from 'next/link';

const STANDARD_EQUIPMENTS = [
  { id: 'eq-proj-laser', name: 'Laser Projector & Motorized Screen', category: 'audio_visual' },
  { id: 'eq-sound-mic', name: 'Wireless Microphone Set & Sound System', category: 'audio_visual' },
  { id: 'eq-hybrid-zoom', name: 'Hybrid Meeting / PTZ 4K Camera Kit', category: 'audio_visual' },
  { id: 'eq-extra-chairs', name: 'Kursi Tambahan Futura (50 Pcs)', category: 'furniture' },
  { id: 'eq-extra-tables', name: 'Meja Registrasi & Taplak Standar', category: 'furniture' },
  { id: 'eq-power-sockets', name: 'Colokan Listrik / Kabel Roll 10 Meter', category: 'connectivity' },
  { id: 'eq-podium-vip', name: 'Podium Resmi & Banner Stand', category: 'furniture' },
  { id: 'eq-videotron', name: 'Videotron LED Display 8x4m (Khusus Auditorium)', category: 'audio_visual', isSpecial: true },
];

const WEEKDAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

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
  const [selectedSemester, setSelectedSemester] = useState('Semester Ganjil 2026/2027');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Senin']);
  const [isDayDropdownOpen, setIsDayDropdownOpen] = useState(false);

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

  // Facilities Checklist
  const [selectedEquipments, setSelectedEquipments] = useState<
    Record<string, { selected: boolean; quantity: number; notes: string }>
  >({
    'eq-proj-laser': { selected: true, quantity: 1, notes: '' },
    'eq-sound-mic': { selected: true, quantity: 2, notes: '' },
    'eq-power-sockets': { selected: true, quantity: 3, notes: '' },
  });

  // Dynamic Custom Logistics List
  const [customLogistics, setCustomLogistics] = useState<BookingLogistikItem[]>([
    { jenisItem: 'Meja Registrasi', jumlah: 2, catatan: 'Diletakkan di depan pintu masuk' },
    { jenisItem: 'Kursi Tambahan', jumlah: 20, catatan: 'Disusun di baris belakang' },
    { jenisItem: 'Colokan Listrik', jumlah: 4, catatan: 'Untuk meja narasumber & panitia' },
  ]);
  const [newLogistikItem, setNewLogistikItem] = useState('');
  const [newLogistikQty, setNewLogistikQty] = useState(1);
  const [newLogistikNotes, setNewLogistikNotes] = useState('');

  // Document Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('Proposal_Resmi_Kegiatan_2026.pdf');

  // Prioritas 5: Internal Approval Confirmation Checkbox
  const [isInternalApproved, setIsInternalApproved] = useState<boolean>(true);

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

    if (!isInternalApproved) {
      setErrorMessage('Anda wajib mencentang konfirmasi persetujuan internal fakultas/kemahasiswaan sebelum mengajukan permohonan.');
      return;
    }

    if (!hasCompleteSchedule || !scheduleRange) {
      setErrorMessage('Pilih tanggal dan waktu yang valid untuk memeriksa ketersediaan ruangan.');
      return;
    }

    if (!selectedRoom) {
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
        const eqObj = STANDARD_EQUIPMENTS.find((e) => e.id === id);
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

      await addBooking(
        {
          roomId: selectedRoom.id,
          roomName: selectedRoom.name,
          building: '',
          floor: selectedRoom.floor,
          userId: currentUser?.id || 'usr-temp',
          userName: userName || currentUser?.name || 'Civitas YARSI',
          userEmail: currentUser?.email || `${userNimNidn || 'user'}@yarsi.ac.id`,
          userNimNidn: userNimNidn || currentUser?.identifier || '',
          userRole: currentUser?.role || 'mahasiswa',
          userPhone,
          userOrganization,
          department,
          title,
          category,
          jenisKegiatan: category.toUpperCase(),
          description,
          estimatedAttendees: Number(estimatedAttendees),
          date,
          startTime,
          endTime,
          isPerSemester,
          semester: isPerSemester ? `${selectedSemester} (Setiap ${selectedDays.join(', ')})` : undefined,
          requiresYayasanApproval: selectedRoom.requiresYayasanApproval,
          isLeaderApproved: isInternalApproved,
          equipments: equipmentsList,
          logistik: combinedLogistik,
          documentName: uploadedFileName,
          dokumenUrl: selectedFile ? `/uploads/${uploadedFileName}` : undefined,
          documentUrl: selectedFile ? `/uploads/${uploadedFileName}` : undefined,
        },
        selectedFile || undefined
      );

      setIsSubmitting(false);
      setSubmitSuccess(true);

      setTimeout(() => {
        router.push('/dashboard');
      }, 1600);
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
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl p-8 sm:p-12 text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-yarsi-primary mx-auto flex items-center justify-center shadow-inner">
            <Building2 className="w-8 h-8" />
          </div>

          <div className="max-w-lg mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-yarsi-primary bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Autentikasi LDAP SSO Diperlukan
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              Pengajuan Peminjaman Ruangan
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Anda sedang menjelajah dalam Mode Tamu. Untuk mengisi formulir reservasi ruangan, memilih logistik, dan mengunggah dokumen persetujuan, silakan masuk dengan akun SSO LDAP YARSI Anda.
            </p>
          </div>

          {selectedRoom && (
            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 max-w-md mx-auto text-left flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Ruangan Terpilih</p>
                <p className="text-sm font-extrabold text-slate-900 mt-0.5">{selectedRoom.name}</p>
                <p className="text-xs text-slate-500">Kapasitas {selectedRoom.capacity !== null ? `${selectedRoom.capacity} Orang` : 'belum tersedia'}</p>
              </div>
              <span className="text-[11px] font-bold text-yarsi-primary bg-white px-2.5 py-1 rounded-full border border-emerald-200 shadow-xs shrink-0">
                Tersimpan
              </span>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-center"
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
            className="text-xs font-semibold text-slate-500 hover:text-yarsi-primary"
          >
            ← Kembali ke Dashboard
          </Link>
        </div>
        <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-yarsi-primary">Pengajuan baru</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          Ajukan peminjaman ruang
        </h1>
        <p className="mt-2 text-xs text-slate-500 sm:text-sm">
          Tentukan jadwal, jelaskan kegiatan, lalu lengkapi fasilitas dan dokumen yang diperlukan.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-2xl text-xs text-rose-900 flex items-start gap-3 animate-shake">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-rose-950">Validasi Pengajuan</p>
            <p className="mt-0.5 text-rose-800">{errorMessage}</p>
          </div>
        </div>
      )}

      {submitSuccess && (
        <div className="p-6 bg-emerald-50 border-2 border-emerald-400 rounded-3xl text-center space-y-2 animate-fade-in shadow-xl">
          <div className="w-12 h-12 rounded-full bg-emerald-600 text-white mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-emerald-950">
            Permohonan berhasil dikirim
          </h2>
          <p className="text-xs text-emerald-800">
            Permohonan Anda telah masuk ke antrean LPF. Anda akan dialihkan ke dashboard.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* STEP 1: ROOM & TIME SELECTION */}
        <div className="space-y-6 rounded-[18px_4px_18px_18px] border border-slate-200/90 bg-white p-6 shadow-card sm:p-8">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-emerald-50 text-yarsi-primary">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
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
              <label htmlFor="room-search" className="block text-xs font-bold text-slate-700">
                Pilih Ruangan *
              </label>

              {roomsError ? (
                <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900" role="alert">
                  <p className="font-bold">{roomsError}</p>
                  <button type="button" onClick={() => void loadRooms()} className="mt-2 min-h-10 rounded-lg bg-white px-3 font-bold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100">
                    Coba Lagi
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                      <input
                        id="room-search"
                        type="search"
                        value={roomSearch}
                        onChange={(event) => {
                          setRoomSearch(event.target.value);
                          setIsRoomMenuOpen(true);
                          setActiveResultIndex(-1);
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
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-xs font-medium text-slate-900 outline-none transition-colors focus:border-yarsi-primary focus:ring-2 focus:ring-yarsi-primary disabled:cursor-wait disabled:opacity-60 sm:text-sm"
                      />
                      {roomSearch && (
                        <button type="button" onClick={() => { setRoomSearch(''); setRoomId(''); }} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-800" aria-label="Hapus pencarian ruangan">
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    <select
                      value={selectedFloor}
                      onChange={(event) => { setSelectedFloor(event.target.value); setIsRoomMenuOpen(true); }}
                      aria-label="Filter lantai"
                      className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-yarsi-primary focus:ring-2 focus:ring-yarsi-primary"
                    >
                      <option value="all">Semua lantai</option>
                      {floors.map((floor) => (
                        <option key={floor} value={floor}>{formatFloorFilterLabel(floor)}</option>
                      ))}
                    </select>
                  </div>

                  <label className="flex min-h-10 items-center gap-2 text-xs font-medium text-slate-600">
                    <input
                      type="checkbox"
                      checked={showUnavailable}
                      onChange={(event) => { setShowUnavailable(event.target.checked); setIsRoomMenuOpen(true); }}
                      disabled={!hasCompleteSchedule || isAvailabilityLoading}
                      className="h-4 w-4 rounded border-slate-300 text-yarsi-primary focus:ring-yarsi-primary disabled:cursor-not-allowed"
                    />
                    Tampilkan ruangan yang tidak tersedia
                  </label>

                  <div className="relative">
                    {isRoomMenuOpen && (
                      <div id="room-results" role="listbox" aria-label="Hasil pencarian ruangan" className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                        {isRoomsLoading ? (
                          <p className="p-3 text-xs text-slate-500">Memuat daftar ruangan...</p>
                        ) : isAvailabilityLoading ? (
                          <p className="p-3 text-xs text-slate-500" aria-live="polite">Memeriksa ketersediaan ruangan...</p>
                        ) : matchingRooms.length === 0 ? (
                          <p className="p-3 text-xs text-slate-500">
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
                                <p className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{`Lantai ${floor}`}</p>
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
                                      }}
                                      className={`flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-xs transition-colors ${
                                        isAvailable
                                          ? 'text-slate-800 hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none'
                                          : 'cursor-not-allowed text-slate-400 opacity-75'
                                      } ${activeResultIndex === resultIndex ? 'bg-emerald-50' : ''}`}
                                    >
                                      <span className="min-w-0">
                                        <span className="block truncate font-bold">{room.name}</span>
                                        <span className="mt-0.5 block text-[11px] text-slate-500">
                                          {[room.code, formatFloor(room), room.capacity !== null ? `${room.capacity} orang` : null].filter(Boolean).join(' · ')}
                                        </span>
                                      </span>
                                      <span className={`shrink-0 text-[10px] font-bold ${isAvailable ? 'text-emerald-700' : 'text-slate-500'}`}>{status}</span>
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
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900" role="alert">
                      <span>{availabilityError}</span>
                      <button type="button" onClick={refreshAvailability} className="min-h-9 shrink-0 rounded-lg bg-white px-3 font-bold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100">Coba Lagi</button>
                    </div>
                  )}

                  {selectedRoom && (
                    <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800">{selectedRoom.name}</p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {[selectedRoom.code, formatFloor(selectedRoom), selectedRoom.capacity !== null ? `${selectedRoom.capacity} orang` : null].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold ${selectedRoomAvailability?.state === 'available' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600'}`}>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tanggal Pelaksanaan *
                </label>
                <div 
                  className="relative cursor-pointer"
                  onClick={() => {
                    const el = document.getElementById('booking-date-input') as HTMLInputElement;
                    try { el?.showPicker?.(); } catch {}
                  }}
                >
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    id="booking-date-input"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    onClick={(e) => {
                      try { e.currentTarget.showPicker?.(); } catch {}
                    }}
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-800 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jam Mulai (WIB) *
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    onClick={(e) => {
                      try { e.currentTarget.showPicker?.(); } catch {}
                    }}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-800 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jam Selesai (WIB) *
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    onClick={(e) => {
                      try { e.currentTarget.showPicker?.(); } catch {}
                    }}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-800 cursor-pointer"
                  />
                </div>
              </div>

              {/* Checkbox Peminjaman Rutin Per Semester */}
              <div className="p-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-2xl transition-all">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isPerSemester}
                    onChange={(e) => setIsPerSemester(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-yarsi-primary rounded border-slate-300 focus:ring-yarsi-primary cursor-pointer accent-emerald-600"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        Peminjaman Rutin Per Semester
                      </span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        1 Semester (16 Pertemuan)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Centang jika ruangan dipinjam secara rutin setiap minggu pada hari dan jam yang sama selama satu semester akademik.
                    </p>
                  </div>
                </label>

                {isPerSemester && (
                  <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Pilih Semester Akademik
                      </label>
                      <select
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-800 font-semibold cursor-pointer"
                      >
                        <option value="Semester Ganjil 2026/2027">Semester Ganjil 2026/2027 (Sep 2026 - Jan 2027)</option>
                        <option value="Semester Genap 2026/2027">Semester Genap 2026/2027 (Feb 2027 - Jul 2027)</option>
                      </select>
                    </div>
                    <div className="relative">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Jadwal Pengulangan (Hari)
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsDayDropdownOpen(!isDayDropdownOpen)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-slate-800 font-semibold flex items-center justify-between transition-colors shadow-xs cursor-pointer"
                      >
                        <span className="truncate">
                          {selectedDays.length === WEEKDAYS.length
                            ? 'Setiap Hari (Senin – Sabtu)'
                            : selectedDays.length === 0
                            ? 'Pilih hari...'
                            : `Setiap ${selectedDays.join(', ')}`}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 transition-transform ${
                            isDayDropdownOpen ? 'rotate-180 text-yarsi-primary' : ''
                          }`}
                        />
                      </button>

                      {isDayDropdownOpen && (
                        <div className="absolute z-30 left-0 right-0 mt-1.5 p-3 bg-white border border-slate-200 rounded-2xl shadow-xl animate-fade-in space-y-2">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-[11px]">
                            <span className="font-bold text-slate-700">Pilih Hari (Senin - Sabtu):</span>
                            <button
                              type="button"
                              onClick={handleSelectAllWeekdays}
                              className="text-yarsi-primary hover:underline font-bold text-[10px]"
                            >
                              {selectedDays.length === WEEKDAYS.length
                                ? 'Pilih 1 Hari Saja'
                                : 'Centang Semua (Senin - Sabtu)'}
                            </button>
                          </div>

                          <div className="space-y-1 pt-1">
                            {WEEKDAYS.map((day) => {
                              const isChecked = selectedDays.includes(day);
                              return (
                                <label
                                  key={day}
                                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                                    isChecked
                                      ? 'bg-emerald-50 text-emerald-950'
                                      : 'hover:bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleDay(day)}
                                    className="w-4 h-4 text-yarsi-primary rounded border-slate-300 focus:ring-yarsi-primary accent-emerald-600 cursor-pointer"
                                  />
                                  <span>Hari {day}</span>
                                  {isChecked && (
                                    <span className="ml-auto text-[10px] text-emerald-600 font-bold">Terpilih</span>
                                  )}
                                </label>
                              );
                            })}
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400">
                              {selectedDays.length} hari dipilih
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsDayDropdownOpen(false)}
                              className="px-3 py-1 bg-yarsi-primary text-white text-[10px] font-bold rounded-lg shadow-xs hover:bg-yarsi-dark transition-colors"
                            >
                              Simpan Pilihan
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {!hasCompleteSchedule ? (
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                  <Clock className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
                  <div>
                    <p className="font-bold text-slate-800">Ketersediaan belum diperiksa</p>
                    <p className="text-[11px] text-slate-600">Pilih tanggal dan waktu untuk melihat ketersediaan</p>
                  </div>
                </div>
              ) : isAvailabilityLoading ? (
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900" aria-live="polite">
                  <Clock className="h-5 w-5 shrink-0 animate-pulse text-yarsi-primary" aria-hidden="true" />
                  <div>
                    <p className="font-bold text-emerald-950">Memeriksa ketersediaan ruangan</p>
                    <p className="text-[11px] text-emerald-700">Status tersedia akan ditampilkan setelah pemeriksaan selesai.</p>
                  </div>
                </div>
              ) : selectedRoomAvailability?.state === 'available' ? (
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                  <div>
                    <p className="font-bold text-emerald-950">Ruangan tersedia</p>
                    <p className="text-[11px] text-emerald-700">Ketersediaan diperiksa langsung dari sistem penjadwalan.</p>
                  </div>
                </div>
              ) : selectedRoom && selectedRoomAvailability?.state === 'unavailable' ? (
                <div className="flex items-start gap-2.5 rounded-2xl border-2 border-rose-300 bg-rose-50 p-3 text-xs text-rose-900" role="alert">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden="true" />
                  <div>
                    <p className="font-black text-rose-950">{unavailableLabel(selectedRoomAvailability)}</p>
                    <p className="mt-0.5 text-[11px] text-rose-800">Pilih ruangan lain atau ganti jam kegiatan agar permohonan dapat disubmit.</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* STEP 2: EVENT DETAILS & JENIS KEGIATAN */}
        <div className="space-y-6 rounded-[18px_4px_18px_18px] border border-slate-200/90 bg-white p-6 shadow-card sm:p-8">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
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
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama / Judul Kegiatan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Seminar Nasional AI Healthcare & Workshop Python FTI"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jenis Kegiatan *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as BookingCategory)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-bold bg-emerald-50/70 border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-emerald-950"
                >
                  <option value="seminar">Seminar</option>
                  <option value="workshop">Workshop</option>
                  <option value="pelatihan">Pelatihan</option>
                  <option value="rapat">Rapat</option>
                  <option value="kunjungan">Kunjungan</option>
                  <option value="kuliah_tamu">Kuliah / Kuliah Tamu</option>
                  <option value="akreditasi">Akreditasi</option>
                  <option value="kemahasiswaan">Kegiatan Ormawa / Kemahasiswaan</option>
                  <option value="yayasan">Acara Yayasan</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Estimasi Jumlah Peserta *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={estimatedAttendees}
                  onChange={(e) => setEstimatedAttendees(parseInt(e.target.value) || 0)}
                  className={`w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary ${
                    isCapacityExceeded
                      ? 'border-rose-400 text-rose-900 bg-rose-50'
                      : 'border-slate-200 text-slate-900'
                  }`}
                />
                {isCapacityExceeded && (
                  <p className="text-[11px] text-rose-600 mt-1 font-semibold">
                    Jumlah peserta ({estimatedAttendees}) melebihi kapasitas ruang ({selectedRoom?.capacity ?? 'belum tersedia'} orang).
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Organisasi / Unit Pengusul *
                </label>
                <input
                  type="text"
                  required
                  value={userOrganization}
                  onChange={(e) => setUserOrganization(e.target.value)}
                  placeholder="Contoh: BEM Fakultas Teknologi Informasi"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Deskripsi Singkat Acara & Kebutuhan Ruangan *
              </label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tuliskan tujuan acara, susunan pembicara, dan catatan teknis pendukung..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* STEP 3: LOGISTICS & FASILITAS TAMBAHAN (BookingLogistik Model) */}
        <div className="space-y-6 rounded-[18px_4px_18px_18px] border border-slate-200/90 bg-white p-6 shadow-card sm:p-8">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                3. Fasilitas & Logistik
              </h2>
              <p className="text-xs text-slate-400">
                Pilih perlengkapan tambahan yang perlu disiapkan petugas LPF
              </p>
            </div>
          </div>

          {/* Quick Equipment Checklist */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-700">Fasilitas Standar Ruang:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STANDARD_EQUIPMENTS.map((eq) => {
                const state = selectedEquipments[eq.id] || {
                  selected: false,
                  quantity: 1,
                  notes: '',
                };

                return (
                  <div
                    key={eq.id}
                    onClick={() => handleEquipmentToggle(eq.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      state.selected
                        ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-500/30'
                        : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={state.selected}
                      onChange={() => {}}
                      className="mt-0.5 rounded text-yarsi-primary focus:ring-yarsi-primary"
                    />

                    <div className="flex-1 text-xs">
                      <p className="font-bold text-slate-800">{eq.name}</p>
                      {state.selected && (
                        <div
                          className="pt-1.5 flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[11px] text-slate-500">Jumlah:</span>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={state.quantity}
                            onChange={(e) =>
                              handleEquipmentQty(eq.id, parseInt(e.target.value) || 1)
                            }
                            className="w-16 px-2 py-0.5 text-xs border rounded bg-white text-slate-800 font-bold"
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
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-700">Daftar Rincian Logistik Tambahan:</p>

            {customLogistics.length > 0 && (
              <div className="space-y-2">
                {customLogistics.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900">{item.jenisItem}</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-yarsi-primary font-bold rounded">
                        {item.jumlah} Unit
                      </span>
                      {item.catatan && (
                        <span className="text-slate-500 italic">"{item.catatan}"</span>
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
            <div className="p-3 bg-slate-100/70 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                placeholder="Jenis Item (misal: Kabel Colokan Listrik 10m)"
                value={newLogistikItem}
                onChange={(e) => setNewLogistikItem(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary"
              />
              <input
                type="number"
                min={1}
                max={100}
                placeholder="Jumlah"
                value={newLogistikQty}
                onChange={(e) => setNewLogistikQty(parseInt(e.target.value) || 1)}
                className="w-20 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-bold"
              />
              <input
                type="text"
                placeholder="Catatan penempatan (opsional)"
                value={newLogistikNotes}
                onChange={(e) => setNewLogistikNotes(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
              />
              <button
                type="button"
                onClick={handleAddCustomLogistik}
                className="w-full sm:w-auto px-4 py-2 bg-yarsi-primary hover:bg-yarsi-dark text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Item</span>
              </button>
            </div>
          </div>
        </div>

        {/* STEP 4: DOCUMENT UPLOAD (dokumenUrl / attachment) */}
        <div className="space-y-6 rounded-[18px_4px_18px_18px] border border-slate-200/90 bg-white p-6 shadow-card sm:p-8">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                4. Dokumen Pendukung
              </h2>
              <p className="text-xs text-slate-400">
                Lampirkan proposal atau poster bila diperlukan (maks. 15 MB)
              </p>
            </div>
          </div>

          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center space-y-3 bg-slate-50 hover:bg-slate-100/60 transition-colors">
            <FileText className="w-10 h-10 text-slate-400 mx-auto" />
            <div>
              <p className="text-xs font-bold text-slate-700">
                Berkas Terpilih: <span className="text-yarsi-primary">{uploadedFileName}</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Format yang didukung: PDF, PNG, JPG, DOC, atau DOCX.
              </p>
            </div>

            <label className="inline-block cursor-pointer px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs">
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
        <div className="space-y-4 rounded-[18px_4px_18px_18px] border border-emerald-300 bg-emerald-50/80 p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="internalApprovalCheck"
              checked={isInternalApproved}
              onChange={(e) => setIsInternalApproved(e.target.checked)}
              className="mt-1 w-5 h-5 rounded text-yarsi-primary focus:ring-yarsi-primary border-emerald-400"
            />
            <label htmlFor="internalApprovalCheck" className="cursor-pointer space-y-1">
              <p className="text-sm font-bold text-emerald-950 leading-snug">
                Konfirmasi Persetujuan Internal *
              </p>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Saya menyatakan bahwa kegiatan ini telah diketahui atau disetujui oleh pimpinan fakultas, dekanat, BEM/DPM, atau pembina kemahasiswaan terkait.
              </p>
            </label>
          </div>
        </div>

        {/* SUBMIT BUTTON BAR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Batal
          </Link>

          <button
            type="submit"
            disabled={isSubmitting || !isInternalApproved || !hasCompleteSchedule || selectedRoomAvailability?.state !== 'available'}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-sm text-white bg-yarsi-primary hover:bg-yarsi-dark shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
        </div>
      </form>
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
