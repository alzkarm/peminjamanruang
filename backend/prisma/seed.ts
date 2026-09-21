import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedDatabase } from './seed-database';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);
  await seedDatabase(prisma, passwordHash);
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
