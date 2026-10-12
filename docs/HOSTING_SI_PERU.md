# 🚀 Panduan Hosting SIPERU YARSI (`siperu.yarsi.ac.id`)

Dokumen ini menjelaskan arsitektur environment dan tata cara deployment SIPERU YARSI ke server produksi/hosting tanpa perlu ganti-ganti konfigurasi manual.

---

## 📁 Struktur Environment (Local vs Production)

Sistem telah dikonfigurasi agar **berjalan otomatis**:
- Saat Anda menjalankan di komputer lokal (`npm run dev`), sistem otomatis memakai environment **Development / Localhost**.
- Saat Anda build dan jalankan di hosting (`npm run build` & `npm run start`), sistem otomatis memakai environment **Production** (`siperu.yarsi.ac.id`).

### 1. Frontend (Next.js - Root Directory)
| File | Kegunaan | Kapan Aktif? |
| :--- | :--- | :--- |
| `.env.development` | Konfigurasi local (`localhost:3000`, API `localhost:4000/api`) | Otomatis saat `npm run dev` |
| `.env.production` | Konfigurasi hosting domain `https://siperu.yarsi.ac.id` | Otomatis saat `npm run build` & `npm run start` |
| `.env.local` | Override lokal opsional (diabaikan oleh git) | Aktif di mesin lokal Anda |
| `.env.example` | Template dokumentasi variabel | Referensi tim / server baru |

### 2. Backend (NestJS - `backend/`)
| File | Kegunaan | Kapan Aktif? |
| :--- | :--- | :--- |
| `backend/.env.development` | Konfigurasi local (DB localhost, port 4000, CORS dev) | Otomatis saat `NODE_ENV=development` |
| `backend/.env.production` | Konfigurasi hosting (`siperu.yarsi.ac.id`, CORS prod) | Otomatis saat `NODE_ENV=production` |
| `backend/.env` | Konfigurasi aktif lokal default untuk Prisma & NestJS | Diabaikan oleh git |
| `backend/.env.example` | Template variabel backend | Referensi server |

---

## 🛠️ Checklist Sebelum Deploy ke Hosting

Di server VPS (misal Ubuntu 22.04 / Debian):

1. **Database PostgreSQL**:
   Pastikan PostgreSQL terpasang di server. Buat database dan user:
   ```bash
   sudo -u postgres psql
   CREATE DATABASE siperu_yarsi;
   CREATE USER siperu_user WITH ENCRYPTED PASSWORD 'PASSWORD_AMAN_ANDA';
   GRANT ALL PRIVILEGES ON DATABASE siperu_yarsi TO siperu_user;
   \q
   ```

2. **Sesuaikan Kredensial Database & JWT di Server**:
   Di server, Anda cukup membuat/mengisi file `backend/.env` atau `backend/.env.production.local` dengan password DB asli:
   ```env
   DATABASE_URL="postgresql://siperu_user:PASSWORD_AMAN_ANDA@localhost:5432/siperu_yarsi?schema=public"
   JWT_SECRET="KATA_KUNCI_RAHASIA_PANJANG_ACAK_UNTUK_PRODUCTION"
   ```

3. **Migrasi Database Prisma di Server**:
   ```bash
   cd backend
   npm install
   npx prisma generate
   npx prisma db push
   # (Opsional) seed data awal jika perlu:
   # npm run prisma:seed
   cd ..
   ```

---

## ⚡ Langkah Build & Menjalankan dengan PM2

1. **Install Dependencies & Build Project**:
   ```bash
   # Di root project
   npm install
   npm run build

   # Di folder backend
   cd backend
   npm install
   npm run build
   cd ..
   ```

2. **Jalankan Keduanya Sekaligus Menggunakan PM2**:
   File `ecosystem.config.js` sudah disiapkan di root:
   ```bash
   # Install PM2 jika belum ada
   npm install -g pm2

   # Jalankan frontend & backend
   pm2 start ecosystem.config.js

   # Pastikan auto-start saat VPS restart
   pm2 save
   pm2 startup
   ```

3. **Cek Status & Log**:
   ```bash
   pm2 status
   pm2 logs siperu-frontend
   pm2 logs siperu-backend
   ```

---

## 🌐 Konfigurasi Nginx Reverse Proxy (`siperu.yarsi.ac.id`)

Buat konfigurasi Nginx di server (`/etc/nginx/sites-available/siperu.yarsi.ac.id`):

```nginx
server {
    server_name siperu.yarsi.ac.id;

    # Batas ukuran upload file lampiran proposal/dokumen
    client_max_body_size 25M;

    # 1. Routing Frontend Next.js (Port 3000)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 2. Routing Backend API NestJS (Port 4000)
    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 3. Routing Static Uploads (jika diakses via /uploads)
    location /uploads/ {
        proxy_pass http://127.0.0.1:4000/uploads/;
        proxy_set_header Host $host;
    }
}
```

Aktifkan konfigurasi dan pasang SSL gratis Let's Encrypt:
```bash
sudo ln -s /etc/nginx/sites-available/siperu.yarsi.ac.id /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Pasang SSL Certbot HTTPS otomatis
sudo certbot --nginx -d siperu.yarsi.ac.id
```

---

## 💡 Ringkasan Praktis:
- **Di komputer lokal**: Tinggal `npm run dev` atau double-click `jalanin-web.bat`. Otomatis pakai mode local (`localhost:3000` & `localhost:4000`).
- **Di server hosting**: Tinggal git pull, `npm run build`, dan jalankan `pm2 start ecosystem.config.js`. Otomatis aktif dengan domain `siperu.yarsi.ac.id`.
- **Tidak perlu lagi ganti file atau ubah URL manual!**
