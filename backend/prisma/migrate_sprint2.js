const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Applying Sprint 2 Database Schema Updates ---');

  // 1. Enum values
  console.log('Adding enum values to BookingStatus...');
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'RESCHEDULE_PENDING';`);
    console.log('Added RESCHEDULE_PENDING');
  } catch (e) {
    console.log('RESCHEDULE_PENDING note:', e.message);
  }

  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'NO_SHOW';`);
    console.log('Added NO_SHOW');
  } catch (e) {
    console.log('NO_SHOW note:', e.message);
  }

  // 2. Booking columns for reschedule
  console.log('Adding reschedule columns to bookings table...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "bookings" 
    ADD COLUMN IF NOT EXISTS "rescheduleReason" TEXT,
    ADD COLUMN IF NOT EXISTS "originalSchedule" TEXT;
  `);

  // 3. Room Maintenance table
  console.log('Creating room_maintenances table...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "room_maintenances" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "roomId" UUID NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "startTime" TIMESTAMPTZ(3) NOT NULL,
      "endTime" TIMESTAMPTZ(3) NOT NULL,
      "createdBy" TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "room_maintenances_roomId_startTime_endTime_idx" 
    ON "room_maintenances"("roomId", "startTime", "endTime");
  `);

  // 4. User Penalties table
  console.log('Creating user_penalties table...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "user_penalties" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "reason" TEXT NOT NULL,
      "bookingId" UUID REFERENCES "bookings"("id") ON DELETE SET NULL,
      "penaltyPoints" INT NOT NULL DEFAULT 1,
      "coolingDownUntil" TIMESTAMPTZ(3) NOT NULL,
      "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
      "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "user_penalties_userId_isActive_idx" 
    ON "user_penalties"("userId", "isActive");
  `);

  console.log('--- Sprint 2 Database Schema Updates Applied Successfully! ---');
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
