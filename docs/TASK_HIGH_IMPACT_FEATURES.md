# Task Rencana Implementasi Fitur High-Impact SIPERU YARSI

Dokumen task ini memuat spesifikasi fitur bernilai tinggi (*high-impact*) beserta logika bisnis (*business logic*) dan daftar pekerjaan (*checklist*) yang dikelompokkan berdasarkan **Role Pengguna** dan **Skala Prioritas**.

---

## 🚀 FITUR PRIORITAS TINGGI (QUICK-WIN & CORE OPERATIONAL)

---

### Task 1.1: E-Surat Izin Masuk Digital & Scannable QR Code Pass
- **Role Sasaran:** Mahasiswa, Dosen, Unit Kerja (`USER`) & Petugas Keamanan (`SECURITY` / `CS`)
- **Masalah:** Peminjam sering harus mencetak surat fisik untuk ditunjukkan ke petugas satpam/CS di lokasi gedung.
- **Deskripsi Fitur:** Digital Room Pass ber-QR Code yang diterbitkan otomatis saat status booking menjadi `APPROVED`.

#### Logika Bisnis (Logic):
1. **Penerbitan Pass & Token:**
   - Ketika status booking berubah menjadi `APPROVED`, backend NestJS membuat `pass_token` unik (hash/UUID terenkripsi) yang disimpan pada tabel `Booking`.
2. **Generasi QR Code:**
   - Frontend memuat QR Code dinamis yang menunjuk ke URL publik: `${NEXT_PUBLIC_APP_URL}/verify/${pass_token}` atau kode verifikasi booking.
3. **Validasi Halaman Bukti Verification (`/verify/[token]`):**
   - Halaman publik memvalidasi keaslian token tanpa memerlukan login.
   - Menampilkan ringkasan lengkap: Nama Ruangan & Gedung, Nama Peminjam & Penanggung Jawab, Tanggal & Jam Pelaksanaan, Rincian Fasilitas/Logistik yang disetujui, serta Cap Tanda Tangan Digital Sistem.

#### Checklist Pekerjaan:
- [x] **Backend (NestJS & Prisma):**
  - [x] Tambahkan field `passToken` (String, unique, nullable) pada model `Booking` di `schema.prisma`.
  - [x] Generate token saat booking berstatus `APPROVED` (single & batch approval serta auto-backfill).
  - [x] Buat public endpoint GET `/api/verify/:passToken` di backend NestJS (tanpa AuthGuard) yang membaca PostgreSQL riil.
- [x] **Frontend (Next.js 14 App Router):**
  - [x] Integrasikan `src/app/(public)/verify/[code]` agar mendukung direct pass token dan kode booking.
  - [x] Tampilkan UI Digital Room Pass resmi dengan badge **"TERVERIFIKASI RESMI"** dan Cap Tanda Tangan Digital SHA-256.
  - [x] Integrasikan modal detail E-Ticket / Digital Room Pass di dashboard user dengan QR Code dan rincian logistik.
  - [x] Sediakan fitur unduh tiket sebagai format Gambar (`.png`) / cetak langsung.

---

### Task 1.2: Agenda Harian (Daily Run-Sheet) & Checklist Kesiapan Sarpras
- **Role Sasaran:** Petugas Lapangan, CS, Teknisi Sarpras, & Security (`ADMIN_UMUM` / `CS`)
- **Deskripsi Fitur:** Dashboard operasional harian real-time yang memuat daftar acara hari ini dan checklist kesiapan logistik serta ruangan.

#### Logika Bisnis (Logic):
1. **Agregasi Data Harian:**
   - Query mengambil seluruh booking berstatus `APPROVED` pada `CURRENT_DATE` beserta relasi `BookingLogistik` (misal: *"Ruang Ar-Rahman butuh 50 kursi ekstra, 2 mic wireless, 4 colokan"*).
2. **Interactive Readiness Checklist:**
   - Teknisi/CS memiliki checklist interaktif per ruangan:
     - `[x]` AC dinyalakan (H-30m)
     - `[x]` Audio & Proyektor terpasang
     - `[x]` Logistik meja/kursi tertata
3. **Indikator Status Ruangan:**
   - Setelah semua checklist tercentang, status kesiapan ruangan otomatis berubah menjadi `READY` sehingga peminjam mengetahui ruangannya siap pakai.

