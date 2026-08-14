# SIPERU YARSI - Sistem Informasi Peminjaman Ruangan Terpadu

> **Smart Campus Universitas YARSI**  
> Platform digital terintegrasi untuk reservasi, manajemen, dan pemanfaatan ruangan kampus (Auditorium Ar-Rahman, Ar-Razi, Ruang Senat, Smart Classrooms, dan Laboratorium AI) berbasis real-time calendar, LDAP Single Sign-On (SSO), multi-level approval, bulk semester scheduler, dan streaming report.

---

## 🏛️ Fitur Utama

- 📅 **Interactive Calendar Engine (Google Calendar Concept):** Matriks ruangan harian, timeline mingguan, dan kalender bulanan.
- 🔐 **LDAP SSO Authentication & Role Mapping:** Mendukung otentikasi akun resmi YARSI (Mahasiswa, Dosen, Admin LPF, Admin Yayasan).
- 🛡️ **Dual-Tier State Machine Approval:**
  - Ruang Reguler: Verifikasi dan persetujuan langsung oleh **Biro Layanan Pengelolaan Fasilitas (LPF)**.
  - Ruang Khusus (Auditorium Ar-Rahman 700 pax, Ar-Razi 350 pax, Ruang Senat): Rekomendasi LPF diteruskan ke **Sekretariat Yayasan YARSI**.
- ⚡ **Collision-Proof Transaction Engine:** Deteksi dan pencegahan jadwal bentrok (*double-booking* / *race condition*) secara atomik.
- 🎓 **Semester Academic Timetable Bulk Blocker:** Penguncian massal ruang kuliah semester (16–18 minggu) dengan pengecualian akhir pekan.
- 📊 **Streaming Excel (.xlsx) Reports & Analytics:** Ekspor data rekapitulasi berbasis streaming memory-efficient menggunakan ExcelJS.
- ⭐ **Post-Usage Evaluation:** Evaluasi 3 kriteria (Kebersihan, Fasilitas/AV, Keramahan Petugas) pasca penggunaan ruangan.
- 🎫 **E-Ticket & QR Code Access Token:** Tiket digital resmi untuk verifikasi keamanan di lokasi.

---

## 🏗️ Struktur Arsitektur

```text
peminjaman-ruang/
├── src/                                  # Frontend: Next.js (App Router), TypeScript, Tailwind CSS, Zustand
│   ├── app/
│   │   ├── (public)/                     # Beranda, Kalender Interaktif, SSO Login
│   │   ├── (user)/dashboard/             # Tracker Peminjaman, Multi-step Form, Feedback
│   │   └── (admin)/admin/                # Antrean LPF, Antrean Yayasan, Bulk Blocker, Laporan
│   └── components/                       # Komponen Desain YARSI Emerald
│
└── backend/                              # Backend: NestJS, TypeScript, Prisma ORM, ExcelJS, Passport
    ├── prisma/
    │   ├── schema.prisma                 # Schema Database (PostgreSQL & SQLite)
    │   └── seed.ts                       # Seeder Lantai, Ruangan, Pengguna Demo & Sesi
    └── src/
        ├── auth/                         # SSO LDAP, JWT Strategy & Auto-Provisioning
        ├── rooms/                        # Manajemen Ruang, Lantai & Ketersediaan
        ├── bookings/                     # Mesin Transaksi Bebas Bentrok & Multi-Level State Machine
        ├── academic-bulk/                # Generator Jadwal Kuliah Semester
        ├── reports/                      # Streaming XLSX Exporter & Dashboard Analytics
        └── feedbacks/                    # Evaluasi Layanan Pasca Pakai
```

---

## 🚀 Panduan Menjalankan Aplikasi

### 1. Menjalankan Frontend (Next.js)

```bash
# Di root direktori peminjaman-ruang/
npm install
npm run dev
```

Buka browser di: **[http://localhost:3000](http://localhost:3000)**

### 2. Menjalankan Backend (NestJS)

```bash
cd backend
npm install
npx prisma db push
npx ts-node prisma/seed.ts
npm run start:dev
```

Backend API aktif di: **[http://localhost:4000/api](http://localhost:4000/api)**

---

## 👥 Akun Demo LDAP SSO

| Role | Username / NIM / NIDN | Password | Keterangan |
| :--- | :--- | :--- | :--- |
| **Mahasiswa** | `1402022001` | `password123` | Ahmad Fikri Pratama (BEM FTI) |
| **Dosen** | `0314058201` | `password123` | Dr. dr. Siti Nurhaliza, Sp.A (FK) |
| **Admin Univ (LPF)** | `lpf.admin` | `password123` | Bambang Sudibyo, S.T. (LPF) |
| **Admin Yayasan** | `yayasan.admin` | `password123` | Drs. H. Muhammad Shadiq (Yayasan) |

---

## 📄 Lisensi
Hak Cipta © 2026 Universitas YARSI & Yayasan YARSI.
