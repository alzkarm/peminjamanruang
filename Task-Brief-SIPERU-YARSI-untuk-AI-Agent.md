# TASK BRIEF: Penyelesaian Gap SIPERU YARSI

## Konteks untuk Agent

Kamu bertugas menyelesaikan proyek **SIPERU YARSI** (Sistem Peminjaman Ruang & Fasilitas). Stack: **Node.js (NestJS) + PostgreSQL (Prisma ORM)** di backend, frontend saat ini masih pakai **Zustand mock data**.

Berikut adalah daftar gap antara progres aplikasi saat ini dan hasil rapat requirements. Kerjakan **sesuai urutan prioritas** di bawah. Setiap task punya acceptance criteria — jangan tandai selesai sebelum semua kriteria terpenuhi.

---

## PRIORITAS 0 (Blocker): Integrasi Frontend ↔ Backend

**Masalah:** Frontend 100% masih pakai mock data (`mockData.ts`), belum ada koneksi nyata ke API.

**Tugas:**
1. Buat service layer terpusat di `src/lib/api.ts` (axios/fetch wrapper + base URL + interceptor auth token).
2. Ganti semua pemanggilan store Zustand yang masih baca dari `mockData.ts` menjadi call ke endpoint NestJS asli:
   - `/auth` (login, refresh token)
   - `/bookings` (CRUD peminjaman)
   - `/approvals` (approve/reject/recommend)
   - `/reports` (export)
3. Pastikan state Zustand tetap dipakai sebagai cache client-side, tapi source of truth-nya API.
4. Tangani loading state & error state di setiap fetch (jangan silent fail).

**Acceptance Criteria:**
- [ ] Tidak ada lagi import dari `mockData.ts` di komponen aktif.
- [ ] Semua CRUD booking berjalan lewat API sungguhan ke PostgreSQL.
- [ ] Auth token tersimpan & dikirim otomatis di setiap request.

---

## PRIORITAS 1: Update Schema Database (Prisma + PostgreSQL)

**Tugas:** Tambahkan/ubah model berikut di `schema.prisma`.

```prisma
model Booking {
  // ...field existing...
  jenisKegiatan   JenisKegiatan
  dokumenUrl      String?        // optional, url dokumen pendukung (proposal/poster)
  logistik        BookingLogistik[]
}

enum JenisKegiatan {
  SEMINAR
  WORKSHOP
  PELATIHAN
  RAPAT
  KUNJUNGAN
  KULIAH_TAMU
  AKREDITASI
  LAINNYA
}

model BookingLogistik {
  id          String   @id @default(uuid())
  bookingId   String
  booking     Booking  @relation(fields: [bookingId], references: [id])
  jenisItem   String   // "meja", "kursi", "colokan_listrik", dll
  jumlah      Int
  catatan     String?
}

model ApprovalLog {
  // ...field existing...
  status      ApprovalStatus   // pastikan enum punya: DIREKOMENDASIKAN, DISETUJUI, DIKEMBALIKAN, DITOLAK
  catatan     String?          // WAJIB diisi jika status = DIKEMBALIKAN atau DITOLAK
}
```

**Tugas tambahan:**
- Buat migration: `npx prisma migrate dev --name add_jenis_kegiatan_logistik_dokumen`
- Update DTO & validasi di NestJS (`class-validator`) agar `catatan` **required** ketika status `DIKEMBALIKAN`/`DITOLAK`, dan optional untuk status lain.

**Acceptance Criteria:**
- [ ] Migration berhasil jalan di PostgreSQL tanpa error.
- [ ] Field baru muncul & bisa diisi lewat API.
- [ ] Validasi backend menolak request approval "Dikembalikan"/"Ditolak" tanpa catatan (return 400).

---

## PRIORITAS 2: Alur Approval Dual-Tier + Status "Direkomendasikan"

**Konteks bisnis:** Untuk **Auditorium & Ruang Workshop**, Admin LPF/Univ tidak bisa langsung approve — hanya bisa set status **"Direkomendasikan"**, yang lalu memicu notifikasi ke Admin Yayasan (Bu Ari/Bu Santi) untuk approval final.

**Tugas:**
1. Di state machine backend, tambahkan state `DIREKOMENDASIKAN` khusus untuk booking dengan ruangan bertipe `AUDITORIUM` atau `WORKSHOP`.
2. Saat Admin LPF/Univ submit approval untuk ruangan jenis ini, sistem otomatis set status `DIREKOMENDASIKAN` (bukan `DISETUJUI`).
3. Trigger notifikasi (in-app dan/atau email) ke role Admin Yayasan saat status berubah jadi `DIREKOMENDASIKAN`.
4. Admin Yayasan punya action approve/reject final dari status ini.
5. Untuk ruangan selain Auditorium/Workshop, alur approval tetap single-tier seperti biasa (LPF langsung approve/reject).
6. Frontend: tampilkan badge/label "Direkomendasikan - Menunggu Yayasan" di dashboard admin & user.

**Acceptance Criteria:**
- [ ] Booking Auditorium/Workshop tidak bisa langsung berstatus "Disetujui" oleh Admin LPF.
- [ ] Notifikasi ke Admin Yayasan terkirim otomatis.
- [ ] Riwayat status tercatat lengkap di `ApprovalLog`.

---

## PRIORITAS 3: Dialog Catatan Wajib untuk Revisi/Penolakan

**Tugas:**
1. Frontend: buat modal/dialog yang muncul saat admin (LPF atau Yayasan) memilih aksi "Dikembalikan" atau "Ditolak".
2. Modal wajib punya textarea catatan, tombol submit disabled jika kosong.
3. Submit modal memanggil endpoint approval dengan payload `{ status, catatan }`.
4. Catatan ditampilkan ke user peminjam di halaman detail booking mereka.

