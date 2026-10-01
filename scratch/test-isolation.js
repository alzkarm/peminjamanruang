async function test() {
  const users = [
    ['admin.umum', 'Admin Umum'],
    ['lpf.admin', 'Admin LPF'],
    ['yayasan.admin', 'Yayasan'],
    ['superadmin', 'Superadmin'],
  ];

  for (const [id, roleName] of users) {
    const authRes = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: id, password: 'password123' })
    });
    const authData = await authRes.json();
    if (!authData.accessToken) {
      console.log(`[${roleName}] Login failed:`, authData);
      continue;
    }
    const token = authData.accessToken;
    const bRes = await fetch('http://localhost:4000/api/bookings', {
      headers: { Authorization: 'Bearer ' + token }
    });
    const bookings = await bRes.json();
    const list = Array.isArray(bookings) ? bookings : [];
    const rooms = list.map(b => b.room?.name || 'Unknown');
    console.log(`[${roleName}] Visible: ${list.length} bookings -> Rooms:`, rooms);
  }
}
test();
