/* Bukti: (F1) GET /facilities hidup, (F2) hapus booking -> notif ikut hilang (FK cascade). */
const path = require('path');
const { spawn } = require('child_process');
const { PrismaClient } = require(path.join(__dirname, '..', 'backend', 'node_modules', '@prisma', 'client'));

const BACKEND_DIR = path.join(__dirname, '..', 'backend');
const MAIN_TS = path.join(BACKEND_DIR, 'src', 'main.ts');
const MAIN_DB = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/siperu_yarsi';
const REPRO_DB = MAIN_DB.replace(/\/[^/]*$/, '/siperu_repro');
const API = 'http://127.0.0.1:4001/api';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd: BACKEND_DIR, shell: false, ...opts });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    p.on('close', (code) => resolve({ code, out }));
  });
}

(async () => {
  console.log('\n=== BUKTI: facilities + FK cascade ===\n');
  await run('node', [path.join(BACKEND_DIR, 'node_modules', 'prisma', 'build', 'index.js'), 'db', 'push', '--force-reset', '--skip-generate'], { env: { ...process.env, DATABASE_URL: REPRO_DB } });
  await run('node', [path.join(BACKEND_DIR, 'node_modules', 'ts-node', 'dist', 'bin.js'), 'prisma/seed.ts'], { env: { ...process.env, DATABASE_URL: REPRO_DB } });
  const child = spawn('node', ['-r', 'ts-node/register', '-r', 'tsconfig-paths/register', MAIN_TS], {
    cwd: BACKEND_DIR, shell: false, stdio: 'ignore', detached: true,
    env: { ...process.env, DATABASE_URL: REPRO_DB, PORT: '4001' },
  });
  const stopBackend = async () => {
    if (process.platform === 'win32' && child.pid) {
      await new Promise((resolve) => { const k = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); k.on('close', resolve); k.on('error', resolve); });
      for (let i = 0; i < 15; i++) { try { await fetch(API + '/rooms'); await sleep(400); } catch { return; } }
      return;
    }
    try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
  };
  let up = false;
  for (let i = 0; i < 60 && !up; i++) { await sleep(2000); try { up = (await fetch(API + '/rooms')).status === 200; } catch { up = false; } }
  if (!up) { console.log('GAGAL start backend'); await stopBackend(); process.exit(1); }
  try {
    const fac = await fetch(API + '/facilities');
    const facBody = await fac.text();
    console.log(`[F1] GET /facilities -> ${fac.status} (harap 200)  ${facBody.slice(0, 80)}`);
    const login = async (u) => {
      const r = await fetch(API + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: 'password123' }) });
      const b = await r.json(); return b.accessToken;
    };
    const mhs = await login('1402022001');
    const rooms = await (await fetch(API + '/rooms')).json();
    const roomId = rooms[0]?.id || rooms?.data?.[0]?.id;
    const s = { start: new Date(Date.now() + 31 * 86400000).toISOString(), end: new Date(Date.now() + 31 * 86400000 + 3600000).toISOString() };
    const b = await (await fetch(API + '/bookings', { method: 'POST', headers: { Authorization: 'Bearer ' + mhs, 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId, title: 'Uji cascade', activityType: 'SEMINAR', startTime: s.start, endTime: s.end }) })).json();
    const repro = new PrismaClient({ datasources: { db: { url: REPRO_DB } } });
    const before = await repro.notification.count({ where: { bookingId: b.id } });
    await repro.booking.delete({ where: { id: b.id } });
    const after = await repro.notification.count({ where: { bookingId: b.id } });
    console.log(`[F2] notif sebelum hapus booking -> ${before} (harap >0); sesudah -> ${after} (harap 0 = cascade jalan)`);
    await repro.$disconnect();
  } finally { await stopBackend(); }
  console.log('\nDatabase utama tidak tersentuh (pakai siperu_repro).\n');
  process.exit(0);
})().catch((e) => { console.error('\nERROR:', e.message); process.exit(1); });