**Acceptance Criteria:**
- [ ] User tidak bisa submit reject/revisi tanpa mengisi catatan (validasi frontend + backend).
- [ ] Catatan tersimpan di `ApprovalLog` dan tampil di UI user.

---

## PRIORITAS 4: Form Digital Terpadu

**Konteks bisnis:** Gantikan 3 form fisik lama (Surat Pernyataan, Form Pemakaian Fasilitas, Form Kelengkapan) jadi satu form digital.

**Tugas:**
1. Pastikan multi-step form peminjaman mencakup semua field dari ketiga form fisik lama tersebut (cek dokumen fisik existing kalau ada, atau minta klarifikasi field apa saja).
2. Tambahkan dropdown **Jenis Kegiatan** dengan opsi: Seminar, Workshop, Pelatihan, Rapat, Kunjungan, Kuliah/Kuliah Tamu, Akreditasi, Lainnya — terhubung ke enum `JenisKegiatan` di schema.
3. Tambahkan step upload dokumen pendukung (Proposal/Poster) — **optional**, format PDF/gambar, terhubung ke field `dokumenUrl`. Simpan file ke storage (tentukan: local disk / S3-compatible / lainnya sesuai infra yang tersedia) dan simpan URL-nya saja di DB.
4. Tambahkan step input logistik/fasilitas tambahan (meja, kursi, colokan listrik) — terhubung ke model `BookingLogistik`. Bisa lebih dari satu item dengan jumlah masing-masing.

**Acceptance Criteria:**
- [ ] Form bisa submit lengkap dengan jenis kegiatan, dokumen (optional), dan logistik.
- [ ] Data tersimpan benar di ketiga tabel terkait (`Booking`, `BookingLogistik`, field `dokumenUrl`).

---

## PRIORITAS 5: Verifikasi Internal Sebelum Input (HIMA/BEM)

**Konteks bisnis:** Pengajuan dari HIMA/BEM harus disetujui internal fakultas/kemahasiswaan dulu sebelum staf menginputnya ke sistem.

**Tugas:**
- Ini kemungkinan besar **proses manual di luar sistem** (bukan fitur yang perlu dibangun), tapi pastikan:
  - Ada field/checkbox di form "Sudah disetujui internal fakultas/kemahasiswaan (Y/N)" yang wajib dicentang staf input sebelum submit.
  - Field ini disimpan sebagai bukti audit, bukan alur approval baru.

**Acceptance Criteria:**
- [ ] Checkbox konfirmasi tersedia dan wajib dicentang sebelum submit booking oleh staf.

---

## PRIORITAS 6: Fitur Cancel + Audit Log

**Tugas:**
1. Endpoint `PATCH /bookings/:id/cancel` — set status booking jadi `DIBATALKAN`.
2. Saat cancel berhasil, slot di kalender **langsung kosong secara real-time** (gunakan websocket/polling/refetch — sesuaikan dengan arsitektur real-time yang sudah ada, atau tambahkan jika belum ada).
3. Simpan history pembatalan (siapa yang cancel, kapan, alasan jika ada) ke tabel log terpisah atau extend `ApprovalLog`.
4. History ini **hanya bisa dilihat admin**, bukan dihapus dari DB.

**Acceptance Criteria:**
- [ ] Setelah cancel, kalender update tanpa perlu refresh manual.
- [ ] Data booking yang dibatalkan tetap ada di DB (soft-cancel, bukan delete) untuk audit.

---

## PRIORITAS 7: Guest Mode & Dashboard "Hari Ini"

**Tugas:**
1. Pastikan rute `(public)/` (Beranda & Kalender) bisa diakses **tanpa login**, hanya menampilkan status ketersediaan ruangan per lantai/tanggal (read-only, tanpa data pribadi peminjam).
2. Buat view/dashboard khusus untuk role CS/Security/Sekretaris Rektor yang defaultnya menampilkan **semua aktivitas hari ini** (filter tanggal = hari ini secara default, tanpa perlu setting filter manual).

**Acceptance Criteria:**
- [ ] Guest bisa lihat kalender ketersediaan tanpa login.
- [ ] Role CS/Security/Rektorat langsung lihat data hari ini saat pertama buka dashboard.

---

## Catatan Umum untuk Agent

- Gunakan **PostgreSQL** sebagai database (bukan SQLite) — pastikan `DATABASE_URL` di `.env` mengarah ke PostgreSQL dan `provider` di `schema.prisma` adalah `postgresql`.
- Setiap perubahan schema wajib disertai migration file, jangan edit DB manual.
- Tulis/​update test (unit atau e2e) untuk setiap endpoint baru, minimal test untuk validasi catatan wajib (Prioritas 1 & 3).
- Setelah selesai satu prioritas, jalankan build + test sebelum lanjut ke prioritas berikutnya.
- Jika ada requirement yang ambigu (misal: field form fisik lama, pilihan storage untuk upload dokumen), **tanyakan ke user**, jangan asumsi sendiri.

---

## Checklist Final (centang saat semua prioritas selesai)

- [ ] P0 — Integrasi Frontend-Backend
- [ ] P1 — Schema Database (jenisKegiatan, dokumenUrl, logistik, catatan wajib)
- [ ] P2 — Approval Dual-Tier + status "Direkomendasikan"
- [ ] P3 — Dialog catatan wajib revisi/penolakan
- [ ] P4 — Form Digital Terpadu (dropdown, upload, logistik)
- [ ] P5 — Verifikasi internal HIMA/BEM (checkbox konfirmasi)
- [ ] P6 — Cancel real-time + audit log
- [ ] P7 — Guest Mode + Dashboard Hari Ini
