# Status Pengerjaan: SIPERU YARSI

Dokumen ini mencatat perkembangan sistem peminjaman ruangan kampus YARSI.

---

## 📌 Status Terkini

- **Tanggal Pembaruan**: 10 September 2026
- **Kondisi Aplikasi**: 
  - Frontend (Next.js 14) aktif dan berjalan di `http://localhost:3000`.
  - Backend API (NestJS) aktif dan berjalan di `http://localhost:4000/api`.
  - Database PostgreSQL terhubung di port 5433 (`siperu_yarsi`), skema Prisma tersinkronisasi, dan data seed ruangan serta pengguna demo berhasil dimuat.
  - Browser otomatis dibuka dan siap digunakan oleh pengguna.

---

## ✅ Yang Baru Selesai Dikerjakan

1. **Penyatuan Tampilan Kalender 3-Mode & Perbaikan Navigasi Tanggal Presisi**:
   - **Penyebab Masalah Teratasi:** Sebelumnya konversi string tanggal menggunakan `toISOString()` memicu pergeseran zona waktu UTC (mundur 7 jam dari WIB), sehingga tombol hari berikutnya tidak berpindah tanggal. Kini diganti dengan parser kalender lokal presisi (`addDaysToDateStr` dan `addMonthsToDateStr`) yang 100% bebas pergeseran timezone.
   - **Lewati Akhir Pekan (Sabtu & Minggu):** Navigasi harian dan mingguan otomatis melompati hari Sabtu dan Minggu (`getNextWorkingDay`, `getPrevWorkingDay`, dan `ensureWorkingDay`) sehingga kalender fokus pada hari operasional efektif kampus (Senin s/d Jumat).
   - **Penyelarasan Subtitle Header:** Keterangan di bawah penunjuk tanggal diperbarui menjadi *"Semua Ruangan Kampus YARSI (X Ruang)"* tanpa kata redundan "Matriks".
   - **Mode Per Hari (Day View):** Matriks ruangan interaktif seluruh ruangan kampus dengan slot waktu per jam (07:00 - 21:00 WIB), navigasi tanggal lancar maju/mundur (`Hari Ini`), dan filter gedung/tipe ruang.
   - **Mode Per Minggu (Week View):** Timeline 5 hari kerja (Senin s/d Jumat) dengan navigasi `Minggu Ini` dan selector tab ruangan aktif.
   - **Mode Per Bulan (Month View):** Kalender bulanan penuh dengan indikator jumlah kegiatan per hari, transisi cepat ke detail harian saat tanggal diklik, dan navigasi `Bulan Ini`.
   - **Harmonisasi Ikon:** Ikon pengalih kalender diselaraskan memakai rumpun ikon kalender yang senada (`Calendar`, `CalendarRange`, `CalendarDays`).

2. **Penyelesaian Build Produksi & Verifikasi Browser Live**:
   - **Penyebab Build Stall Teratasi:** Membersihkan proses dev server yang menahan file lock pada cache `.next`, eksekusi `npm run build` Next.js 14 kini selesai 100% sukses tanpa stall (12/12 rute terkompilasi).
   - **Kalender Publik & Navigasi Tanggal:** Tampilan *Timeline Google Calendar* dan *Bulan Penuh*, navigasi tanggal (Hari Ini, Hari Sebelumnya/Berikutnya), dan filter ruangan/gedung berfungsi interaktif dan responsif.
   - **Alur Booking dari Slot Kosong:** Mengklik slot kosong di kalender otomatis mengarahkan ke `/dashboard/booking/new` dengan query parameter tanggal, waktu mulai, waktu selesai, dan ruangan yang sudah terisi (*pre-filled*).
   - **Formulir & Status Tampilan:** Form reservasi dengan checklist fasilitas, logistik dinamis, proteksi bentrok *real-time*, dan verifikasi persetujuan pimpinan internal berjalan optimal.
   - **Konsistensi Branding:** Palet warna *YARSI Emerald* (`#006A4E`), tipografi, dan elemen visual kampus YARSI terjaga sepenuhnya.

