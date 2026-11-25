const { execSync } = require('child_process');
require('dotenv').config();

console.log('--- Setup Database SIPERU YARSI (MariaDB / MySQL) ---');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@') : '(tidak ditemukan)');

try {
  console.log('\n[1/3] Menjalankan Prisma Generate...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  console.log('\n[2/3] Menerapkan Skema ke Database (Prisma DB Push)...');
  execSync('npx prisma db push', { stdio: 'inherit' });

  console.log('\n[3/3] Melakukan Seeding Data Awal...');
  execSync('npx ts-node prisma/seed.ts', { stdio: 'inherit' });

  console.log('\n🎉 Setup database MariaDB / MySQL SIPERU YARSI 100% Selesai & Siap!');
} catch (err) {
  console.error('\n❌ Gagal setup database:', err.message);
  process.exit(1);
}

