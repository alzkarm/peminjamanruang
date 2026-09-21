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

## UI/UX Refinement — 2 September 2026

- Beranda kini memakai visual gedung Universitas YARSI berlapis dengan data ruang nyata, pencarian ketersediaan yang lebih kuat, dan kartu ruang yang lebih terstruktur.
- Tanggal beranda, kalender, formulir, dan laporan mengikuti Asia/Jakarta tanpa nilai tanggal antarmuka yang di-hard-code.
- Kalender mobile memakai agenda vertikal khusus; kalender desktop tetap mempertahankan matriks jadwal ruang.
- Form booking, dashboard, autentikasi, LPF, Yayasan, penjadwalan akademik, evaluasi, dan laporan diselaraskan ke bahasa visual SIPERU yang sama.
- Ekspor laporan menghasilkan Excel `.xlsx`; motion, fokus keyboard, target sentuh, dan reduced motion dipertahankan.
- Komposisi beranda disempurnakan mengikuti referensi: navbar menyatu dengan hero, gedung YARSI dominan dengan callout jadwal aktual, statistik tanggal aktif, search bar mengambang, carousel ruang ringkas, dan akses cepat ke modul utama.
- Build produksi frontend berhasil untuk seluruh 12 route.

## Status Ruangan Hari Ini — 17 September 2026

- Section publik **Status Ruangan Hari Ini** ditambahkan ke Home dengan kelompok **Sedang Digunakan** dan **Sudah Dibooking**.
- Data Home dan Kalender Ruangan sekarang mengambil jadwal tersanitasi dari `GET /rooms/schedule`; hanya status `APPROVED` yang dikembalikan untuk akses publik.
- Daftar publik hanya menampilkan nama ruangan dan jumlah ruangan unik, menggunakan batas waktu Asia/Jakarta, state loading/error/empty, tombol **Coba Lagi**, dan refresh otomatis 60 detik.
- Kalender harian, mingguan, dan bulanan tetap memakai filter, navigasi, modal privacy-safe, serta layout responsive yang sudah ada.
- File terkait: `src/app/(public)/page.tsx`, `src/app/(public)/schedule/page.tsx`, `src/components/calendar/CalendarTimeline.tsx`, `src/components/calendar/CalendarGrid.tsx`, `src/lib/public-schedule.ts`, `src/lib/api.ts`, `src/lib/types.ts`, `backend/src/rooms/rooms.service.ts`.
- Verifikasi: frontend/backend typecheck PASS, Prisma validate PASS, production build Next.js 13/13 route PASS, dan 5 test suite backend PASS (18/18 test).

## Frontend Single Location Cleanup - 17 September 2026

- Home publik dirapikan agar hanya merepresentasikan satu lokasi, yaitu Main LT. Visual foto gedung dan callout ruangan statis dihapus, lalu diganti ringkasan lokasi sederhana yang responsif.
- Filter gedung, dropdown multi-location, dan label lokasi lama di Home, kalender, laporan, booking, navbar, kartu ruangan, modal, dashboard, feedback, autentikasi, dan modul admin dihapus atau dinormalisasi menjadi Main LT.
- Status Ruangan Hari Ini tetap memakai GET /rooms/schedule, hanya menampilkan booking APPROVED, tanpa data privat, dengan kategori aktif dan akan datang, empty/error state, retry, serta refresh otomatis 60 detik.
- Kalender harian, mingguan, dan bulanan memakai satu sumber jadwal publik API. CalendarGrid tidak lagi membuat request kedua dan tidak menampilkan fallback booking lokal saat schedule gagal.
- Form booking tidak lagi memakai room dummy. Lokasi dikirim sebagai Main LT dan kegagalan API tidak lagi menghasilkan booking lokal seolah-olah berhasil.
- Kartu ruangan memakai placeholder visual aman bila API tidak menyediakan gambar. Field building pada tipe dan database dipertahankan untuk kompatibilitas.
- File utama yang disentuh: `src/app/(public)/page.tsx`, `src/app/(public)/schedule/page.tsx`, `src/app/(user)/dashboard/booking/new/page.tsx`, `src/components/calendar/CalendarGrid.tsx`, `src/components/calendar/CalendarTimeline.tsx`, `src/components/calendar/EventDetailModal.tsx`, `src/components/common/RoomCard.tsx`, `src/components/common/Navbar.tsx`, `src/components/common/Footer.tsx`, `src/lib/api.ts`, `src/lib/public-schedule.ts`, `src/lib/store.ts`, halaman admin/user terkait, dan fixture `src/lib/mockData.ts`.
- Verifikasi: frontend typecheck PASS, Next.js production build PASS (13/13 route), backend typecheck PASS, Prisma validate PASS, dan Jest PASS (5 suite, 18 test). `npm run lint` belum dapat dijalankan karena project belum memiliki konfigurasi ESLint dan `next lint` membuka wizard interaktif; tidak ada konfigurasi baru dibuat.

