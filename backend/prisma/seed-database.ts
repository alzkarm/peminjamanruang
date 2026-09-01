type SeedPrisma = {
  floor: any;
  room: any;
  user: any;
  booking: any;
  approvalLog: any;
  feedback: any;
};

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

const roomData = [
  { name: 'Auditorium Ar-Rahman (Menara YARSI Lt. 12)', floorLevel: 12, capacity: 700, isSpecialRoom: true },
  { name: 'Auditorium Ar-Razi (Gedung FK Lt. 2)', floorLevel: 2, capacity: 350, isSpecialRoom: true },
  { name: 'Ruang Rapat Senat Universitas (Menara YARSI Lt. 8)', floorLevel: 8, capacity: 45, isSpecialRoom: true },
  { name: 'Smart Classroom 301 (Gedung C Lt. 3)', floorLevel: 3, capacity: 50, isSpecialRoom: false },
  { name: 'Smart Classroom 302 (Gedung C Lt. 3)', floorLevel: 3, capacity: 50, isSpecialRoom: false },
  { name: 'Laboratorium AI & Data Science (Gedung C Lt. 5)', floorLevel: 5, capacity: 40, isSpecialRoom: false },
  { name: 'Studio Podcasting & Multimedia (Menara YARSI Lt. 3)', floorLevel: 3, capacity: 10, isSpecialRoom: false },
];

export async function seedDatabase(prisma: SeedPrisma, passwordHash: string) {
  const floors = [];
  for (const data of floorData) {
    floors.push(await prisma.floor.upsert({
      where: { name: data.name },
      update: { level: data.level },
      create: data,
    }));
  }

  const rooms = [];
  for (const data of roomData) {
    const existing = await prisma.room.findFirst({ where: { name: data.name } });
    if (existing) {
      rooms.push(existing);
      continue;
    }
    const floor = floors.find((candidate) => candidate.level === data.floorLevel);
    rooms.push(await prisma.room.create({
      data: {
        name: data.name,
        floorId: floor.id,
        capacity: data.capacity,
        isSpecialRoom: data.isSpecialRoom,
        isActive: true,
      },
    }));
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

  const audRahman = rooms.find((room) => room.name.includes('Ar-Rahman'));
  const audRazi = rooms.find((room) => room.name.includes('Ar-Razi'));
  const smart301 = rooms.find((room) => room.name.includes('301'));
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