#### Checklist Pekerjaan:
- [x] **Backend (NestJS & Prisma):**
  - [x] Buat model `RoomReadinessChecklist` pada `schema.prisma` yang berelasi dengan `Booking`.
  - [x] Buat endpoint GET `/api/bookings/runsheet/daily?date=YYYY-MM-DD` untuk operasional CS/Teknisi/LPF.
  - [x] Buat endpoint PATCH `/api/bookings/runsheet/:bookingId/toggle-check`.
- [x] **Frontend (Next.js 14):**
  - [x] Buat halaman dashboard operasional `app/admin/runsheet/page.tsx`.
  - [x] Tampilkan card timeline harian per ruangan dan daftar rincian logistik tambahan.
  - [x] Tambahkan toggle checkbox interaktif kesiapan AC, Audio, Logistik, dan Kebersihan dengan indikator status `READY`.
  - [x] Pasang tautan menu "Agenda Hari Ini (Run-Sheet)" di AdminSidebar.

---

### Task 1.3: Auto-Expired & System Release untuk Booking Menggantung
- **Role Sasaran:** Admin LPF / Universitas (`ADMIN_LPF` / `ADMIN_UNIV`)
- **Masalah:** Pengajuan yang ditinggal atau tidak ditindaklanjuti memblokir jadwal peminjam lain.
- **Deskripsi Fitur:** Pelepasan slot jadwal dan nomor kursi otomatis jika pengajuan tidak diproses/direvisi dalam batas waktu toleransi 24 jam.

#### Logika Bisnis (Logic):
1. **Deteksi Timeout Pengajuan:**
   - Jika booking berstatus `PENDING` atau `RETURNED` (perlu revisi) tidak ditindaklanjuti hingga **24 jam** sejak diajukan (`createdAt`) atau H-24 jam sebelum acara, status otomatis diubah menjadi `EXPIRED`.
2. **Pelepasan Resource:**
   - Slot waktu pada Kalender Ruangan dan ketersediaan nomor kursi CBT A/B yang terkunci otomatis dilepas kembali menjadi `AVAILABLE`.

#### Checklist Pekerjaan:
- [x] **Backend (NestJS & Service):**
  - [x] Tambahkan status `EXPIRED` pada enum `BookingStatus` di database PostgreSQL & schema Prisma.
  - [x] Implementasikan method `cleanupExpiredBookings()` di `bookings.service.ts` dan endpoint POST `/api/bookings/cleanup-expired`.
  - [x] Catat alasan otomatis di riwayat `ApprovalLog` sistem.
- [x] **Frontend (Next.js 14):**
  - [x] Tambahkan tombol eksekusi pembersihan jadwal kadaluwarsa langsung pada dashboard runsheet admin.
  - [x] Tipe `EXPIRED` terdaftar pada `BookingStatus` di types.ts.

---

### Task 1.4: Quick 1-Click Approval via Email / WhatsApp (Tokenized Signed Link)
- **Role Sasaran:** Admin Yayasan (`ADMIN_YAYASAN` / `YAYASAN`)
- **Masalah:** Pimpinan Yayasan memiliki mobilitas tinggi dan tidak selalu sempat login membuka web laptop.
- **Deskripsi Fitur:** Tombol persetujuan/penolakan langsung dari notifikasi pesan via Tokenized Signed URL tanpa perlu login berulang.

#### Logika Bisnis (Logic):
1. **Signed Token Generation:**
   - Backend membuat Signed HMAC Token berumur 48 jam yang membawa data `bookingId` dan `action` (`APPROVE` / `REJECT`).
2. **Action Execution Endpoint:**
   - Link notifikasi mengarah ke public action endpoint GET `/api/verify/quick-action/execute?token=...`.
   - Backend memverifikasi enkripsi token, mencatat log persetujuan atas nama Pimpinan, dan mengubah status booking menjadi `APPROVED` secara instan dari smartphone pimpinan.

#### Checklist Pekerjaan:
- [x] **Backend (NestJS & HMAC):**
  - [x] Buat helper `generateQuickActionToken` & `verifyAndExecuteQuickAction` di `bookings.service.ts`.
  - [x] Buat endpoint GET `/api/verify/quick-action/execute` dan generator link di `verify.controller.ts`.
