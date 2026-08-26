import { seedDatabase } from './seed-database';

type Row = Record<string, any>;

function makeDelegate(unique: (row: Row) => string) {
  const rows: Row[] = [];
  return {
    rows,
    async upsert({ where, update, create }: any) {
      const key = Object.values(where)[0];
      let row = rows.find((candidate) => Object.values(where).every((value) => Object.values(candidate).includes(value)));
      if (row) Object.assign(row, update);
      else {
        row = { id: `${unique(create)}-id`, ...create };
        rows.push(row);
      }
      return row;
    },
    async findFirst({ where }: any) {
      return rows.find((row) => matches(row, where)) ?? null;
    },
    async findUnique({ where }: any) {
      return rows.find((row) => matches(row, where)) ?? null;
    },
    async create({ data }: any) {
      const row = { id: `${unique(data)}-${rows.length + 1}`, ...data };
      rows.push(row);
      return row;
    },
  };
}

function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([key, expected]) => {
    if (row[key] instanceof Date && expected instanceof Date) {
      return row[key].getTime() === expected.getTime();
    }
    if (expected && typeof expected === 'object' && 'equals' in expected) {
      return row[key] === expected.equals;
    }
    return row[key] === expected;
  });
}

function createSeedClient() {
  const floor = makeDelegate((row) => row.name);
  const room = makeDelegate((row) => row.name);
  const user = makeDelegate((row) => row.username);
  const booking = makeDelegate((row) => `${row.title}-${new Date(row.startTime).toISOString()}`);
  const approvalLog = makeDelegate((row) => `${row.bookingId}-${row.toStatus}`);
  const feedback = makeDelegate((row) => row.bookingId);

  return {
    floor,
    room,
    user,
    booking,
    approvalLog,
    feedback,
  };
}

describe('seedDatabase', () => {
  it('is additive and repeatable without deleting operational rows', async () => {
    const prisma = createSeedClient();

    await seedDatabase(prisma as any, 'test-password-hash');
    const firstCounts = {
      floors: prisma.floor.rows.length,
      rooms: prisma.room.rows.length,
      users: prisma.user.rows.length,
      bookings: prisma.booking.rows.length,
      approvals: prisma.approvalLog.rows.length,
      feedbacks: prisma.feedback.rows.length,
    };

    prisma.booking.rows.push({
      id: 'operational-booking',
      title: 'Operational booking that seed must preserve',
      startTime: new Date('2026-09-01T01:00:00.000Z'),
    });

    await seedDatabase(prisma as any, 'test-password-hash');

    expect(firstCounts).toEqual({
      floors: 14,
      rooms: 7,
      users: 4,
      bookings: 3,
      approvals: 3,
      feedbacks: 1,
    });
    expect(prisma.booking.rows).toHaveLength(4);
    expect(prisma.booking.rows.some((row) => row.id === 'operational-booking')).toBe(true);
    expect(prisma.approvalLog.rows).toHaveLength(3);
    expect(prisma.feedback.rows).toHaveLength(1);
  });

  it('encodes seeded campus schedule times as Jakarta local time', async () => {
    const prisma = createSeedClient();

    await seedDatabase(prisma as any, 'test-password-hash');

    const festival = prisma.booking.rows.find((row) => row.title.startsWith('YARSI Tech Festival'));
    expect(new Date(festival?.startTime).toISOString()).toBe('2026-08-20T01:00:00.000Z');
    expect(new Date(festival?.endTime).toISOString()).toBe('2026-08-20T09:00:00.000Z');
  });
});
