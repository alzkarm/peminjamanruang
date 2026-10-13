const path = require('path');
const { PrismaClient } = require(path.resolve(__dirname, '../backend/node_modules/@prisma/client'));
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:postgres@localhost:5432/siperu_yarsi?schema=public"
    }
  }
});

async function check() {
  try {
    const indexes = await prisma.$queryRawUnsafe(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'bookings';
    `);
    console.log('BOOKINGS INDEXES:', JSON.stringify(indexes, null, 2));

    const columns = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bookings';
    `);
    console.log('BOOKINGS COLUMNS:', columns.map(c => c.column_name).join(', '));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
