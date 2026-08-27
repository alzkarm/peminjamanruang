'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { AcademicBlock } from '@/lib/types';
import { Modal } from '@/components/common/Modal';
import {
  GraduationCap,
  PlusCircle,
  FileSpreadsheet,
  Trash2,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  AlertCircle,
  Search,
  BookOpen,
  Calendar,
  Clock,
  Building2,
  Download,
  Upload,
  MapPin,
} from 'lucide-react';

export default function AcademicBulkPage() {
  const {
    rooms,
    academicBlocks,
    addAcademicBlock,
    bulkAddAcademicBlocks,
    deleteAcademicBlock,
    toggleAcademicBlock,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterFaculty, setFilterFaculty] = useState('all');
  const [filterDay, setFilterDay] = useState('all');

  // Form Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [lecturerName, setLecturerName] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.id || '');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:30');
  const [semester, setSemester] = useState('Semester Ganjil 2026/2027');
  const [faculty, setFaculty] = useState('Teknologi Informasi');
  const [studentGroup, setStudentGroup] = useState('IF-2024-A');

  const daysName = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  // Filtered blocks
  const filteredBlocks = academicBlocks.filter((b) => {
    if (
      searchQuery &&
      !b.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !b.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !b.lecturerName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !b.roomName.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    if (filterFaculty !== 'all' && b.faculty !== filterFaculty) return false;
    if (filterDay !== 'all' && b.dayOfWeek.toString() !== filterDay) return false;

    return true;
  });

  const handleAddBlock = (e: React.FormEvent) => {
    e.preventDefault();
    const roomObj = rooms.find((r) => r.id === selectedRoomId) || rooms[0];

    addAcademicBlock({
      title: courseTitle,
      courseCode,
      lecturerName,
      roomId: roomObj.id,
      roomName: roomObj.name,
      building: roomObj.building,
      dayOfWeek: Number(dayOfWeek),
      startTime,
      endTime,
      semester,
      faculty,
      studentGroup,
      isActive: true,
    });

    setIsAddModalOpen(false);
    // Reset inputs
    setCourseTitle('');
    setCourseCode('');
    setLecturerName('');
  };

  const handleImportSampleSchedule = () => {
    const samples: Omit<AcademicBlock, 'id'>[] = [
      {
        title: 'Pemrograman Web Berbasis Komponen (Next.js)',
        courseCode: 'IF3105',
        lecturerName: 'Dr. Siti Nurhaliza, M.Kom',
        roomId: 'room-smart-301',
        roomName: 'Smart Classroom 301',
        building: 'Gedung C (FTI / FEB / FH)',
        dayOfWeek: 2, // Selasa
        startTime: '13:00',
        endTime: '15:30',
        semester: 'Semester Ganjil 2026/2027',
        faculty: 'Teknologi Informasi',
        studentGroup: 'IF-2024-B',
        isActive: true,
      },
      {
        title: 'Farmakologi Klinis & Terapi Medis',
        courseCode: 'KD2204',
        lecturerName: 'Prof. Dr. dr. H. Fachruddin, Sp.OT(K)',
        roomId: 'room-aud-razi',
        roomName: 'Auditorium Ar-Razi',
        building: 'Gedung FK & FKG (Gedung B)',
        dayOfWeek: 4, // Kamis
        startTime: '08:30',
        endTime: '11:00',
        semester: 'Semester Ganjil 2026/2027',
        faculty: 'Kedokteran',
        studentGroup: 'FK-2024-Reguler',
        isActive: true,
      },
      {
        title: 'Deep Learning & Computer Vision Workshop',
        courseCode: 'IF4109',
        lecturerName: 'Fathurrahman, S.Kom., M.T.',
        roomId: 'room-lab-ai',
        roomName: 'Laboratorium AI & Data Science',
        building: 'Gedung C (FTI / FEB / FH)',
        dayOfWeek: 5, // Jumat
        startTime: '08:30',
        endTime: '11:30',
        semester: 'Semester Ganjil 2026/2027',
        faculty: 'Teknologi Informasi',
        studentGroup: 'IF-2023-AI',
        isActive: true,
      },
    ];

    bulkAddAcademicBlocks(samples);
    alert('Berhasil mengimpor 3 jadwal kuliah semester sekaligus ke dalam sistem!');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-yarsi-dark via-emerald-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-lg border border-emerald-800/30 relative overflow-hidden space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-bold border border-white/20">
              <GraduationCap className="w-4 h-4 text-emerald-300" />
              <span>Academic Timetable Integration Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">
              Semester Academic Schedule Bulk Blocker
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl">
              Kunci ruangan kelas dan lab secara massal untuk jadwal kuliah reguler 1 semester. Sistem akan otomatis mencegah permohonan umum agar tidak terjadi bentrok.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleImportSampleSchedule}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 flex items-center gap-1.5 transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Import Template SIAKAD</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md flex items-center gap-1.5 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tambah Jadwal Kuliah</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Day filter */}
          <select
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700"
          >
            <option value="all">Semua Hari (Senin - Minggu)</option>
            {daysName.map((d, i) => (
              <option key={i + 1} value={(i + 1).toString()}>
                Hari {d}
              </option>
            ))}
          </select>

          {/* Faculty filter */}
          <select
            value={filterFaculty}
            onChange={(e) => setFilterFaculty(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700"
          >
            <option value="all">Semua Fakultas</option>
            <option value="Kedokteran">Fakultas Kedokteran</option>
            <option value="Teknologi Informasi">Fakultas Teknologi Informasi</option>
            <option value="Ekonomi & Bisnis">Fakultas Ekonomi & Bisnis</option>
            <option value="Hukum & Kedokteran">Fakultas Hukum</option>
          </select>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari mata kuliah, dosen, ruang..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-64 pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>
      </div>

      {/* Academic Blocks Grid Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm">
              Daftar Jadwal Kuliah Terkunci
            </h3>
            <span className="text-xs font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">
              {filteredBlocks.length} Kelas
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Semester Ganjil 2026/2027 • Sinkronisasi Otomatis
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredBlocks.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Tidak ada jadwal perkuliahan yang cocok dengan kriteria filter.
            </div>
          ) : (
            filteredBlocks.map((block) => (
              <div
                key={block.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-2xl bg-purple-50 text-purple-700 shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded">
                        {block.courseCode}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {block.title}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">
                        Dosen: {block.lecturerName}
                      </span>
                      <span>•</span>
                      <span className="font-bold text-purple-900">
                        {daysName[block.dayOfWeek - 1]}, {block.startTime} - {block.endTime} WIB
                      </span>
                      <span>•</span>
                      <span className="text-slate-600 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{block.roomName} ({block.building})</span>
                      </span>
                      <span>•</span>
                      <span className="text-purple-700 font-medium">
                        {block.studentGroup} ({block.faculty})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => toggleAcademicBlock(block.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                      block.isActive
                        ? 'bg-purple-100 text-purple-900 hover:bg-purple-200'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {block.isActive ? (
                      <>
                        <ToggleRight className="w-4 h-4 text-purple-700" />
                        <span>Kunci Aktif</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4" />
                        <span>Nonaktif</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Hapus jadwal kuliah ini dari sistem pemblokiran?')) {
                        deleteAcademicBlock(block.id);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Hapus Jadwal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ADD ACADEMIC BLOCK MODAL */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Tambah Penguncian Jadwal Kuliah Semester"
          subtitle="Jadwal akan memblokir reservasi umum pada waktu perkuliahan"
          maxWidth="lg"
        >
          <form onSubmit={handleAddBlock} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kode Mata Kuliah *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: IF2104"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fakultas *
                </label>
                <select
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  <option value="Teknologi Informasi">Fakultas Teknologi Informasi</option>
                  <option value="Kedokteran">Fakultas Kedokteran</option>
                  <option value="Ekonomi & Bisnis">Fakultas Ekonomi & Bisnis</option>
                  <option value="Hukum">Fakultas Hukum</option>
                  <option value="Psikologi">Fakultas Psikologi</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Mata Kuliah *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Pemrograman Aplikasi Mobile Lanjut"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Dosen Pengampu *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Dr. Irfan Hakim, M.Kom"
                  value={lecturerName}
                  onChange={(e) => setLecturerName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kelompok Kelas Mahasiswa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: IF-2024-A"
                  value={studentGroup}
                  onChange={(e) => setStudentGroup(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ruangan Kelas / Lab *
                </label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hari Perkuliahan *
                </label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  {daysName.map((d, i) => (
                    <option key={i + 1} value={i + 1}>
                      Hari {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div
                className="cursor-pointer space-y-1"
                onClick={() => {
                  const el = document.getElementById('academicStartTimeInput') as HTMLInputElement | null;
                  if (el) {
                    try { (el as any).showPicker(); } catch (err) {}
                  }
                }}
              >
                <label htmlFor="academicStartTimeInput" className="block text-xs font-bold text-slate-700 mb-1 cursor-pointer">
                  Jam Mulai (WIB)
                </label>
                <input
                  id="academicStartTimeInput"
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  onClick={(e) => {
                    try { (e.currentTarget as any).showPicker(); } catch (err) {}
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 cursor-pointer"
                />
              </div>

              <div
                className="cursor-pointer space-y-1"
                onClick={() => {
                  const el = document.getElementById('academicEndTimeInput') as HTMLInputElement | null;
                  if (el) {
                    try { (el as any).showPicker(); } catch (err) {}
                  }
                }}
              >
                <label htmlFor="academicEndTimeInput" className="block text-xs font-bold text-slate-700 mb-1 cursor-pointer">
                  Jam Selesai (WIB)
                </label>
                <input
                  id="academicEndTimeInput"
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  onClick={(e) => {
                    try { (e.currentTarget as any).showPicker(); } catch (err) {}
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-md"
              >
                Simpan & Kunci Jadwal
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
