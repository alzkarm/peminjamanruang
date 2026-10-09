/* Live proof: (1) token ngaco -> 400, (2) admin didemosi -> 403, (3) quick-action kirim notif. */
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
const req = async (pathname, opts = {}) => {
  const res = await fetch(API + pathname, opts);
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
};
const authed = (t) => ({ Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' });
const login = async (u) => {
  const { body } = await req('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: 'password123' }) });
  if (!body?.accessToken) throw new Error('login ' + u + ' gagal: ' + JSON.stringify(body).slice(0, 100));
  return body.accessToken;
};
const slot = (days) => ({ start: new Date(Date.now() + days * 86400000).toISOString(), end: new Date(Date.now() + days * 86400000 + 3600000).toISOString() });

(async () => {
  console.log('\n=== LIVE PROOF: quick-action + validasi + token basi ===\n');
  await run('node', [path.join(BACKEND_DIR, 'node_modules', 'prisma', 'build', 'index.js'), 'db', 'push', '--force-reset', '--skip-generate'], { env: { ...process.env, DATABASE_URL: REPRO_DB } });
  await run('node', [path.join(BACKEND_DIR, 'node_modules', 'ts-node', 'dist', 'bin.js'), 'prisma/seed.ts'], { env: { ...process.env, DATABASE_URL: REPRO_DB } });
  const child = spawn('node', ['-r', 'ts-node/register', '-r', 'tsconfig-paths/register', MAIN_TS], {
    cwd: BACKEND_DIR, shell: false, stdio: 'ignore', detached: true,
    env: { ...process.env, DATABASE_URL: REPRO_DB, PORT: '4001' },
  });
  let up = false;
  for (let i = 0; i < 60 && !up; i++) { await sleep(2000); try { up = (await fetch(API + '/rooms')).status === 200; } catch { up = false; } }
  if (!up) { console.log('GAGAL start backend'); process.exit(1); }
  const stop = async () => {
    if (process.platform === 'win32' && child.pid) {
      await new Promise((resolve) => { const k = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); k.on('close', resolve); k.on('error', resolve); });
      return;
    }
    try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
  };
  try {
    const mhs = await login('1402022001');
    const umum = await login('admin.umum');
    const su = await login('superadmin');
    const rooms = await req('/rooms');
    const roomId = rooms.body[0]?.id || rooms.body?.data?.[0]?.id;
    const s = slot(30);
    const b = await req('/bookings', { method: 'POST', headers: authed(mhs), body: JSON.stringify({ roomId, title: 'Bukti live', activityType: 'SEMINAR', startTime: s.start, endTime: s.end }) });

    // (1) token ngaco -> 400 (DTO validation)
    const bad = await req('/verify/quick-action/execute?token=ngaco-tanpa-titik', { headers: { Authorization: 'Bearer ' + su } });
    console.log(`[1] token ngaco           -> ${bad.status} (harap 400)  ${JSON.stringify(bad.body?.error?.message || bad.body?.message || '').slice(0, 70)}`);

    // generate link valid oleh superadmin
    const gen = await req(`/verify/quick-action/generate-link/${b.body.id}?action=APPROVE`, { headers: { Authorization: 'Bearer ' + su } });

    // (2) token basi: demote admin.umum -> USER di DB, lalu eksekusi dgn token JWT lama
    const repro = new PrismaClient({ datasources: { db: { url: REPRO_DB } } });
    await repro.user.update({ where: { username: 'admin.umum' }, data: { role: 'USER' } });
    const stale = await req('/verify/quick-action/execute?token=' + encodeURIComponent(gen.body.token), { headers: { Authorization: 'Bearer ' + umum } });
    console.log(`[2] admin didemosi (token lama) -> ${stale.status} (harap 403)  ${JSON.stringify(stale.body?.error?.message || stale.body?.message || '').slice(0, 70)}`);
    await repro.user.update({ where: { username: 'admin.umum' }, data: { role: 'ADMIN' } });

    // (3) eksekusi valid oleh su -> APPROVED + notif owner & superadmin
    const ok = await req('/verify/quick-action/execute?token=' + encodeURIComponent(gen.body.token), { headers: { Authorization: 'Bearer ' + su } });
    const ownerNotifs = await repro.notification.findMany({ where: { bookingId: b.body.id }, select: { title: true, userId: true } });
    const suRow = await repro.user.findUnique({ where: { username: 'superadmin' } });
    const suGot = ownerNotifs.filter((n) => n.userId === suRow.id).length;
    console.log(`[3] eksekusi su            -> ${ok.status} status=${ok.body?.status} (harap APPROVED)`);
    console.log(`    notif utk booking ini  -> ${ownerNotifs.length} baris: ${ownerNotifs.map((n) => n.title).join(' | ').slice(0, 120)}`);
    console.log(`    superadmin kebagian    -> ${suGot > 0 ? 'YA' : 'TIDAK'} (${suGot} baris)`);
    await repro.$disconnect();
  } finally { await stop(); }
  console.log('\nDatabase utama tidak tersentuh (pakai siperu_repro).\n');
  process.exit(0);
})().catch((e) => { console.error('\nERROR:', e.message); process.exit(1); });