- [x] **Frontend (Next.js 14):**
  - [x] Buat halaman respon konfirmasi resmi `app/approval/result/page.tsx` untuk menampilkan hasil otorisasi sukses / gagal / telah diproses.

---

### Task 1.5: Smart Room Finder (Pencarian Ruangan Cerdas Berdasarkan Kriteria)
- **Role Sasaran:** Tamu / Publik (`GUEST`) & Mahasiswa / Dosen (`USER`)
- **Deskripsi Fitur:** Widget pencarian cerdas berdasarkan kapasitas, fasilitas, tanggal, dan rentang jam kosong.

#### Logika Bisnis (Logic):
1. **Filtering Matrix:**
   - Input: Kapasitas Kursi, Tanggal (`YYYY-MM-DD`), dan Jam (`09:00 - 12:00`).
2. **Query Pencocokan Real-Time:**
   - Backend memfilter tabel `Room` berdasarkan `capacity >= input_capacity` dan mengeliminasi ruangan yang beririsan jadwal dengan booking aktif pada rentang waktu yang diminta.
   - Mengembalikan daftar ruangan yang tersedia dengan tombol langsung ke form booking dengan query params terisi (*pre-filled*).

#### Checklist Pekerjaan:
- [x] **Backend (NestJS & Prisma):**
  - [x] Buat endpoint POST `/api/rooms/smart-search` di `rooms.controller.ts`.
  - [x] Susun query Prisma `where` yang menggabungkan filter kapasitas, gedung, dan validasi bentrok `BLOCKING_BOOKING_STATUSES`.
- [x] **Frontend (Next.js 14):**
  - [x] Buat komponen widget `SmartRoomFinder.tsx` di `components/booking/SmartRoomFinder.tsx`.
  - [x] Pasang widget pencarian cerdas di Beranda Publik `src/app/(public)/page.tsx`.

---

## 🛠️ FITUR PRIORITAS MENENGAH DAN JANGKA PANJANG

---

### Task 2.1: Reschedule Mandiri (Pengajuan Pindah Jadwal)
- **Role Sasaran:** Mahasiswa, Dosen, Unit Kerja (`USER`)
- **Deskripsi Fitur:** Tombol *"Ajukan Pindah Jadwal"* pada riwayat peminjaman untuk menggeser jadwal tanpa membatalkan ulang dari awal.

#### Checklist Pekerjaan:
- [x] **Backend:**
  - [x] Buat endpoint `POST /api/bookings/:id/reschedule` dengan validasi kepemilikan dan ketersediaan anti-bentrok.
  - [x] Simpan `originalSchedule`, `rescheduleReason`, dan ubah status menjadi `RESCHEDULE_PENDING`.
  - [x] Catat riwayat perubahan ke `ApprovalLog`.
- [x] **Frontend:**
  - [x] Buat modal interaktif `RescheduleBookingModal.tsx` dengan pemilih tanggal baru, jam baru, ruangan baru, dan alasan.
  - [x] Pasang tombol *"Ajukan Pindah Jadwal"* pada kartu peminjaman berstatus `APPROVED` dan `PENDING` di Dashboard.

---

### Task 2.2: Sistem Penalti "No-Show" (Anti-Ghost Booking)
- **Role Sasaran:** Admin LPF / Universitas (`ADMIN_LPF` / `ADMIN_UNIV`)
- **Deskripsi Fitur:** Deteksi otomatis ruangan yang dibooking tetapi tidak digunakan, serta pemberian sanksi pembatasan kuota reservasi.

#### Checklist Pekerjaan:
- [x] **Backend:**
  - [x] Buat model dan tabel `user_penalties` di PostgreSQL.
  - [x] Buat endpoint `POST /api/bookings/detect-no-show` untuk scan peminjam `APPROVED` yang tidak check-in setelah 45 menit jadwal dimulai.
  - [x] Terapkan sanksi cooling-down 14 hari bagi pengguna dengan akumulasi $\ge 2$ kali No-Show.
  - [x] Pasang validasi pencegahan di `BookingsService.create` agar user bersanksi aktif tidak dapat memesan ruangan baru.
  - [x] Buat endpoint `POST /api/bookings/:id/check-in` untuk konfirmasi kehadiran di lokasi.
