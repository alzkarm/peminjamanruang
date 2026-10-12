// Migrasi enum Role backend ke 3 nilai: USER, ADMIN, SUPERADMIN.
// Dijalankan: node prisma/migrate-roles-3.js dari direktori backend/.
const fs = require('node:fs');
const path = require('node:path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function main() {
  loadEnv();
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL tidak ditemukan di backend/.env — migrasi dibatalkan.');
    process.exit(1);
  }
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    try {
      await prisma.$executeRawUnsafe(`ALTER TYPE "Role" ADD VALUE 'ADMIN'`);
    } catch (err) {
      console.log('ADD VALUE ADMIN dilewati:', err.message.split('\n')[0]);
    }
    const upd1 = await prisma.$executeRawUnsafe(
      `UPDATE "users" SET role = 'ADMIN' WHERE role::text IN ('ADMIN_UMUM','ADMIN_LPF','ADMIN_UNIV','ADMIN_YAYASAN','YAYASAN')`,
    );
    const upd2 = await prisma.$executeRawUnsafe(`UPDATE "users" SET role = 'USER' WHERE role::text = 'GUEST'`);
    console.log('Baris legacy->ADMIN:', upd1, '| GUEST->USER:', upd2);
    await prisma.$executeRawUnsafe(`ALTER TABLE "users" ALTER COLUMN role DROP DEFAULT`);
    await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "Role_new"`);
    await prisma.$executeRawUnsafe(`CREATE TYPE "Role_new" AS ENUM ('USER','ADMIN','SUPERADMIN')`);
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "users" ALTER COLUMN role TYPE "Role_new" USING (role::text::"Role_new")`,
    );
    await prisma.$executeRawUnsafe(`DROP TYPE "Role"`);
    await prisma.$executeRawUnsafe(`ALTER TYPE "Role_new" RENAME TO "Role"`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "users" ALTER COLUMN role SET DEFAULT 'USER'::"Role"`);
    console.log('Migrasi role 3-nilai selesai.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Migrasi gagal:', err);
  process.exit(1);
});