## Perapian Layout Ruang CBT Multi-Tenant - 17 September 2026

- Denah kursi CBT kini berada di dalam card normal dengan dua blok responsif: **Blok Kiri (1–100)** dan **Blok Kanan (101–200)**.
- Setiap baris memakai CSS Grid 10 kolom dengan ukuran kursi persegi dan jarak konsisten. Pada viewport sempit, scroll hanya terjadi di dalam baris grid sehingga halaman utama tidak ikut melebar.
- Preview CBT pada Home disederhanakan menjadi denah struktural berurutan tanpa status okupansi atau statistik simulasi yang tidak berasal dari API. Status aktual tetap ditampilkan pada halaman CBT berdasarkan data booking yang tersedia.
- Spacing, `min-w-0`, dan padding card dirapikan pada Home serta halaman CBT untuk mencegah tabrakan, clipping, dan overflow pada desktop, tablet, dan mobile.
- Backend, database, alur booking, legend warna, dan fitur pemilihan kursi tidak diubah.
- File terkait: `src/app/(public)/page.tsx`, `src/app/(public)/cbt-room/page.tsx`, `src/components/cbt/CbtSeatMap.tsx`, dan `PROGRESS.md`.
- Verifikasi: `npx tsc --noEmit` PASS, `npm run build` PASS (13/13 route), `git diff --check` PASS. `npm run lint` belum dapat dijalankan karena konfigurasi ESLint belum tersedia dan command membuka wizard interaktif; tidak ada dependency atau konfigurasi baru ditambahkan.

## Restorasi Grid CBT dan Perbaikan Flow Home - 17 September 2026

- Grid `CbtSeatMap` dikembalikan secara manual ke implementasi commit `4e9e20c` (`agoyy cbt`): ukuran kursi `w-8 h-8 / sm:w-9 sm:h-9`, 7 kursi per baris, filler row, wrapper `overflow-x-auto`, dua blok dengan lorong tengah, dan nomor/status/legend tetap memakai logic booking yang sama.
- Preview grid pada section **Ruang CBT Multi-Tenant** di Home juga dikembalikan ke struktur mini-map sebelumnya dengan 7 kolom dan lorong tengah.
- Search bar Home dipindahkan ke normal document flow. Kompensasi padding lama pada area setelah hero dikurangi agar card CBT dimulai setelah search bar dan tidak tertutup oleh `absolute`/`translate` wrapper.
- Backend, database, API, fitur booking, lokasi Main LT, serta bagian Home lain tidak diubah dalam pekerjaan ini.
- File terkait: `src/app/(public)/page.tsx`, `src/components/cbt/CbtSeatMap.tsx`, dan `PROGRESS.md`.
- Verifikasi: `git diff` `CbtSeatMap.tsx` terhadap `4e9e20c` kosong, frontend typecheck PASS, production build PASS (13/13 route), dan `git diff --check` PASS. `npm run lint` masih membuka wizard karena konfigurasi ESLint belum tersedia; tidak ada konfigurasi/dependency baru dibuat.

## Import Master Data Ruangan dari NAMA RUANGAN.pdf - 17 September 2026