1. **Verifikasi End-to-End Menyeluruh terhadap PostgreSQL**:
   - **Kalender Publik & Ketersediaan:** Mengambil data nyata PostgreSQL secara tersanitasi tanpa kebocoran data peminjam. Pengecekan ketersediaan slot kosong vs terisi bekerja akurat.
   - **Otentikasi Akun Demo:** Otentikasi JWT SSO YARSI untuk 4 akun peran kampus (Mahasiswa, Dosen, Admin LPF, Admin Yayasan) sukses.
   - **Reservasi & Mesin Anti-Bentrok:** Pembuatan permohonan reservasi berjalan mulus dan percobaan double-booking ditolak otomatis dengan status `409 BOOKING_CONFLICT`.
   - **Alur Persetujuan Bertingkat (*Dual-Tier Approval*):** Persetujuan LPF untuk ruang reguler (`APPROVED`), eskalasi otomatis ruang khusus ke Yayasan (`RECOMMENDED`), dan persetujuan final Yayasan (`APPROVED`) berjalan sesuai spesifikasi.
   - **Validasi Catatan Alasan & Pembatalan:** Penolakan tanpa catatan ditolak (`400`), penolakan dengan catatan berhasil (`REJECTED`), dan pembatalan mandiri pemohon (`CANCELED`) tercatat ke riwayat audit log.
   - **Upload & Download Dokumen:** Pengunggahan berkas proposal via multipart/form-data dan pengunduhan statis terverifikasi dengan integritas konten utuh.
   - **Rute Frontend:** Seluruh rute antarmuka pengguna (`/`, `/schedule`, `/auth/login`, `/dashboard`, `/dashboard/booking/new`, `/admin/approvals`, `/admin/academic-bulk`, `/admin/reports`) berstatus HTTP `200`.

2. **Lampiran booking aman**:
   - Berkas tidak lagi disajikan sebagai folder statis. Unduhan membutuhkan autentikasi dan hanya tersedia bagi pemilik booking atau admin LPF/Yayasan.
   - Nama file dikendalikan server, ekstensi dan tanda file diperiksa, serta file dihapus bila pembuatan booking gagal.

3. **Setup & Migrasi Database PostgreSQL**:
   - Skema Prisma PostgreSQL berhasil diaplikasikan ke database `peminjaman_ruang` di PostgreSQL localhost:5432 (`npx prisma db push`).
   - Prisma Client v5.22.0 digenerate ulang dan terverifikasi untuk PostgreSQL client runtime.
   - Eksekusi seed data (`prisma/seed.ts`) berjalan sukses dan idempoten (14 Lantai, 7 Ruangan, 4 Pengguna Utama, 3 Data Reservasi Awal, Log Persetujuan, dan Feedback).

2. **Verifikasi Suite Pengujian & API**:
   - Seluruh test suite fokus (`scheduling-time`, `serializable-retry`, `seed-database`, `scheduling.service`) lulus 100% (15/15 tests PASS).
   - Verifikasi query ketersediaan dan endpoint publik kalender terhadap PostgreSQL berjalan presisi.

3. **Verifikasi Production Build**:
   - NestJS backend production build (`nest build`) berhasil (`exit code 0`).
   - Next.js 14 frontend production build (`next build`) berhasil dengan 12 rute statis/dinamis terkompilasi optimal.

4. **Mesin konflik jadwal bersama**:
   - Status `PENDING`, `RECOMMENDED`, dan `APPROVED` memblokir slot dengan batas waktu setengah-terbuka, sehingga jadwal yang bersisian tetap diizinkan.
   - Pembuatan booking standar dan jadwal kuliah massal memakai transaksi PostgreSQL `SERIALIZABLE` dengan retry terbatas; konflik mengembalikan `BOOKING_CONFLICT` dan antrean sibuk mengembalikan `SCHEDULING_BUSY`.
   - Endpoint publik jadwal dan ketersediaan hanya menampilkan ruang, waktu, dan status, tanpa identitas atau judul peminjam.
   - Kalender publik mengambil jadwal langsung dari API dan menampilkan waktu Jakarta saat pengguna mengganti tanggal atau tampilan.