- [x] **Frontend:**
  - [x] Tampilkan banner peringatan sanksi cooling-down di Dashboard Pengguna jika terkena penalti.
  - [x] Tombol pemindai No-Show di Dashboard Admin.

---

### Task 2.3: Maintenance Downtime Scheduler (Blokir Pemeliharaan Ruangan)
- **Role Sasaran:** Admin LPF / Universitas (`ADMIN_LPF` / `ADMIN_UNIV`)
- **Deskripsi Fitur:** Penjadwalan renovasi/perbaikan berkala pada ruangan untuk memblokir reservasi umum.

#### Checklist Pekerjaan:
- [x] **Backend:**
  - [x] Buat tabel `room_maintenances` dengan indeks rentang waktu.
  - [x] Buat endpoint CRUD `GET /api/rooms/maintenance/list`, `POST /api/rooms/maintenance`, dan `DELETE /api/rooms/maintenance/:id`.
  - [x] Integrasikan pengecekan pemeliharaan di `SchedulingService.checkAvailability` dan query `findPublicSchedule`.
- [x] **Frontend:**
  - [x] Buat halaman modul manajemen `app/admin/maintenance/page.tsx` untuk menambah dan menghapus jadwal perbaikan.
  - [x] Tautkan menu *"Pemeliharaan Ruang"* di `AdminSidebar`.
  - [x] Kalender Jadwal secara otomatis menampilkan slot pemeliharaan dengan label `[PEMELIHARAAN]`.

---

### Task 2.4: Recurring Booking (Peminjaman Rutin Semesteran & Mingguan)
- **Role Sasaran:** Admin LPF & Peminjam Rutin (`USER` / `ADMIN_LPF`)
- **Status:** ✅ **SELESAI** — Didukung penuh melalui batch atomic generator, grouping session master, dan multi-approval di dashboard.

---

### Task 2.5: Tombol "Add to Google Calendar / iCal (.ics)"
- **Role Sasaran:** Mahasiswa, Dosen, Unit Kerja (`USER`)
- **Deskripsi Fitur:** Ekspor jadwal acara langsung ke kalender pribadi dari modal tiket atau riwayat detail.

#### Checklist Pekerjaan:
- [x] **Frontend:**
  - [x] Buat utilitas `calendar-exporter.ts` dengan format RFC 5545 iCalendar (`.ics`) dan Google Calendar web renderer link.
  - [x] Buat komponen `CalendarExportButtons.tsx`.
  - [x] Pasang tombol ekspor kalender di modal E-Ticket Dashboard dan modal detail event kalender publik (`EventDetailModal.tsx`).

---

## 📊 RINGKASAN REKAPITULASI PRIORITAS IMPLEMENTASI

| No | Nama Fitur | Role Sasaran | Kompleksitas Teknis | Status Implementasi |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **E-Surat Izin + QR Code Pass** | User & Security | Menengah | ✅ **SELESAI 100% (Sprint 1)** |
| 2 | **Checklist Kesiapan Hari Ini (Run-Sheet)** | CS & Teknisi | Menengah | ✅ **SELESAI 100% (Sprint 1)** |
| 3 | **Auto-Expired Slot & Deteksi No-Show** | Admin LPF | Menengah | ✅ **SELESAI 100% (Sprint 1 & 2)** |
| 4 | **Quick 1-Click Approval Pimpinan** | Admin Yayasan | Rendah | ✅ **SELESAI 100% (Sprint 1)** |
| 5 | **Smart Room Finder** | Guest & User | Rendah | ✅ **SELESAI 100% (Sprint 1)** |
| 6 | **Reschedule Mandiri (Pindah Jadwal)** | User | Menengah | ✅ **SELESAI 100% (Sprint 2)** |
| 7 | **Maintenance Downtime Scheduler** | Admin LPF | Menengah | ✅ **SELESAI 100% (Sprint 2)** |
| 8 | **Recurring Booking Multi-Sesi** | User & Admin | Tinggi | ✅ **SELESAI 100% (Sprint 1 & 2)** |
| 9 | **Add to Google Calendar / iCal** | User | Rendah | ✅ **SELESAI 100% (Sprint 2)** |

