import { createHash } from 'node:crypto';
import { roomMasterData, type RoomMasterRecord } from './room-master-data';

type SeedPrisma = {
  floor: any;
  room: any;
  user: any;
  booking: any;
  approvalLog: any;
  feedback: any;
};

const floorData = [
  { name: 'BASEMENT', level: -1 },
  { name: 'Dasar', level: 0 },
  { name: '1', level: 1 },
  { name: '2', level: 2 },
  { name: '3', level: 3 },
  { name: '4', level: 4 },
  { name: '5', level: 5 },
  { name: '6', level: 6 },
  { name: '7', level: 7 },
  { name: '8', level: 8 },
  { name: '9', level: 9 },
  { name: '10', level: 10 },
  { name: '11', level: 11 },
  { name: '12', level: 12 },
];

const legacyRoomNames = [
  'Auditorium Ar-Rahman (Menara YARSI Lt. 12)',
  'Auditorium Ar-Razi (Gedung FK Lt. 2)',
  'Smart Classroom 301 (Gedung C Lt. 3)',
];

function stableRoomId(record: RoomMasterRecord) {
  const identity = record.code
    ? `code:${record.code}`
    : `source:${record.sourceNo}:${record.name}|${record.floor}`;
  const hex = createHash('sha256').update(identity).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0')}${hex.slice(18, 20)}-${hex.slice(20)}`;
}

function sameRoomData(room: any, record: RoomMasterRecord, floorId: number) {
  return room.name === record.name
    && room.floorId === floorId
    && (room.code ?? null) === record.code
    && (room.capacity ?? null) === record.capacity
    && true
    && room.isActive !== false;
}

async function updateOrPreserveRoom(
  prisma: SeedPrisma,
  room: any,
  record: RoomMasterRecord,
  floorId: number,
  conflicts: string[],
) {
  if (sameRoomData(room, record, floorId)) return room;

  const hasBooking = await prisma.booking.findFirst({ where: { roomId: room.id } });
  if (hasBooking) {
    conflicts.push(`Room ${record.sourceNo} (${record.name}) berbeda dengan room lama yang sudah memiliki booking; data lama dipertahankan.`);
    return room;
  }

  return prisma.room.update({
    where: { id: room.id },
    data: {
      name: record.name,
      floorId,
      code: record.code,
      building: '',
      capacity: record.capacity,
      isActive: true,
    },
  });
}

async function importMasterRooms(prisma: SeedPrisma, floors: any[]) {
  const floorByName = new Map(floors.map((floor) => [floor.name, floor]));
  const conflicts: string[] = [];
  const rooms: any[] = [];

  for (const record of roomMasterData) {
    const floor = floorByName.get(record.floor);
    if (!floor) {
      conflicts.push(`Room ${record.sourceNo} (${record.name}) tidak memiliki lantai '${record.floor}'.`);
      continue;
    }

    const byCode = record.code
      ? await prisma.room.findUnique({ where: { code: record.code } })
      : null;
    if (byCode && (byCode.name !== record.name || byCode.floorId !== floor.id)) {
      conflicts.push(`Kode ${record.code} sudah dipakai room '${byCode.name}'; baris PDF ${record.sourceNo} tidak ditimpa.`);
      continue;
    }

    const existing = byCode ?? await prisma.room.findUnique({ where: { id: stableRoomId(record) } });
    if (existing) {
      rooms.push(await updateOrPreserveRoom(prisma, existing, record, floor.id, conflicts));
      continue;
    }

    rooms.push(await prisma.room.create({
      data: {
        id: stableRoomId(record),
        name: record.name,
        floorId: floor.id,
        code: record.code,
        building: '',
        capacity: record.capacity,
        isSpecialRoom: false,
        isActive: true,
      },
    }));
  }

  return { rooms, conflicts };
}