- Master data PDF diimpor sebagai 203 record tanpa mengubah ejaan, typo, atau nama `Gedung Baru` pada sumber. Kapasitas kosong/`-` disimpan sebagai `null`; RUANG CBT A/B tersimpan di `Dasar` dengan kapasitas 196/159.
- Model `Room` menambahkan `code` nullable unik, `building` dengan default `Main LT`, dan `capacity` nullable. Relasi booking dan room lama tidak dihapus.
- Seeder memakai data terstruktur dari `backend/prisma/room-master-data.ts`, upsert floor berdasarkan level, ID stabil untuk room tanpa kode, serta laporan konflik. Tujuh room legacy dipertahankan karena masih terhubung ke booking; database berakhir dengan 210 room (203 dari PDF + 7 legacy) dan 23 booking tetap utuh.
- Floor master dari PDF: BASEMENT 80, Dasar 2, lantai 1: 2, 2: 0, 3: 17, 4: 21, 5: 24, 6: 12, 7: 10, 8: 6, 9: 13, 10: 6, 11: 7, 12: 3. Tidak ada kode room duplikat; pengulangan nama+lantai berasal dari banyak room berbeda pada sumber.
- API `/rooms` mengembalikan nama, kode, lokasi, kapasitas, dan floor; filter `floorId` terverifikasi untuk `Dasar`. `/rooms/schedule` tetap public dan hanya mengembalikan field jadwal yang disanitasi.
- Mapper frontend tidak lagi membuat kode, kapasitas, fasilitas, deskripsi, PIC, atau foto sintetis; data room berasal dari response API dengan placeholder hanya saat gambar memang tidak tersedia. Grid CBT dan layout Home tidak disentuh.
- File terkait pekerjaan ini: `backend/prisma/schema.prisma`, `backend/prisma/room-master-data.ts`, `backend/prisma/seed-database.ts`, `backend/prisma/seed-database.spec.ts`, `src/lib/api.ts`, `src/lib/types.ts`, `src/components/common/RoomCard.tsx`, `src/components/calendar/CalendarTimeline.tsx`, `src/app/(user)/dashboard/booking/new/page.tsx`, dan `PROGRESS.md`.
- Verifikasi: `prisma format` PASS, `prisma validate` PASS, `prisma db push` PASS, seed dua kali PASS, backend typecheck PASS, frontend typecheck PASS, dan Jest PASS (5 suite, 18 test). `npm run lint` belum dapat dijalankan karena konfigurasi ESLint belum tersedia dan command membuka wizard interaktif.

## Selector Ruangan Booking Berbasis Availability API - 17 September 2026

- Dropdown native pada form booking diganti dengan combobox yang memuat room langsung dari `GET /rooms`, mendukung pencarian nama/kode tanpa membedakan huruf, filter lantai dari data API, pengelompokan hasil per lantai, scroll internal, klik luar, serta keyboard Arrow Up/Down, Enter, dan Escape.
- Daftar room tidak lagi memakai fallback lokal. Saat daftar room atau availability API gagal, form menampilkan error dan tombol **Coba Lagi** tanpa menyatakan room tersedia.
- Availability diperiksa melalui `GET /rooms/availability` untuk interval Jakarta eksplisit (`+07:00`) dengan maksimal delapan request paralel. Sebelum tanggal dan rentang waktu valid tersedia, UI hanya menampilkan pesan untuk melengkapi jadwal dan tidak mengizinkan pemilihan room sebagai tersedia.
- Room tersedia ditampilkan terlebih dahulu; toggle **Tampilkan ruangan yang tidak tersedia** memperlihatkan room bentrok dalam keadaan disabled dengan status aman **Sudah Dibooking** atau **Sedang Digunakan**. Ringkasan room hanya memuat nama, kode, lantai, kapasitas, dan status.
- Submit melakukan pemeriksaan availability sekali lagi. Respons `409 BOOKING_CONFLICT` menghentikan submit, menyegarkan status availability, dan meminta pengguna memilih room atau waktu lain.
- Alasan desain: combobox tetap berada dalam normal document flow dengan tinggi maksimum dan scroll internal agar 203 room dapat ditelusuri tanpa menutupi field jadwal atau membuat overflow horizontal.
- File terkait: `src/app/(user)/dashboard/booking/new/page.tsx`, `src/lib/api.ts`, `src/lib/types.ts`, `src/lib/utils.ts`, `src/lib/store.ts`, dan `PROGRESS.md`.
- Verifikasi: frontend typecheck PASS, Next.js production build PASS (13/13 route), dan test scheduling backend PASS (2 suite, 10 test). `npm run lint` membuka wizard konfigurasi ESLint karena konfigurasi belum ada, sehingga tidak dijalankan dan tidak ada konfigurasi/dependency baru dibuat.
