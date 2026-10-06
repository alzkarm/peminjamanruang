# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Civitas Universitas YARSI** — mahasiswa, dosen, dan tenaga kependidikan (tendik) yang mengajukan dan memantau peminjaman ruang kampus untuk kegiatan akademik dan organisasi. Mereka bekerja dari HP/laptop, berbahasa Indonesia (UI sepenuhnya dalam Bahasa Indonesia), zona waktu WIB. Pengunjung anonim ("Mode Tamu") boleh melihat beranda, status ruangan hari ini, dan kalender publik; peminjaman membutuhkan akun.
- **Biro Layanan Pengelolaan Fasilitas (LPF)** — admin universitas yang memverifikasi kelengkapan dan kesiapan fasilitas tiap permohonan (ruang reguler disetujui di tingkat ini; ruang khusus direkomendasikan ke Yayasan).
- **Admin Umum** — verifikator ruang umum (reguler, lab, CBT); laporan di seluruh kampus diteruskan ke Superadmin.
- **Superadmin / Sekretariat Yayasan YARSI** — keputusan akhir untuk ruang khusus (Auditorium Ar-Rahman 700 pax, Ar-Razi 350 pax, Ruang Senat) dan pengelolaan master data (pengguna whitelist, ruang, fakultas, fasilitas).
- **Petugas keamanan / LPF di lantai** — memverifikasi E-Ticket dan QR Code fisik di lokasi.

## Product Purpose

SIPERU adalah sistem reservasi ruang kampus terpadu Universitas YARSI yang menggantikan alur manual peminjaman: cek ketersediaan real-time, ajukan permohonan digital, verifikasi berjenjang, terbit E-Ticket + QR yang valid untuk akses fisik, dan evaluasi pasca-pakai. Keberhasilan = permohonan ruang yang sah terselesaikan dari pengajuan sampai pelaksanaan tanpa bentrok jadwal dan tanpa kertas.

## Positioning

Reservasi ruang universitas dengan engine bebas-bentrok (atomic collision detection) plus state machine persetujuan dua tingkat (LPF → Yayasan untuk ruang khusus) dan ticket fisik QR yang diverifikasi di lokasi — bukan sekadar kalender bersama. Mendukung CBT multi-tenant per-fakultas dengan alokasi rentang kursi terisolasi, dan pemblokiran jadwal kuliah semester massal.

## Operating Context

- Semua teks UI dan alur kerja berbahasa Indonesia; waktu operasional WIB.
- Alur normal: login SSO → cek kalender/ketersediaan → isi formulir multi-langkah (ruang, tanggal-sesi, kegiatan, logistik, lampiran) → antrean LPF → (ruang khusus) rekomendasi ke Yayasan → setuju → E-Ticket QR → check-in di lokasi → feedback 3 kriteria (Kebersihan, Fasilitas/AV, Keramahan Petugas) → selesai.
- Status booking: `PENDING_LPF`, `VERIFIED`, `RECOMMENDED_YAYASAN`, `APPROVED`, `COMPLETED`, `REJECTED`, `CANCELLED`, `RETURNED` (dikembalikan untuk revisi), `RESCHEDULE_PENDING`, `ACADEMIC_BLOCKED`, `EXPIRED`, `NO_SHOW`.
- Konsekuensi: no-show memicu sanksi cooling-down (pengajuan baru ditangguhkan sementara); pembatalan/pindah jadwal oleh pemohon, pindah jadwal memerlukan tinjauan LPF.
- Admin bekerja desktop-first (sidebar + antrean kartu); mahasiswa banyak di HP (form multi-langkah, QR check-in).
- Runbook dev: `npm run dev` (frontend, port 3000), backend NestJS di `backend/` (port 4001 di demo); seeder menyediakan akun demo & data ruang/lantai.

## Capabilities and Constraints

