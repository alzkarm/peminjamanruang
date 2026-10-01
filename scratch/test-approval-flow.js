async function testWorkflow() {
  // 1. Login as user (dosen yoga.kece) to create a general room booking
  const loginRes = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'yoga.kece', password: 'password123' })
  });
  const loginData = await loginRes.json();
  const userToken = loginData.accessToken;
  const userId = loginData.user.id;

  // Find general room (Ruang Kuliah FH)
  const roomsRes = await fetch('http://localhost:4000/api/rooms');
  const rooms = await roomsRes.json();
  const generalRoom = rooms.find(r => !r.isSpecialRoom && !r.name.toLowerCase().includes('auditorium'));
  console.log('General room for test:', generalRoom.id, generalRoom.name);

  // Create booking
  const bookRes = await fetch('http://localhost:4000/api/bookings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + userToken
    },
    body: JSON.stringify({
      roomId: generalRoom.id,
      title: 'Kuliah Umum Hukum Pidana 2026',
      activityType: 'KULIAH',
      startTime: '2026-10-15T09:00:00.000Z',
      endTime: '2026-10-15T11:00:00.000Z'
    })
  });
  const rawText = await bookRes.text();
  let newBooking = {};
  try { newBooking = JSON.parse(rawText); } catch(e) {}
  const targetBookingId = newBooking.id || (newBooking.error && newBooking.error.conflict && newBooking.error.conflict.id);
  console.log('Target booking ID for approval test:', targetBookingId);

  // 2. Admin Umum checks visibility & verifies
  const auLogin = await (await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin.umum', password: 'password123' })
  })).json();
  
  const auBookings = await (await fetch('http://localhost:4000/api/bookings', {
    headers: { Authorization: 'Bearer ' + auLogin.accessToken }
  })).json();
  const auList = Array.isArray(auBookings) ? auBookings : [];
  console.log('[Admin Umum] Visible bookings count:', auList.length, 'Found booking?', auList.some(b => b.id === targetBookingId));

  // Admin Umum updates status to VERIFIED
  const verifyRes = await (await fetch(`http://localhost:4000/api/bookings/${targetBookingId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + auLogin.accessToken
    },
    body: JSON.stringify({ status: 'VERIFIED', notes: 'Diverifikasi kelengkapan oleh Admin Umum' })
  })).json();
  console.log('[Admin Umum] Verify result status:', verifyRes.status);

  // 3. Admin LPF checks visibility (Must NOT see it!)
  const lpfLogin = await (await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'lpf.admin', password: 'password123' })
  })).json();
  const lpfBookings = await (await fetch('http://localhost:4000/api/bookings', {
    headers: { Authorization: 'Bearer ' + lpfLogin.accessToken }
  })).json();
  console.log('[Admin LPF] Can see this general room booking? (Must be false):', Array.isArray(lpfBookings) && lpfBookings.some(b => b.id === targetBookingId));

  // 4. Superadmin performs final approval (APPROVED)
  const saLogin = await (await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'superadmin', password: 'password123' })
  })).json();
  const approveRes = await (await fetch(`http://localhost:4000/api/bookings/${targetBookingId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + saLogin.accessToken
    },
    body: JSON.stringify({ status: 'APPROVED', notes: 'Persetujuan Akhir oleh Superadmin' })
  })).json();
  console.log('[Superadmin] Final approval status:', approveRes.status);
}

testWorkflow();
