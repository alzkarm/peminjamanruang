# Design

> Rekam sistem visual incumbent (dokumentasi, bukan arah baru) — diambil dari kode pada 2026-10-06 via audit impeccable. Mode permukaan: **Operate** (dashboard/admin) + **Persuade** (beranda).

## Tokens

Sumber: `tailwind.config.ts` + `src/app/globals.css`.

- **Palet `yarsi`** (emerald institusi): `primary #006A4E`, `dark #075240`, `darker #043026`, `light #E8F8F5`, `accent #10B981`, `muted #F0FDF9`, `gold #D97706`, `amber #F59E0B`, `sky #0284C7`, `rose #EF4444`, `border #D1E7DD`.
- **Netral**: slate mentah Tailwind (`slate-50` canvas, `slate-900` ink, `slate-400/500` teks sekunder) — paling banyak dipakai di halaman operasi; alih-alih token yarsi yang ada.
- **Warna semantik peran/status**: emerald (setuju/aktif), amber (pending/sanksi), rose (tolak/batal), indigo/blue/purple (Admin Umum, Superadmin, jadwal akademik, CBT), teal (rutin/recurring). Ditulis langsung sebagai kelas Tailwind mentah (`text-purple-900`, `bg-blue-50`, dst.), bukan lewat token.
- **Dark mode**: `darkMode: "class"`; ground `#0b1120` (slate-950), kartu `slate-900`, border `slate-700/800`, aksen emerald `emerald-400/500`; toggle + inisialisasi dari prefers-color-scheme.

## Type

- Satu keluarga wajah: **Inter** (`next/font`, variabel `--font-inter`, `display: swap`) untuk heading dan body; mono `font-mono` untuk kode booking/waktu.
- Heading: `font-black`/`font-extrabold` + `tracking-tight`, ukuran 18–34px; body 12–14px.
- Skala mikro menonjol: 227× `text-[10px]`, 211× `text-[11px]`, 33× `text-[8px]–[9.5px]` (badge, meta, label kartu). Ini adalah keputusan incumbent yang menekan keterbacaan (gagal AA di mode terang, lihat audit).
- Kicker/seksi: 10–11px uppercase `tracking-[0.14em–0.15em]`.

## Bentuk & permukaan

- **Asimetri radius khas**: kartu header `rounded-[18px_4px_18px_18px]`, wadah besar `rounded-[22px_6px_22px_22px]` / `rounded-3xl`, `search-console` `1.15rem 0.35rem`, logo `rounded-[11px_3px_11px_11px]`; kartu isi `rounded-xl/2xl`.
- **Side-tab accent**: `border-l-4 border-l-yarsi-primary` pada kartu header dashboard/approvals/reports (tell AI yang terdeteksi).
- Kanvas `bg-[#f4f7f5]`/`#f5f8f6` (hijau sangat pucat) atau `slate-50`; kartu putih `shadow-sm` + shadow kustom emerald; `glass-panel` + backdrop-blur; grain/contour/asimetri pada hero dalam `globals.css` (`hero-architectural-grid`, `contour-lines`, `building-perspective`).
- **Gradien**: emerald stack (`from-yarsi-dark via-yarsi-primary to-emerald-900`, `from-emerald-900 via-teal-900 to-cyan-950` untuk banner CBT, `from-emerald-600 to-teal-700` untuk banner jadwal mendatang). Tidak ada gradien ungu-biru pada halaman kunci; ungu hadir sebagai aksen status (purple/indigo), bukan gradien.
- **Icon tile**: ikon dalam kotak `rounded-xl` emerald-50 / ungu-50 / amber-50 di KPI (pattern "rounded-square icon tile").

## Komponen

- Kartu booking/approval: judul + bookingCode mono badge emerald + StatusBadge; meta baris dengan ikon lucide; blok info recurring teal; kolom kanan aksi (kolom aksi di dalam kartu approval = kartu-dalam-kartu).
- StatusBadge (10–12px pill, warna per status, varian sm/md).
- Modal umum: focus trap + Escape + focus restore, `rounded-[18px_4px_18px_18px]`, header gradien slate→emerald.
- Stepper approval (lingkaran + garis progres emerald), E-Ticket card (gradien emerald gelap + QR putih), filter tabs (pill aktif emerald solid), tab strip `overflow-x-auto`.
- Kalender: event blocks berwarna per status (emerald approved / amber pending / purple akademik), `border-l-4` pada blok akademik; timeline/hari vs grid minggu/bulan.
- Skeleton loading (animate-pulse) & empty states berilustrasi ikon.

## Motion

- `fadeIn` 0.2s dan `slideUp` 0.3s (masuk modal/panel), `pulse-slow`, live dot `animate-ping`, progress bar `transition-all duration-700`. Tidak ada animasi berat; sensitivitas `prefers-reduced-motion` tidak ditangani eksplisit.

## Layout & responsif

- Kanvas `max-w-7xl` (beranda `max-w-[1376px]`); grid 12 kolom; kartu KPI `sm:grid-cols-2 lg:grid-cols-4`; admin layout sidebar kiri + konten (collapse pada <lg).
- Breakpoint: `min-[420px]`, `sm` 640, `md` 768, `lg` 1024, `xl` 1280. Tab strip pakai `overflow-x-auto` (scroll aman di mobile).
- **Masalah terverifikasi**: Navbar global meluap horizontal pada 768–1024px (scrollWidth 1066–1256 vs viewport) karena nav desktop + kluster kanan tidak muat; 320/375/1280+ bersih. Touch target: tombol utama `min-h-11` (44px, baik), tapi link aksi teks (`py-1`, 28px) di dashboard kecil.
