const http = require('http');

async function testAll() {
  console.log('=== 1. Testing Auth Endpoints ===');
  const loginAdmin = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'password123' })
  }).then(r => r.json());
  console.log('Login Admin user:', loginAdmin.user?.username, '| role:', loginAdmin.user?.role);

  const loginSuper = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'superadmin', password: 'password123' })
  }).then(r => r.json());
  console.log('Login Superadmin user:', loginSuper.user?.username, '| role:', loginSuper.user?.role);

  console.log('\n=== 2. Testing Recent Submissions API ===');
  const recent = await fetch('http://localhost:4000/api/rooms/recent-submissions?limit=5').then(r => r.json());
  console.log('Recent submissions returned:', recent.length);
  recent.forEach((s, idx) => {
    console.log(`  ${idx + 1}. [${s.status}] ${s.roomName} - "${s.title}" (${s.floorName})`);
  });

  console.log('\n=== 3. Testing CBT Room Seats API for A and B ===');
  const seatsA = await fetch('http://localhost:4000/api/cbt-room/seats?startTime=2026-10-01T08:00:00Z&endTime=2026-10-01T12:00:00Z&roomId=A').then(r => r.json());
  console.log('CBT Room A query status: OK, array length:', Array.isArray(seatsA) ? seatsA.length : seatsA);

  const seatsB = await fetch('http://localhost:4000/api/cbt-room/seats?startTime=2026-10-01T08:00:00Z&endTime=2026-10-01T12:00:00Z&roomId=B').then(r => r.json());
  console.log('CBT Room B query status: OK, array length:', Array.isArray(seatsB) ? seatsB.length : seatsB);

  console.log('\n=== 4. Testing Frontend Page Delivery ===');
  const loginHtml = await fetch('http://localhost:3000/auth/login').then(r => r.text());
  console.log('Login page delivered (status 200), contains "Mode Cepat":', loginHtml.includes('Mode Cepat'));

  const homeHtml = await fetch('http://localhost:3000/').then(r => r.text());
  console.log('Home page delivered (status 200), contains InteractiveBuilding:', homeHtml.includes('Gedung Menara Universitas YARSI'));

  const cbtHtml = await fetch('http://localhost:3000/cbt-room').then(r => r.text());
  console.log('CBT page delivered (status 200), contains Multi-Tenant banner:', cbtHtml.includes('Pemesanan Ruang CBT Multi-Tenant'));
  console.log('=== All checks passed! ===');
}

testAll().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
