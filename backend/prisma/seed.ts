import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { seedDatabase } from './seed-database';

const prisma = new PrismaClient();

async function main() {
  const envPassword = process.env.SEED_ADMIN_PASSWORD || process.env.DEFAULT_SEED_PASSWORD;
  const isGenerated = !envPassword;
  const seedPassword = envPassword || `Yarsi@${randomBytes(8).toString('base64url')}2026!`;

  if (isGenerated) {
    console.warn('================================================================');
    console.warn('[SECURITY NOTICE] SEED_ADMIN_PASSWORD belum diatur di .env.');
    console.warn(`Generated random seed password: ${seedPassword}`);
    console.warn('Flag mustChangePassword diset ke true untuk akun berhak akses.');
    console.warn('================================================================');
  }

  const passwordHash = await bcrypt.hash(seedPassword, 10);
  await seedDatabase(prisma, passwordHash, { mustChangePassword: true });
  console.log('Seed data SIPERU YARSI siap digunakan.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
