'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { BookingCategory, BookingEquipment, BookingLogistikItem } from '@/lib/types';
import { checkRoomConflict, formatDateIndo } from '@/lib/utils';
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
  CheckSquare,
  MapPin,
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

  const { currentUser, rooms, bookings, academicBlocks, addBooking, error } = useAppStore();

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
  const [userPhone, setUserPhone] = useState(currentUser.phone || '0812-9876-5432');
  const [userOrganization, setUserOrganization] = useState(
    currentUser.organization || 'BEM FTI Universitas YARSI'
  );
  const [department, setDepartment] = useState(currentUser.department || 'Fakultas Teknologi Informasi');

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

  // Run Real-Time Conflict Detection
  const conflictResult = checkRoomConflict(
    roomId || selectedRoom.id,
    date,
    startTime,
    endTime,
    bookings,
    academicBlocks
  );

  const isCapacityExceeded = estimatedAttendees > (selectedRoom?.capacity || 0);

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
          dokumenUrl: selectedFile ? `/uploads/${uploadedFileName}` : undefined,
          documentUrl: selectedFile ? `/uploads/${uploadedFileName}` : undefined,
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-slate-500 hover:text-yarsi-primary"
          >
            ← Kembali ke Dashboard
          </Link>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
          Formulir Digital Terpadu Peminjaman Ruangan
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Menggabungkan Surat Pernyataan, Form Pemakaian Fasilitas, dan Form Kelengkapan ke dalam satu alur digital.
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
        <div className="p-6 bg-emerald-50 border-2 border-emerald-400 rounded-2xl text-center space-y-2 animate-fade-in shadow-lg">
          <div className="w-12 h-12 rounded-full bg-emerald-600 text-white mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-emerald-950">
            Permohonan Peminjaman Berhasil Dikirimkan!
          </h2>
          <p className="text-xs text-emerald-800">
            Permohonan Anda telah masuk ke sistem database PostgreSQL dan antrean LPF. Mengalihkan ke dashboard...
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* STEP 1: ROOM & TIME SELECTION */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
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
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Pilihan Ruangan Kampus *
              </label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-3.5 py-3 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-900"
              >
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    [{room.code}] {room.name} — {room.building} (Kapasitas {room.capacity} org)
                  </option>
                ))}
              </select>

              {/* Selected Room Details Card */}
              {selectedRoom && (
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{selectedRoom.name}</span>
                    <span className="font-semibold text-yarsi-primary bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Maks. {selectedRoom.capacity} Kursi
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    {selectedRoom.description}
                  </p>
                  <p className="text-[11px] text-slate-600 font-medium flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-yarsi-primary shrink-0" />
                    <span>{selectedRoom.locationDetails} • PIC: {selectedRoom.picName}</span>
                  </p>

                  {/* Yayasan Level Warning */}
                  {selectedRoom.requiresYayasanApproval && (
                    <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 flex items-start gap-2">
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
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tanggal Pelaksanaan *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-800"
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
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-800"
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
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-800"
                  />
                </div>
              </div>

              {/* REAL-TIME CONFLICT STATUS BOX */}
              {conflictResult.hasConflict ? (
                <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-2xl text-xs text-rose-900 flex items-start gap-2.5 animate-shake">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-black text-rose-950">
                      JADWAL BENTROK TERDETEKSI!
                    </p>
                    <p className="text-[11px] leading-relaxed text-rose-800">
                      {conflictResult.reason}
                    </p>
                    <p className="text-[10px] text-rose-600 font-semibold">
                      Silakan pilih ruangan lain atau ganti jam kegiatan agar permohonan dapat disubmit.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold text-emerald-950">Slot Waktu Tersedia</p>
                    <p className="text-[11px] text-emerald-700">
                      Ruangan tidak terpakai oleh perkuliahan atau agenda resmi lain pada slot ini.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* STEP 2: EVENT DETAILS & JENIS KEGIATAN */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
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
                  Pilihan Kategori Kegiatan *
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
                  <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Jumlah peserta ({estimatedAttendees}) melebihi kapasitas ruang ({selectedRoom?.capacity} orang).</span>
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
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
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
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                4. Dokumen Pendukung (Proposal / Poster Kegiatan)
              </h2>
              <p className="text-xs text-slate-400">
                Opsional — Lampirkan proposal atau poster dalam format PDF / Gambar (Maks. 15MB)
              </p>
            </div>
          </div>

          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center space-y-3 bg-slate-50 hover:bg-slate-100/60 transition-colors">
            <FileText className="w-10 h-10 text-slate-400 mx-auto" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-700">
                Berkas Terpilih: <span className="text-yarsi-primary font-semibold">{uploadedFileName}</span>
              </p>
              <p className="text-[11px] text-slate-500">
                Dokumen akan diunggah dan diverifikasi oleh tim LPF & Yayasan sebagai lampiran resmi.
              </p>
            </div>

            <label className="inline-block cursor-pointer px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs transition-colors">
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
        <div className="bg-emerald-50/80 rounded-2xl border-2 border-emerald-300 p-6 sm:p-8 space-y-4">
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
                Konfirmasi Persetujuan Internal Fakultas / Kemahasiswaan (Wajib Dicentang) *
              </p>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Saya menyatakan dengan sungguh-sungguh bahwa kegiatan ini telah diverifikasi dan disetujui secara internal oleh Pimpinan Fakultas, Dekanat, BEM/DPM, atau Pembina Kemahasiswaan terkait sebelum diajukan ke sistem SIPERU. Pernyataan ini dicatat secara resmi sebagai rekam jejak audit digital.
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
            disabled={isSubmitting || conflictResult.hasConflict || !isInternalApproved}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-sm text-white bg-yarsi-primary hover:bg-yarsi-dark shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span>Mengirimkan Permohonan ke PostgreSQL...</span>
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