- **Kapabilitas**: kalender interaktif (day/week/month) dengan matriks ruang; status ruangan hari ini + polling 60 detik; pencarian & filter lantai; collision detection atomik; approval dua tingkat dengan catatan wajib (alasan tolak/revisi); bulk approve; pengelompokan sesi rutin per semester (recurring & academic bulk 16–18 minggu); E-Ticket + QR (verifikasi publik di `/verify/[code]`); ekspor laporan Excel/XLSX dan cetak PDF (klien, via `xlsx`), export Google Calendar/iCal; Umpan balik pasca pakai; sanksi no-show; CBT multi-tenant per-fakultas dengan peta kursi (CBT A/B) dan status per booking; maintenance downtime scheduler; runsheet harian; whitelist user + role (mahasiswa/dosen/tendik/admin_lpf/admin_umum/admin_yayasan/superadmin).
- **Teknis**: Next.js 14 App Router; Tailwind v3 dengan palet token `yarsi` + `darkMode: "class"`; font Inter via `next/font`; state global Zustand; API layer terpusat `src/lib/api.ts` (token JWT di localStorage, key `siperu_yarsi_auth_token`); backend NestJS + Prisma tidak boleh diubah pada sesi audit ini. Endpoint API dikonfigurasi lewat `NEXT_PUBLIC_API_URL`.
- **Terminologi** (jangan diganti): ruang "khusus" (Auditorium Ar-Rahman, Ar-Razi, Ruang Senat) vs ruang "umum"; LPF; "sesi"; `bookingCode`; `passToken`.

## Brand Commitments

- Nama: **SIPERU YARSI** — "Sistem Informasi Peminjaman Ruangan Terpadu", universitas **YARSI [Yayasan Rumah Sakit Islam Indonesia]** (README menyebut "Smart Campus Universitas YARSI").
- Identitas visual yang sudah terkunci di kode (lihat DESIGN.md): emerald "YARSI" (primary `#006A4E`) sebagai warna institusi; motif arsitektural bangunan YARSI pada hero; tipografi Inter; asimetri radius sudut khas; badge role berwarna per peran.
- Bahasa: Bahasa Indonesia formal kampus.

## Evidence on Hand

- `README.md` — fitur, arsitektur, akun demo (mahasiswa `1402022001`, dosen `0314058201`, `lpf.admin`, `yayasan.admin`; password `password123`), kapasitas ruang khusus.
- `backend/prisma/seed-database.ts` — akun dan role sebenarnya (termasuk `admin.umum`, `superadmin`).
- `tailwind.config.ts` — palet `yarsi` dan token shadow/font resmi.
- Asset visual: `public/images/building-yarsi.png`, `yarsi-building-*.png` (render bangunan).
- Demo live: `http://localhost:3000` (frontend), API `http://192.168.100.110:4001`.
- Audit teknis tamat (lihat laporan): detektor `impeccable detect` 89 temuan; verifikasi DOM live untuk overflow & kontras.

## Product Principles

1. **Kebenaran jadwal adalah segalanya** — engine bebas-bentrok dan status yang dapat diaudit (log approval, alasan, audit trail) tidak boleh dikorbankan demi kecepatan UI.
2. **Alur dua tingkat tidak boleh dipendekkan** — pemisahan kewenangan LPF vs Yayasan/Superadmin dijaga bahkan di tampilan (isolasi filter per role di client).
3. **Bukti fisik = kepercayaan** — E-Ticket, QR check-in, dan halaman verifikasi publik adalah momen kebenaran produk; harus selalu dapat diverifikasi tanpa login.
4. **Kelengkapan sebelum keputusan** — catatan wajib pada tolak/revisi dan cek konflik didahulukan dari tombol aksi.
5. **Bahasa Indonesia yang lugas** — microcopy kampus yang langsung dipahami mahasiswa dan staf, tanpa jargon teknis.

## Accessibility & Inclusion

- Tidak ada standar aksesibilitas khusus yang terdokumentasi di repo. Kode menunjukkan usaha nyata: `lang="id"`, dark mode (class + prefers-color-scheme), `aria-label`/`sr-only` pada banyak kontrol, focus ring (`focus-visible`/`focus:ring`), modal dengan focus trap dan fokus restorasi, dan label pada input. Temuan audit: teks kecil 8–11px dengan `text-slate-400` kontras ~2.5:1 di mode terang (gagal WCAG AA 1.4.3) — lihat laporan audit. Asumsi perlu konfirmasi: apakah institusi menetapkan standar WCAG tertentu atau kebutuhan khusus nyata (mis. ukuran teks lebih besar untuk dosen senior).