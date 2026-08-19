# Status Pengerjaan: SIPERU YARSI

Dokumen ini mencatat perkembangan sistem peminjaman ruangan kampus YARSI.

---

## 📌 Status Terkini

- **Tanggal Pembaruan**: 19 Agustus 2026
- **Kondisi Aplikasi**: 
  - Backend (NestJS) dan Frontend (Next.js 14) 100% lolos kompilasi (`0 Error`).
  - Penanganan Timezone WIB (UTC+7) sinkron dan presisi antara formulir input, kalender, dan database.
  - Alur persetujuan dual-tier (LPF & Yayasan) beserta validasi catatan wajib penolakan/revisi berjalan optimal.
  - Fitur pembatalan peminjaman dan integrasi jadwal kuliah massal (*academic bulk*) aktif.

---

## ✅ Yang Baru Selesai Dikerjakan

1. **Sinkronisasi Presisi Timezone & Jadwal Kuliah Massal**:
   - Memperbaiki parsing tanggal & waktu di service layer dan store agar waktu input (WIB) tidak mengalami pergeseran +7 jam.
   - Menyelaraskan kontrak API `academic-bulk` antara DTO NestJS dan Next.js client, serta membuka akses baca jadwal publik tanpa hambatan otorisasi.

2. **Alur Persetujuan Bertingkat (*Dual-Tier Approval*)**:
   - Ruang reguler disetujui langsung oleh Admin LPF.
   - Ruang khusus (Auditorium Ar-Rahman, Ar-Razi, Ruang Senat) otomatis dialihkan ke status `RECOMMENDED` untuk persetujuan final Sekretariat Yayasan YARSI.

3. **Validasi Catatan Alasan Wajib**:
   - Form dan backend mewajibkan pengisian catatan/alasan saat status permohonan diubah menjadi `REJECTED` (Ditolak) atau `RETURNED` (Perlu Revisi).

4. **Fitur Pembatalan Peminjaman (*Cancel Booking*)**:
   - Peminjam atau admin dapat membatalkan reservasi dengan pencatatan jejak audit (*Audit Log*) otomatis.

5. **Penyederhanaan Teks & UI Login Responsif**:
   - Seluruh istilah asing telah diganti ke bahasa Indonesia formal kampus dan kartu login sudah proporsional.

---

## 📋 Status Rencana Kerja

- [x] **1. Alur Persetujuan Bertingkat**: Ruang reguler LPF vs Ruang khusus Yayasan.
- [x] **2. Catatan Alasan Wajib**: Dialog & validasi backend untuk revisi/penolakan.
- [x] **3. Fitur Batal Pinjam**: Pembatalan reservasi langsung tercatat di riwayat log.
- [x] **4. Mode Layanan Publik / Tamu**: Akses kalender interaktif untuk civitas & tamu umum.
- [x] **5. Sinkronisasi API & Presisi Waktu (WIB)**: Integrasi backend-frontend bebas pergeseran jam.

---

## 📂 Berkas yang Terkini Dirapikan

- Service Layer API (`src/lib/api.ts`)
- Global State Store (`src/lib/store.ts`)
- Backend Controller Jadwal Massal (`backend/src/academic-bulk/academic-bulk.controller.ts`)
- Backend Service Jadwal Massal (`backend/src/academic-bulk/academic-bulk.service.ts`)
- PROGRESS.md
