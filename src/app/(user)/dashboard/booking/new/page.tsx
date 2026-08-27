'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { BookingCategory, BookingEquipment, BookingLogistikItem } from '@/lib/types';
import { checkRoomConflict } from '@/lib/utils';
import {
  Calendar,
  Clock,
  Building2,
  Users,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  FileText,
  UploadCloud,
  ArrowRight,
  PackageCheck,
  Plus,
  Trash2,
  MapPin,
  ChevronLeft,
  LoaderCircle,
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

function NewBookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { currentUser, rooms, bookings, academicBlocks, addBooking } = useAppStore();

  // Prefilled params from URL
  const initialRoomId = searchParams.get('roomId') || rooms[0]?.id || '';
  const initialDate = searchParams.get('date') || new Date().toISOString().slice(0, 10);
  const initialStartTime = searchParams.get('startTime') || '09:00';
  const initialEndTime = searchParams.get('endTime') || '12:00';

  // Form State
  const [roomId, setRoomId] = useState(initialRoomId);
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<BookingCategory>('seminar');
  const [description, setDescription] = useState('');
  const [estimatedAttendees, setEstimatedAttendees] = useState(50);

  // Applicant info
  const [userName, setUserName] = useState(currentUser.name || '');
  const [userNimNidn, setUserNimNidn] = useState(currentUser.identifier || '');
  const [userPhone, setUserPhone] = useState(currentUser.phone || '');
  const [userOrganization, setUserOrganization] = useState(
    currentUser.organization || ''
  );
  const [department, setDepartment] = useState(currentUser.department || '');

  // Facilities Checklist
  const [selectedEquipments, setSelectedEquipments] = useState<
    Record<string, { selected: boolean; quantity: number; notes: string }>
  >({
    'eq-proj-laser': { selected: true, quantity: 1, notes: '' },
    'eq-sound-mic': { selected: true, quantity: 2, notes: '' },
    'eq-power-sockets': { selected: true, quantity: 3, notes: '' },
  });

  // Dynamic Custom Logistics List
  const [customLogistics, setCustomLogistics] = useState<BookingLogistikItem[]>([]);
  const [newLogistikItem, setNewLogistikItem] = useState('');
  const [newLogistikQty, setNewLogistikQty] = useState(1);
  const [newLogistikNotes, setNewLogistikNotes] = useState('');

  // Document Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('Belum ada berkas');

  // Prioritas 5: Internal Approval Confirmation Checkbox
  const [isInternalApproved, setIsInternalApproved] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Selected Room Object
  const selectedRoom = rooms.find((r) => r.id === roomId) || rooms[0] || {
    id: roomId || 'room-1',
    name: 'Auditorium Ar-Rahman (Menara YARSI Lt. 12)',
    code: 'MY-1201',
    building: 'Menara YARSI',
    floor: 12,
    capacity: 700,
    type: 'auditorium',
    requiresYayasanApproval: true,
    facilities: ['Videotron 8x4', 'Sound Line Array', 'VIP Lounge'],
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
    description: 'Auditorium utama dengan kapasitas 700 kursi.',
    isActive: true,
    locationDetails: 'Menara YARSI Lt. 12',
  };

  // Run Real-Time Conflict Detection (Ignore if submitting or succeeded)
  const conflictResult = checkRoomConflict(
    roomId || selectedRoom.id,
    date,
    startTime,
    endTime,
    isSubmitting || submitSuccess ? [] : bookings,
    academicBlocks,
    undefined,
    currentUser?.id || currentUser?.identifier
  );

  const isCapacityExceeded = estimatedAttendees > (selectedRoom?.capacity || 0);
  const isTimeRangeInvalid = Boolean(startTime && endTime && endTime <= startTime);
  const hasScheduleConflict = isTimeRangeInvalid || conflictResult.hasConflict;

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
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension || !['pdf', 'doc', 'docx', 'xls', 'xlsx'].includes(extension)) {
        setSelectedFile(null);
        setUploadedFileName('Belum ada berkas');
        setErrorMessage('Format dokumen tidak didukung. Gunakan PDF, Word, atau Excel.');
        e.target.value = '';
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setSelectedFile(null);
        setUploadedFileName('Belum ada berkas');
        setErrorMessage('Ukuran dokumen melebihi batas 15 MB.');
        e.target.value = '';
        return;
      }
      setErrorMessage('');
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

    if (isTimeRangeInvalid) {
      setErrorMessage('Jam selesai harus lebih akhir daripada jam mulai.');
      return;
    }

    if (conflictResult.hasConflict) {
      setErrorMessage('Tidak dapat mengajukan permohonan karena ada bentrok jadwal dengan kegiatan lain.');
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
      await addBooking(
        {
          roomId: selectedRoom.id,
          roomName: selectedRoom.name,
          building: selectedRoom.building,
          floor: selectedRoom.floor,
          userId: currentUser.id,
          userName: userName || currentUser.name,
          userEmail: currentUser.email,
          userNimNidn: userNimNidn || currentUser.identifier,
          userRole: currentUser.role,
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
          requiresYayasanApproval: selectedRoom.requiresYayasanApproval,
          isLeaderApproved: isInternalApproved,
          equipments: equipmentsList,
          logistik: combinedLogistik,
          documentName: uploadedFileName,
        },
        selectedFile || undefined
      );

      setIsSubmitting(false);
      setSubmitSuccess(true);

      setTimeout(() => {
        router.push('/dashboard');
      }, 1200);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Gagal mengirimkan permohonan peminjaman ruangan.');
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/dashboard"
            className="mb-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg pr-2 text-xs font-bold text-slate-500 hover:text-yarsi-primary"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Kembali ke dashboard
          </Link>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-yarsi-primary">Formulir peminjaman</p>
        <h1 className="mt-1 text-2xl font-black tracking-[-0.025em] text-slate-950 sm:text-3xl">
          Ajukan Peminjaman Ruangan
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
          Pilih ruangan dan jadwal, lalu lengkapi informasi kegiatan yang dibutuhkan.
        </p>
        </div>
        <div className="hidden items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 sm:flex">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Data tersimpan selama halaman terbuka
        </div>
      </header>

      <nav aria-label="Tahapan formulir" className="sticky top-2 z-20 overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.45)] backdrop-blur sm:top-3">
        <ol className="grid w-full min-w-[360px] grid-cols-4 gap-1 text-[11px] font-bold sm:text-xs">
          {[
            ['schedule-section', '01', 'Ruang & waktu'],
            ['activity-section', '02', 'Detail kegiatan'],
            ['facility-section', '03', 'Fasilitas'],
            ['document-section', '04', 'Dokumen'],
          ].map(([id, number, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="flex min-h-10 min-w-0 items-center gap-1.5 rounded-xl px-2 text-slate-600 hover:bg-emerald-50 hover:text-yarsi-primary sm:gap-2 sm:px-3">
                <span className="font-mono text-[10px] text-emerald-600">{number}</span>
                <span className="truncate">{label}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Error Alert */}
      {errorMessage && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900 shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-rose-950">Validasi Pengajuan</p>
            <p className="mt-0.5 text-rose-800">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Centered Success Modal Dialog Popup */}
      {submitSuccess && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-success-title"
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in"
        >
          <div className="w-full max-w-md space-y-6 rounded-3xl bg-white p-7 sm:p-9 text-center shadow-2xl border border-slate-100 transform transition-all">
            {/* Animated Icon Badge */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100/80 text-emerald-600 ring-8 ring-emerald-50 shadow-inner">
              <CheckCircle2 className="h-12 w-12 text-yarsi-primary animate-bounce" />
            </div>

            {/* Modal Text Content */}
            <div className="space-y-2">
              <h2 id="modal-success-title" className="text-2xl font-black tracking-tight text-slate-950">
                Permohonan Berhasil Dikirim!
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                Permohonan peminjaman ruangan Anda telah terdaftar dan masuk antrean review LPF & Yayasan YARSI.
              </p>
            </div>

            {/* Primary Action Button */}
            <div className="pt-3 space-y-3">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="w-full min-h-12 px-6 py-3 bg-yarsi-primary hover:bg-yarsi-dark active:bg-yarsi-darker text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Lihat Riwayat Peminjaman Ruangan</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
              <p className="text-[11px] text-slate-400 font-semibold">
                Mengalihkan secara otomatis ke riwayat peminjaman...
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* STEP 1: ROOM & TIME SELECTION */}
        <section id="schedule-section" className="scroll-mt-24 space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_35px_-32px_rgba(0,106,78,0.7)] sm:p-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="p-2 rounded-lg bg-emerald-50 text-yarsi-primary">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                1. Ruangan & Jadwal Pelaksanaan
              </h2>
              <p className="text-xs text-slate-500">
                Pilih ruangan kampus YARSI dan tentukan tanggal serta rentang jam kegiatan
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Room Selector */}
            <div className="space-y-2">
              <label htmlFor="roomSelect" className="block text-xs font-bold text-slate-700">
                Pilihan Ruangan Kampus
              </label>
              <select
                id="roomSelect"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full min-h-11 px-3.5 py-2.5 text-xs sm:text-sm font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-900"
              >
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    [{room.code}] {room.name} — {room.building} (Kapasitas {room.capacity} org)
                  </option>
                ))}
              </select>

              {/* Selected Room Details Card */}
              {selectedRoom && (
                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{selectedRoom.name}</span>
                    <span className="font-semibold text-yarsi-primary bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Maks. {selectedRoom.capacity} Kursi
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {selectedRoom.description}
                  </p>
                  <p className="text-[11px] text-slate-600 font-medium flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-yarsi-primary shrink-0" />
                    <span>{selectedRoom.locationDetails} • PIC: {selectedRoom.picName}</span>
                  </p>

                  {/* Yayasan Level Warning */}
                  {selectedRoom.requiresYayasanApproval && (
                    <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-[11px] leading-relaxed">
                        <strong className="font-bold">Persetujuan Multi-Tier Yayasan:</strong> Ruangan auditorium & senat memerlukan verifikasi teknis LPF lalu direkomendasikan untuk persetujuan final Sekretariat Yayasan YARSI.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Date & Time Selectors */}
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="dateInput"
                  className="block text-xs font-bold text-slate-700 mb-1.5 cursor-pointer"
                  onClick={() => {
                    const el = document.getElementById('dateInput') as HTMLInputElement | null;
                    if (el) {
                      try { (el as any).showPicker(); } catch (err) {}
                    }
                  }}
                >
                  Tanggal Pelaksanaan
                </label>
                <div
                  className="relative cursor-pointer group"
                  onClick={() => {
                    const el = document.getElementById('dateInput') as HTMLInputElement | null;
                    if (el) {
                      try { (el as any).showPicker(); } catch (err) {}
                    }
                  }}
                >
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center p-1.5 rounded-lg bg-emerald-50 text-yarsi-primary group-hover:bg-emerald-100 transition-colors pointer-events-none z-10">
                    <Calendar className="w-4 h-4 shrink-0" />
                  </div>
                  <input
                    id="dateInput"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    onClick={(e) => {
                      try { (e.currentTarget as any).showPicker(); } catch (err) {}
                    }}
                    className="w-full min-h-12 pl-12 pr-4 py-2.5 text-xs sm:text-sm font-semibold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-900 cursor-pointer shadow-sm group-hover:border-emerald-400 group-hover:shadow transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div
                  className="cursor-pointer space-y-1.5 group"
                  onClick={() => {
                    const el = document.getElementById('startTimeInput') as HTMLInputElement | null;
                    if (el) {
                      try { (el as any).showPicker(); } catch (err) {}
                    }
                  }}
                >
                  <label htmlFor="startTimeInput" className="block text-xs font-bold text-slate-700 cursor-pointer">
                    Jam Mulai (WIB)
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center p-1.5 rounded-lg bg-emerald-50 text-yarsi-primary group-hover:bg-emerald-100 transition-colors pointer-events-none z-10">
                      <Clock className="w-4 h-4 shrink-0" />
                    </div>
                    <input
                      id="startTimeInput"
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      onClick={(e) => {
                        try { (e.currentTarget as any).showPicker(); } catch (err) {}
                      }}
                      step={1800}
                      aria-invalid={isTimeRangeInvalid}
                      className="w-full min-h-12 pl-12 pr-3 py-2.5 text-xs sm:text-sm font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-900 cursor-pointer shadow-sm group-hover:border-emerald-400 group-hover:shadow transition-all"
                    />
                  </div>
                </div>
                <div
                  className="cursor-pointer space-y-1.5 group"
                  onClick={() => {
                    const el = document.getElementById('endTimeInput') as HTMLInputElement | null;
                    if (el) {
                      try { (el as any).showPicker(); } catch (err) {}
                    }
                  }}
                >
                  <label htmlFor="endTimeInput" className="block text-xs font-bold text-slate-700 cursor-pointer">
                    Jam Selesai (WIB)
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center p-1.5 rounded-lg bg-emerald-50 text-yarsi-primary group-hover:bg-emerald-100 transition-colors pointer-events-none z-10">
                      <Clock className="w-4 h-4 shrink-0" />
                    </div>
                    <input
                      id="endTimeInput"
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      onClick={(e) => {
                        try { (e.currentTarget as any).showPicker(); } catch (err) {}
                      }}
                      step={1800}
                      aria-invalid={isTimeRangeInvalid}
                      className="w-full min-h-12 pl-12 pr-3 py-2.5 text-xs sm:text-sm font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-900 cursor-pointer shadow-sm group-hover:border-emerald-400 group-hover:shadow transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* REAL-TIME CONFLICT STATUS BOX */}
              {hasScheduleConflict ? (
                <div role="alert" aria-live="polite" className="flex items-start gap-3 rounded-xl border border-rose-300 bg-gradient-to-br from-rose-50 to-white p-4 text-sm text-rose-900 shadow-sm animate-fade-in">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-black text-rose-950">
                      Jadwal tidak tersedia (Telah Resmi Disetujui / Kuliah)
                    </p>
                    <p className="text-[11px] leading-relaxed text-rose-800">
                      {isTimeRangeInvalid ? 'Jam selesai harus lebih akhir daripada jam mulai.' : conflictResult.reason}
                    </p>
                    <p className="text-[10px] text-rose-600 font-semibold">
                      Pilih ruangan lain atau ubah waktu kegiatan sebelum mengirim permohonan.
                    </p>
                  </div>
                </div>
              ) : conflictResult.pendingNotice ? (
                <div role="status" aria-live="polite" className="flex items-start gap-3 rounded-xl border border-amber-300 bg-gradient-to-br from-amber-50 to-white p-4 text-sm text-amber-900 shadow-sm animate-fade-in">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-amber-950">
                      Permohonan Dapat Diajukan (Ada Antrean Review)
                    </p>
                    <p className="text-[11px] leading-relaxed text-amber-800">
                      {conflictResult.pendingNotice}
                    </p>
                  </div>
                </div>
              ) : (
                <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-xl border border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-4 text-sm text-emerald-900 shadow-sm animate-fade-in">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm"><CheckCircle2 className="h-5 w-5" aria-hidden="true" /></span>
                  <div>
                    <p className="font-bold text-emerald-950">Waktu tersedia</p>
                    <p className="text-[11px] text-emerald-700">
                      Ruangan tidak terpakai oleh perkuliahan atau agenda resmi lain pada slot ini.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* STEP 2: DETAILS */}
        <section id="activity-section" className="scroll-mt-24 space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_35px_-32px_rgba(0,106,78,0.7)] sm:p-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                2. Detail Kegiatan & Klasifikasi Acara
              </h2>
              <p className="text-xs text-slate-500">
                Pilih jenis kegiatan resmi yang sesuai dengan agenda acara
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="eventTitleInput" className="block text-xs font-bold text-slate-700 mb-1">
                  Nama / Judul Kegiatan
                </label>
                <input
                  id="eventTitleInput"
                  type="text"
                  required
                  placeholder="Contoh: Seminar Nasional AI Healthcare & Workshop Python FTI"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full min-h-11 px-3.5 py-2.5 text-xs sm:text-sm font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="categorySelect" className="block text-xs font-bold text-slate-700 mb-1">
                  Pilihan Kategori Kegiatan
                </label>
                <select
                  id="categorySelect"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as BookingCategory)}
                  className="w-full min-h-11 px-3.5 py-2.5 text-xs sm:text-sm font-bold bg-emerald-50 border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-emerald-950"
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
                <label htmlFor="attendeesInput" className="block text-xs font-bold text-slate-700 mb-1">
                  Estimasi Jumlah Peserta
                </label>
                <input
                  id="attendeesInput"
                  type="number"
                  required
                  min={1}
                  value={estimatedAttendees}
                  onChange={(e) => setEstimatedAttendees(parseInt(e.target.value) || 0)}
                  className={`w-full min-h-11 px-3.5 py-2.5 text-xs sm:text-sm font-medium bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-yarsi-primary ${
                    isCapacityExceeded
                      ? 'border-rose-400 text-rose-900 bg-rose-50'
                      : 'border-slate-300 text-slate-900'
                  }`}
                />
                {isCapacityExceeded && (
                  <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Jumlah peserta ({estimatedAttendees}) melebihi kapasitas ruang ({selectedRoom?.capacity} orang).</span>
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="orgInput" className="block text-xs font-bold text-slate-700 mb-1">
                  Organisasi / Unit Pengusul
                </label>
                <input
                  id="orgInput"
                  type="text"
                  required
                  value={userOrganization}
                  onChange={(e) => setUserOrganization(e.target.value)}
                  placeholder="Contoh: BEM Fakultas Teknologi Informasi"
                  className="w-full min-h-11 px-3.5 py-2.5 text-xs sm:text-sm font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-900"
                />
              </div>
            </div>

            <div>
              <label htmlFor="descInput" className="block text-xs font-bold text-slate-700 mb-1">
                Deskripsi Singkat Acara & Kebutuhan Ruangan
              </label>
              <textarea
                id="descInput"
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tuliskan tujuan acara, susunan pembicara, dan catatan teknis pendukung..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-900"
              />
            </div>
          </div>
        </section>

        {/* STEP 3: LOGISTICS & FASILITAS TAMBAHAN (BookingLogistik Model) */}
        <section id="facility-section" className="scroll-mt-24 space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_35px_-32px_rgba(0,106,78,0.7)] sm:p-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                3. Kebutuhan Peralatan & Fasilitas Tambahan
              </h2>
              <p className="text-xs text-slate-500">
                Permintaan item meja, kursi, colokan listrik, dan sound system yang akan disiapkan petugas LPF
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
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 ${
                      state.selected
                        ? 'border-emerald-300 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-500/20'
                        : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={state.selected}
                      onClick={(event) => event.stopPropagation()}
                      onChange={() => handleEquipmentToggle(eq.id)}
                      aria-label={`Pilih ${eq.name}`}
                      className="mt-0.5 h-5 w-5 rounded border-slate-300 text-yarsi-primary focus:ring-yarsi-primary"
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
                            className="w-16 px-2 py-0.5 text-xs border border-slate-300 rounded bg-white text-slate-800 font-bold"
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
                    className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900">{item.jenisItem}</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-yarsi-primary font-bold rounded-md">
                        {item.jumlah} Unit
                      </span>
                      {item.catatan && (
                        <span className="text-slate-500 italic">"{item.catatan}"</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomLogistik(idx)}
                      aria-label={`Hapus ${item.jenisItem}`}
                      className="min-w-9 min-h-9 flex items-center justify-center text-rose-500 hover:text-rose-700 rounded-md hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Custom Logistics Input Bar */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                placeholder="Jenis Item (misal: Kabel Colokan Listrik 10m)"
                value={newLogistikItem}
                onChange={(e) => setNewLogistikItem(e.target.value)}
                className="flex-1 w-full min-h-10 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yarsi-primary"
              />
              <input
                type="number"
                min={1}
                max={100}
                placeholder="Jumlah"
                value={newLogistikQty}
                onChange={(e) => setNewLogistikQty(parseInt(e.target.value) || 1)}
                className="w-full sm:w-20 min-h-10 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-bold"
              />
              <input
                type="text"
                placeholder="Catatan penempatan (opsional)"
                value={newLogistikNotes}
                onChange={(e) => setNewLogistikNotes(e.target.value)}
                className="flex-1 w-full min-h-10 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
              />
              <button
                type="button"
                onClick={handleAddCustomLogistik}
                className="w-full sm:w-auto min-h-10 px-4 py-2 bg-yarsi-primary hover:bg-yarsi-dark text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Item</span>
              </button>
            </div>
          </div>
        </section>

        {/* STEP 4: DOCUMENT UPLOAD (dokumenUrl / attachment) */}
        <section id="document-section" className="scroll-mt-24 space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_35px_-32px_rgba(0,106,78,0.7)] sm:p-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-700">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                4. Dokumen Pendukung
              </h2>
              <p className="text-xs text-slate-400">
                Opsional. Lampirkan proposal dalam format PDF, Word, atau Excel (maks. 15 MB).
              </p>
            </div>
          </div>

          <div className={`space-y-3 rounded-2xl border-2 border-dashed p-6 text-center ${selectedFile ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-300 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50/30'}`}>
            <span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-xl ${selectedFile ? 'bg-emerald-600 text-white' : 'bg-white text-slate-400 shadow-sm ring-1 ring-slate-200'}`}>
              {selectedFile ? <CheckCircle2 className="h-6 w-6" aria-hidden="true" /> : <FileText className="h-6 w-6" aria-hidden="true" />}
            </span>
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-700">
                {selectedFile ? 'Berkas siap diunggah:' : 'Belum ada berkas dipilih'} {selectedFile && <span className="text-yarsi-primary font-semibold">{uploadedFileName}</span>}
              </p>
              <p className="text-[11px] text-slate-500">
                Dokumen akan diunggah dan diverifikasi oleh tim LPF & Yayasan sebagai lampiran resmi.
              </p>
            </div>

            <label className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm hover:border-emerald-300 hover:text-yarsi-primary focus-within:ring-2 focus-within:ring-yarsi-primary">
              <UploadCloud className="mr-2 h-4 w-4" aria-hidden="true" />
              <span>{selectedFile ? 'Ganti dokumen' : 'Pilih dokumen'}</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </section>

        {/* STEP 5: VERIFIKASI INTERNAL HIMA / BEM (PRIORITAS 5) */}
        <div className={`space-y-4 rounded-2xl border p-5 sm:p-6 ${isInternalApproved ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}>
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="internalApprovalCheck"
              checked={isInternalApproved}
              onChange={(e) => setIsInternalApproved(e.target.checked)}
              className="mt-1 w-5 h-5 rounded text-yarsi-primary focus:ring-yarsi-primary border-emerald-400 cursor-pointer"
            />
            <label htmlFor="internalApprovalCheck" className="cursor-pointer space-y-1.5 select-none">
              <p className="text-sm font-bold text-emerald-950 leading-snug">
                Konfirmasi Persetujuan Internal Fakultas / Kemahasiswaan (Wajib Dicentang)
              </p>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Saya menyatakan dengan sungguh-sungguh bahwa kegiatan ini telah diverifikasi dan disetujui secara internal oleh Pimpinan Fakultas, Dekanat, BEM/DPM, atau Pembina Kemahasiswaan terkait sebelum diajukan ke sistem SIPERU. Pernyataan ini dicatat secara resmi sebagai rekam jejak audit digital.
              </p>
            </label>
          </div>
        </div>

        {/* SUBMIT BUTTON BAR */}
        <div className="sticky bottom-3 z-20 flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_18px_48px_-20px_rgba(15,23,42,0.35)] backdrop-blur sm:gap-3">
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 shrink-0 items-center px-3 text-sm font-bold text-slate-600 hover:text-slate-950 sm:px-5"
          >
            Batal
          </Link>

          <button
            type="submit"
            disabled={isSubmitting || hasScheduleConflict || !isInternalApproved || isCapacityExceeded}
            className="flex min-h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-yarsi-primary px-4 text-sm font-bold text-white shadow-[0_10px_22px_-14px_rgba(0,106,78,0.85)] hover:bg-yarsi-dark active:bg-yarsi-darker disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none sm:w-auto sm:flex-none sm:px-7"
          >
            {isSubmitting ? (
              <><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /><span>Mengirim permohonan…</span></>
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