export async function seedDatabase(prisma: SeedPrisma, passwordHash: string) {
  const floors = [];
  for (const data of floorData) {
    const existing = await prisma.floor.findFirst({ where: { level: data.level } });
    if (existing) {
      floors.push(existing.name === data.name
        ? existing
        : await prisma.floor.update({ where: { id: existing.id }, data }));
    } else {
      floors.push(await prisma.floor.upsert({
        where: { name: data.name },
        update: { level: data.level },
        create: data,
      }));
    }
  }

  const imported = await importMasterRooms(prisma, floors);
  if (imported.conflicts.length > 0) {
    console.warn('Konflik import master room:', imported.conflicts);
  }

  const users = {
    student: await prisma.user.upsert({
      where: { username: '1402022001' },
      update: {},
      create: { username: '1402022001', fullName: 'Ahmad Fikri Pratama', email: 'ahmad.fikri@mhs.yarsi.ac.id', unitName: 'BEM Fakultas Teknologi Informasi', passwordHash, role: 'USER' },
    }),
    lecturer: await prisma.user.upsert({
      where: { username: '0314058201' },
      update: {},
      create: { username: '0314058201', fullName: 'Dr. dr. Siti Nurhaliza, Sp.A', email: 'siti.nurhaliza@yarsi.ac.id', unitName: 'Fakultas Kedokteran', passwordHash, role: 'USER' },
    }),
    adminUniv: await prisma.user.upsert({
      where: { username: 'lpf.admin' },
      update: {},
      create: { username: 'lpf.admin', fullName: 'Bambang Sudibyo, S.T. (LPF)', email: 'lpf@yarsi.ac.id', unitName: 'Biro Layanan Pengelolaan Fasilitas (LPF)', passwordHash, role: 'ADMIN_UNIV' },
    }),
    adminYayasan: await prisma.user.upsert({
      where: { username: 'yayasan.admin' },
      update: {},
      create: { username: 'yayasan.admin', fullName: 'Drs. H. Muhammad Shadiq, M.M.', email: 'sekretariat.yayasan@yarsi.ac.id', unitName: 'Biro Sekretariat & Aset Yayasan YARSI', passwordHash, role: 'ADMIN_YAYASAN' },
    }),
  };

  const legacyRooms = await Promise.all(
    legacyRoomNames.map((name) => prisma.room.findFirst({ where: { name } })),
  );
  const audRahman = legacyRooms[0] ?? imported.rooms.find((room) => room.name === 'Auditorium Ar Rahman');
  const audRazi = legacyRooms[1] ?? imported.rooms.find((room) => room.name === 'Seminar Rektorat');
  const smart301 = legacyRooms[2] ?? imported.rooms.find((room) => room.code === 'UY. 0302');
  const bookingDefinitions = [
    {
      key: 'festival', userId: users.student.id, roomId: audRahman.id,
      title: 'YARSI Tech Festival 2026: AI Summit & Innovation Expo', activityType: 'SEMINAR',
      startTime: new Date('2026-08-20T08:00:00+07:00'), endTime: new Date('2026-08-20T16:00:00+07:00'),
      status: 'RECOMMENDED', additionalFacilities: ['Videotron 8x4', 'Sound Line Array', 'Mic Wireless', 'VIP Lounge'],
      notes: 'Acara tahunan BEM FTI mengundang Menkominfo dan praktisi AI.', isLeaderApproved: true,
    },
    {
      key: 'symposium', userId: users.lecturer.id, roomId: audRazi.id,
      title: 'Simposium Nasional Kedokteran Islam & Bioetika', activityType: 'SEMINAR',
      startTime: new Date('2026-08-22T08:30:00+07:00'), endTime: new Date('2026-08-22T15:00:00+07:00'),
      status: 'APPROVED', additionalFacilities: ['Dual Projector', 'Hybrid Zoom Kit', 'Catering Koridor'],
      notes: 'Simposium dokter spesialis anak FK YARSI.', isLeaderApproved: true,
    },
    {
      key: 'guestLecture', userId: users.lecturer.id, roomId: smart301.id,
      title: 'Kuliah Tamu: Microservices Architecture in Fintech', activityType: 'KULIAH',
      startTime: new Date('2026-08-10T13:00:00+07:00'), endTime: new Date('2026-08-10T15:30:00+07:00'),
      status: 'APPROVED', additionalFacilities: ['Interactive Display', 'AC'], notes: null, isLeaderApproved: true,
    },
  ];

  const bookings: Record<string, any> = {};
  for (const definition of bookingDefinitions) {
    const { key, ...data } = definition;
    const existing = await prisma.booking.findFirst({
      where: { roomId: data.roomId, title: data.title, startTime: data.startTime, endTime: data.endTime },
    });
    bookings[key] = existing ?? await prisma.booking.create({ data });
  }

  const approvalDefinitions = [
    { bookingId: bookings.festival.id, approverId: users.student.id, fromStatus: 'PENDING', toStatus: 'PENDING', notes: 'Permohonan diajukan oleh Ketua BEM FTI.' },
    { bookingId: bookings.festival.id, approverId: users.adminUniv.id, fromStatus: 'PENDING', toStatus: 'RECOMMENDED', notes: 'Verifikasi kesiapan teknisi LPF selesai. Direkomendasikan ke Yayasan YARSI.' },
    { bookingId: bookings.symposium.id, approverId: users.adminYayasan.id, fromStatus: 'RECOMMENDED', toStatus: 'APPROVED', notes: 'Disetujui penuh oleh Sekretariat Yayasan YARSI.' },
  ];
  for (const data of approvalDefinitions) {
    const existing = await prisma.approvalLog.findFirst({
      where: { bookingId: data.bookingId, approverId: data.approverId, fromStatus: data.fromStatus, toStatus: data.toStatus },
    });
    if (!existing) await prisma.approvalLog.create({ data });
  }

  const existingFeedback = await prisma.feedback.findUnique({ where: { bookingId: bookings.guestLecture.id } });
  if (!existingFeedback) {
    await prisma.feedback.create({
      data: {
        bookingId: bookings.guestLecture.id, userId: users.lecturer.id,
        cleanlinessRating: 5, facilityRating: 5, staffRating: 5, overallRating: 5,
        comments: 'Ruangan bersih, display interaktif berjalan lancar, petugas sangat ramah.',
      },
    });
  }
}
