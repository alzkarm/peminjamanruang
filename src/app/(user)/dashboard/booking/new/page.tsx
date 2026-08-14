'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { AVAILABLE_EQUIPMENTS } from '@/lib/mockData';
import { BookingCategory, BookingEquipment } from '@/lib/types';
import { checkRoomConflict, formatDateIndo } from '@/lib/utils';
import confetti from 'canvas-confetti';
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
  Sparkles,
  ArrowRight,
  HelpCircle,
  Laptop,
  Mic,
  Video,
  Armchair,
  Tv,
  Wind,
  Utensils,
  Headset,
} from 'lucide-react';
import Link from 'next/link';

function NewBookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { currentUser, rooms, bookings, academicBlocks, addBooking } = useAppStore();

  // Prefilled params from URL
  const initialRoomId = searchParams.get('roomId') || rooms[0]?.id || '';
  const initialDate = searchParams.get('date') || '2026-08-16';
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
  const [department, setDepartment] = useState(currentUser.department || 'Teknik Informatika');

  // Facilities Checklist
  const [selectedEquipments, setSelectedEquipments] = useState<
    Record<string, { selected: boolean; quantity: number; notes: string }>
  >({
    'eq-proj-laser': { selected: true, quantity: 1, notes: '' },
    'eq-sound-mic': { selected: true, quantity: 1, notes: '' },
  });

  // Document Upload
  const [uploadedFileName, setUploadedFileName] = useState<string>(
    'Proposal_Kegiatan_Resmi_2026.pdf'
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Selected Room Object
  const selectedRoom = rooms.find((r) => r.id === roomId) || rooms[0];

  // Run Real-Time Conflict Detection
  const conflictResult = checkRoomConflict(
    roomId,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (conflictResult.hasConflict) {
      alert('Tidak dapat mengajukan permohonan karena ada jadwal bentrok!');
      return;
    }

    setIsSubmitting(true);

    // Format equipment list
    const equipmentsList: BookingEquipment[] = Object.entries(selectedEquipments)
      .filter(([_, val]) => val.selected)
      .map(([id, val]) => {
        const eqObj = AVAILABLE_EQUIPMENTS.find((e) => e.id === id);
        return {
          equipmentId: id,
          equipmentName: eqObj?.name || id,
          quantity: val.quantity,
          notes: val.notes,
        };
      });

    setTimeout(() => {
      const created = addBooking({
        roomId: selectedRoom.id,
        roomName: selectedRoom.name,
        building: selectedRoom.building,
        floor: selectedRoom.floor,
        userId: currentUser.id,
        userName,
        userEmail: currentUser.email,
        userNimNidn,
        userRole: currentUser.role,
        userPhone,
        userOrganization,
        department,
        title,
        category,
        description,
        estimatedAttendees: Number(estimatedAttendees),
        date,
        startTime,
        endTime,
        requiresYayasanApproval: selectedRoom.requiresYayasanApproval,
        equipments: equipmentsList,
        documentName: uploadedFileName,
        documentUrl: '#',
      });

      setIsSubmitting(false);
      setSubmitSuccess(true);

      // Trigger Confetti!
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#0D7A5F', '#10B981', '#F59E0B', '#3B82F6'],
        });
      } catch (err) {
        // ignore
      }

      setTimeout(() => {
        router.push('/dashboard');
      }, 1800);
    }, 600);
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
          Formulir Pengajuan Peminjaman Ruangan
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Sistem otomatis memverifikasi ketersediaan slot waktu dan kebutuhan fasilitas audio-visual.
        </p>
      </div>

      {submitSuccess && (
        <div className="p-6 bg-emerald-50 border-2 border-emerald-400 rounded-3xl text-center space-y-2 animate-fade-in shadow-xl">
          <div className="w-12 h-12 rounded-full bg-emerald-600 text-white mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-emerald-950">
            Permohonan Berhasil Dikirimkan!
          </h2>
          <p className="text-xs text-emerald-800">
            Permohonan Anda telah masuk ke dalam antrean review LPF Universitas YARSI. Mengalihkan ke dashboard...
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* STEP 1: ROOM & TIME SELECTION */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-emerald-50 text-yarsi-primary">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                1. Pilih Ruangan & Waktu Pelaksanaan
              </h2>
              <p className="text-xs text-slate-400">
                Tentukan ruangan kampus dan durasi waktu kegiatan
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Room Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Ruangan Kampus YARSI *
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
                  <p className="text-[11px] text-slate-600 font-medium">
                    📍 {selectedRoom.locationDetails} • PIC: {selectedRoom.picName}
                  </p>

                  {/* Yayasan Level Warning */}
                  {selectedRoom.requiresYayasanApproval && (
                    <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-[11px] leading-relaxed">
                        <strong className="font-bold">Perhatian Khusus:</strong> Ruangan ini tergolong tier tinggi dan membutuhkan persetujuan multi-level: diverifikasi oleh LPF lalu diteruskan ke Sekretariat Yayasan YARSI.
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
                      Silakan pilih ruangan lain atau geser jam pelaksanaan agar permohonan dapat diajukan.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold text-emerald-950">Slot Waktu Tersedia</p>
                    <p className="text-[11px] text-emerald-700">
                      Tidak ada bentrok jadwal kuliah maupun permohonan lain pada slot waktu ini.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* STEP 2: EVENT DETAILS */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                2. Detail Acara & Estimasi Peserta
              </h2>
              <p className="text-xs text-slate-400">
                Informasi agenda dan keperluan perizinan resmi
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
                  placeholder="Contoh: Seminar Nasional AI & Workshop Python BEM FTI"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kategori Kegiatan *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as BookingCategory)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-900"
                >
                  <option value="seminar">Seminar / Kuliah Tamu</option>
                  <option value="workshop">Workshop / Pelatihan</option>
                  <option value="rapat">Rapat Kerja / Sidang</option>
                  <option value="kemahasiswaan">Kegiatan Ormawa / BEM / UKM</option>
                  <option value="kuliah">Perkuliahan Khusus</option>
                  <option value="ujian">Ujian / Sertifikasi</option>
                  <option value="yayasan">Acara Khusus Yayasan</option>
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
                    ⚠️ Jumlah peserta ({estimatedAttendees}) melebihi kapasitas ruang ({selectedRoom?.capacity} orang).
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Organisasi / Lembaga / Unit Pengusul *
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
                Deskripsi Singkat Acara & Kebutuhan Khusus *
              </label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Jelaskan ringkasan acara, susunan narasumber, dan kebutuhan pendukung..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yarsi-primary text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* STEP 3: FACILITIES & EQUIPMENT CHECKLIST */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                3. Fasilitas & Peralatan Pendukung LPF
              </h2>
              <p className="text-xs text-slate-400">
                Centang peralatan yang dibutuhkan agar disiapkan oleh teknisi LPF sebelum acara
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {AVAILABLE_EQUIPMENTS.map((eq) => {
              const state = selectedEquipments[eq.id] || {
                selected: false,
                quantity: 1,
                notes: '',
              };

              return (
                <div
                  key={eq.id}
                  onClick={() => handleEquipmentToggle(eq.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    state.selected
                      ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={state.selected}
                    onChange={() => {}}
                    className="mt-1 rounded text-yarsi-primary focus:ring-yarsi-primary"
                  />

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">
                        {eq.name}
                      </span>
                    </div>

                    {eq.isSpecialRequest && (
                      <span className="inline-block text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.2 rounded border border-amber-200">
                        Izin Khusus / Koordinasi LPF
                      </span>
                    )}

                    {state.selected && (
                      <div
                        className="pt-2 flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[11px] text-slate-500">Jumlah:</span>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={state.quantity}
                          onChange={(e) =>
                            handleEquipmentQty(eq.id, parseInt(e.target.value) || 1)
                          }
                          className="w-16 px-2 py-1 text-xs border rounded bg-white text-slate-800 font-bold"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* STEP 4: DOCUMENT ATTACHMENT */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                4. Dokumen Permohonan / Proposal
              </h2>
              <p className="text-xs text-slate-400">
                Lampirkan surat permohonan resmi bertanda tangan Pimpinan Unit / Dekanat / Ormawa
              </p>
            </div>
          </div>

          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center space-y-3 bg-slate-50 hover:bg-slate-100/60 transition-colors">
            <FileText className="w-10 h-10 text-slate-400 mx-auto" />
            <div>
              <p className="text-xs font-bold text-slate-700">
                Dokumen Terlampir: <span className="text-yarsi-primary">{uploadedFileName}</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Format PDF, Maks. 10 MB. Dokumen dapat ditinjau oleh Admin LPF dan Yayasan.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const newName = prompt('Ganti nama file simulasi:', uploadedFileName);
                if (newName) setUploadedFileName(newName);
              }}
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs"
            >
              Ganti File Dokumen
            </button>
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
            disabled={isSubmitting || conflictResult.hasConflict}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-sm text-white bg-yarsi-primary hover:bg-yarsi-dark shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span>Memproses Pengajuan...</span>
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