5. **Sinkronisasi Presisi Timezone & Jadwal Kuliah Massal**:
   - Memperbaiki parsing tanggal & waktu di service layer dan store agar waktu input (WIB) tidak mengalami pergeseran +7 jam.
   - Menyelaraskan kontrak API `academic-bulk` antara DTO NestJS dan Next.js client, serta membuka akses baca jadwal publik tanpa hambatan otorisasi.

6. **Alur Persetujuan Bertingkat (*Dual-Tier Approval*)**:
   - Ruang reguler disetujui langsung oleh Admin LPF.
   - Ruang khusus (Auditorium Ar-Rahman, Ar-Razi, Ruang Senat) otomatis dialihkan ke status `RECOMMENDED` untuk persetujuan final Sekretariat Yayasan YARSI.

7. **Validasi Catatan Alasan Wajib**:
   - Form dan backend mewajibkan pengisian catatan/alasan saat status permohonan diubah menjadi `REJECTED` (Ditolak) atau `RETURNED` (Perlu Revisi).

8. **Fitur Pembatalan Peminjaman (*Cancel Booking*)**:
   - Peminjam atau admin dapat membatalkan reservasi dengan pencatatan jejak audit (*Audit Log*) otomatis.

9. **Penyederhanaan Teks & UI Login Responsif**:
   - Seluruh istilah asing telah diganti ke bahasa Indonesia formal kampus dan kartu login sudah proporsional.

---

## 📋 Status Rencana Kerja

- [x] **1. Setup Database PostgreSQL**: Sinkronisasi schema Prisma, Client generation, dan seeding idempoten.
- [x] **2. Alur Persetujuan Bertingkat**: Ruang reguler LPF vs Ruang khusus Yayasan.
- [x] **3. Catatan Alasan Wajib**: Dialog & validasi backend untuk revisi/penolakan.
- [x] **4. Fitur Batal Pinjam**: Pembatalan reservasi langsung tercatat di riwayat log.
- [x] **5. Mode Layanan Publik / Tamu**: Akses kalender interaktif untuk civitas & tamu umum.
- [x] **6. Sinkronisasi API & Presisi Waktu (WIB)**: Integrasi backend-frontend bebas pergeseran jam.
- [x] **7. Verifikasi Test & Production Build**: Semua tes dan build production lulus 100%.

---

## 📂 Berkas yang Terkini Dirapikan

- Prisma Schema & Seeder (`backend/prisma/schema.prisma`, `backend/prisma/seed.ts`, `backend/prisma/seed-database.ts`)
- Service Layer API (`src/lib/api.ts`)
- Global State Store (`src/lib/store.ts`)
- Backend Controller Jadwal Massal (`backend/src/academic-bulk/academic-bulk.controller.ts`)
- Backend Service Jadwal Massal (`backend/src/academic-bulk/academic-bulk.service.ts`)
- PROGRESS.md

---

## UI/UX Refinement — 27 Agustus 2026

- Kalender publik kini memakai grid 30 menit, event bertingkat, konteks ruang yang persisten, agenda mobile, serta state loading/error/retry yang jelas.
- Form peminjaman, dashboard pengguna, antrean persetujuan, navigasi, dialog, status, dan state responsif dipoles dengan hierarki visual YARSI yang lebih konsisten.
- Beranda, pencarian ruang, kartu ketersediaan, dan login diselaraskan dengan komposisi yang lebih modern, informatif, dan ramah akses.
- Validasi waktu/lampiran, fokus dialog, target sentuh, reduced motion, dan tampilan desktop/mobile telah diverifikasi.
