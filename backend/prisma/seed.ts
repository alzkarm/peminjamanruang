import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Smart Campus YARSI Database...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Seed Floors
  const floorData = [
    { name: 'Basement Parking & Maintenance', level: -1 },
    { name: 'Ground Floor (Lobby Utama)', level: 0 },
    { name: 'Lantai 1 (Pelayanan Terpadu & LPF)', level: 1 },
    { name: 'Lantai 2 (Auditorium Ar-Razi & FK)', level: 2 },
    { name: 'Lantai 3 (Smart Classrooms & Media Center)', level: 3 },
    { name: 'Lantai 4 (Collaboration Hub & FKG)', level: 4 },
    { name: 'Lantai 5 (Laboratorium AI & Komputasi FTI)', level: 5 },
    { name: 'Lantai 6 (Fakultas Ekonomi & Bisnis)', level: 6 },
    { name: 'Lantai 7 (Fakultas Hukum & Psikologi)', level: 7 },
    { name: 'Lantai 8 (Rektorat & Ruang Rapat Senat)', level: 8 },
    { name: 'Lantai 9 (Perpustakaan Digital)', level: 9 },
    { name: 'Lantai 10 (Pusat Riset & Inovasi)', level: 10 },
    { name: 'Lantai 11 (VIP Lounge & Pascasarjana)', level: 11 },
    { name: 'Lantai 12 (Auditorium Akbar Ar-Rahman)', level: 12 },
  ];

  const floors = [];
  for (const f of floorData) {
    const floor = await prisma.floor.upsert({
      where: { name: f.name },
      update: { level: f.level },
      create: f,
    });
    floors.push(floor);
  }

  const floor12 = floors.find((f) => f.level === 12)!;
  const floor8 = floors.find((f) => f.level === 8)!;
  const floor5 = floors.find((f) => f.level === 5)!;
  const floor3 = floors.find((f) => f.level === 3)!;
  const floor2 = floors.find((f) => f.level === 2)!;

  // 2. Seed Rooms
  const roomData = [
    {
      name: 'Auditorium Ar-Rahman (Menara YARSI Lt. 12)',
      floorId: floor12.id,
      capacity: 700,
      isSpecialRoom: true, // Requires Yayasan Approval
      isActive: true,
    },
    {
      name: 'Auditorium Ar-Razi (Gedung FK Lt. 2)',
      floorId: floor2.id,
      capacity: 350,
      isSpecialRoom: true, // Requires Yayasan Approval
      isActive: true,
    },
    {
      name: 'Ruang Rapat Senat Universitas (Menara YARSI Lt. 8)',
      floorId: floor8.id,
      capacity: 45,
      isSpecialRoom: true, // Requires Yayasan Approval
      isActive: true,
    },
    {
      name: 'Smart Classroom 301 (Gedung C Lt. 3)',
      floorId: floor3.id,
      capacity: 50,
      isSpecialRoom: false,
      isActive: true,
    },
    {
      name: 'Smart Classroom 302 (Gedung C Lt. 3)',
      floorId: floor3.id,
      capacity: 50,
      isSpecialRoom: false,
      isActive: true,
    },
    {
      name: 'Laboratorium AI & Data Science (Gedung C Lt. 5)',
      floorId: floor5.id,
      capacity: 40,
      isSpecialRoom: false,
      isActive: true,
    },
    {
      name: 'Studio Podcasting & Multimedia (Menara YARSI Lt. 3)',
      floorId: floor3.id,
      capacity: 10,
      isSpecialRoom: false,
      isActive: true,
    },
  ];

  const rooms = [];
  for (const r of roomData) {
    const existing = await prisma.room.findFirst({ where: { name: r.name } });
    if (existing) {
      rooms.push(existing);
    } else {
      const created = await prisma.room.create({ data: r });
      rooms.push(created);
    }
  }

  // 3. Seed Users
  const student = await prisma.user.upsert({
    where: { username: '1402022001' },
    update: {},
    create: {
      username: '1402022001',
      fullName: 'Ahmad Fikri Pratama',
      email: 'ahmad.fikri@mhs.yarsi.ac.id',
      unitName: 'BEM Fakultas Teknologi Informasi',
      passwordHash,
      role: 'USER',
    },
  });

  const lecturer = await prisma.user.upsert({
    where: { username: '0314058201' },
    update: {},
    create: {
      username: '0314058201',
      fullName: 'Dr. dr. Siti Nurhaliza, Sp.A',
      email: 'siti.nurhaliza@yarsi.ac.id',
      unitName: 'Fakultas Kedokteran',
      passwordHash,
      role: 'USER',
    },
  });

  const adminUniv = await prisma.user.upsert({
    where: { username: 'lpf.admin' },
    update: {},
    create: {
      username: 'lpf.admin',
      fullName: 'Bambang Sudibyo, S.T. (LPF)',
      email: 'lpf@yarsi.ac.id',
      unitName: 'Biro Layanan Pengelolaan Fasilitas (LPF)',
      passwordHash,
      role: 'ADMIN_UNIV',
    },
  });

  const adminYayasan = await prisma.user.upsert({
    where: { username: 'yayasan.admin' },
    update: {},
    create: {
      username: 'yayasan.admin',
      fullName: 'Drs. H. Muhammad Shadiq, M.M.',
      email: 'sekretariat.yayasan@yarsi.ac.id',
      unitName: 'Biro Sekretariat & Aset Yayasan YARSI',
      passwordHash,
      role: 'ADMIN_YAYASAN',
    },
  });

  // 4. Seed Initial Bookings
  const audRahman = rooms.find((r) => r.name.includes('Ar-Rahman'))!;
  const audRazi = rooms.find((r) => r.name.includes('Ar-Razi'))!;
  const smart301 = rooms.find((r) => r.name.includes('301'))!;

  // Clean existing bookings and feedbacks to avoid duplicates on re-seed
  await prisma.feedback.deleteMany();
  await prisma.approvalLog.deleteMany();
  await prisma.booking.deleteMany();

  // Booking 1: Recommended to Yayasan (Special Room)
  const bk1 = await prisma.booking.create({
    data: {
      userId: student.id,
      roomId: audRahman.id,
      title: 'YARSI Tech Festival 2026: AI Summit & Innovation Expo',
      activityType: 'SEMINAR',
      startTime: new Date('2026-08-20T08:00:00Z'),
      endTime: new Date('2026-08-20T16:00:00Z'),
      status: 'RECOMMENDED',
      additionalFacilities: JSON.stringify(['Videotron 8x4', 'Sound Line Array', 'Mic Wireless', 'VIP Lounge']),
      notes: 'Acara tahunan BEM FTI mengundang Menkominfo dan praktisi AI.',
      isLeaderApproved: true,
    },
  });

  await prisma.approvalLog.createMany({
    data: [
      {
        bookingId: bk1.id,
        approverId: student.id,
        fromStatus: 'PENDING',
        toStatus: 'PENDING',
        notes: 'Permohonan diajukan oleh Ketua BEM FTI.',
      },
      {
        bookingId: bk1.id,
        approverId: adminUniv.id,
        fromStatus: 'PENDING',
        toStatus: 'RECOMMENDED',
        notes: 'Verifikasi kesiapan teknisi LPF selesai. Direkomendasikan ke Yayasan YARSI.',
      },
    ],
  });

  // Booking 2: Approved (Special Room)
  const bk2 = await prisma.booking.create({
    data: {
      userId: lecturer.id,
      roomId: audRazi.id,
      title: 'Simposium Nasional Kedokteran Islam & Bioetika',
      activityType: 'SEMINAR',
      startTime: new Date('2026-08-22T08:30:00Z'),
      endTime: new Date('2026-08-22T15:00:00Z'),
      status: 'APPROVED',
      additionalFacilities: JSON.stringify(['Dual Projector', 'Hybrid Zoom Kit', 'Catering Koridor']),
      notes: 'Simposium dokter spesialis anak FK YARSI.',
      isLeaderApproved: true,
    },
  });

  await prisma.approvalLog.create({
    data: {
      bookingId: bk2.id,
      approverId: adminYayasan.id,
      fromStatus: 'RECOMMENDED',
      toStatus: 'APPROVED',
      notes: 'Disetujui penuh oleh Sekretariat Yayasan YARSI.',
    },
  });

  // Booking 3: Completed with Feedback
  const bk3 = await prisma.booking.create({
    data: {
      userId: lecturer.id,
      roomId: smart301.id,
      title: 'Kuliah Tamu: Microservices Architecture in Fintech',
      activityType: 'KULIAH',
      startTime: new Date('2026-08-10T13:00:00Z'),
      endTime: new Date('2026-08-10T15:30:00Z'),
      status: 'APPROVED',
      additionalFacilities: JSON.stringify(['Interactive Display', 'AC']),
      isLeaderApproved: true,
    },
  });

  await prisma.feedback.create({
    data: {
      bookingId: bk3.id,
      userId: lecturer.id,
      cleanlinessRating: 5,
      facilityRating: 5,
      staffRating: 5,
      overallRating: 5.0,
      comments: 'Ruangan bersih, display interaktif berjalan lancar, petugas sangat ramah.',
    },
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
