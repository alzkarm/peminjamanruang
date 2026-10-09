/**
 * SIPERU YARSI — Verifikasi Bug
 * ---------------------------------------------------------------
 * Jalankan:  node scratch/verify-bugs.js
 *
 * Script ini memakai database UJI terpisah (`siperu_repro`) dan menyalakan
 * backend sendiri di port 4001. Database produksi/dev Anda (`peminjaman_ruang`)
 * TIDAK PERNAH disentuh. Setelah selesai, backend dimatikan otomatis.
 *
 * Menghapus DB uji:  psql -c "DROP DATABASE siperu_repro"
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '..', 'backend', 'node_modules', '@prisma', 'client'));

const BACKEND_DIR = path.join(__dirname, '..', 'backend');
const MAIN_TS = path.join(BACKEND_DIR, 'src', 'main.ts');
const REPRO_DB = 'postgresql://postgres:popolbay269@localhost:5432/siperu_repro?schema=public';
const MAIN_DB = 'postgresql://postgres:popolbay269@localhost:5432/peminjaman_ruang?schema=public';
const API = 'http://127.0.0.1:4001/api';

const C = { r: '\x1b[31m', g: '\x1b[32m', y: '\x1b[33m', b: '\x1b[36m', d: '\x1b[90m', x: '\x1b[0m', B: '\x1b[1m' };
const results = [];
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

async function check(id, severity, title, fn, expectFixed) {
  process.stdout.write(`  ${C.d}#${String(id).padStart(2)}${C.x} ${title} ... `);
  try {
    const evidence = await fn();
    if (expectFixed) {
      results.push({ id, severity, title, ok: true, evidence });
      console.log(`${C.g}AMAN (fix terverifikasi)${C.x}  ${C.d}${evidence}${C.x}`);
    } else {
      results.push({ id, severity, title, ok: true, evidence });
      console.log(`${C.g}TERBUKTI${C.x}  ${C.d}${evidence}${C.x}`);
    }
  } catch (e) {
    if (expectFixed) {
      results.push({ id, severity, title, ok: false, evidence: e.message });
      console.log(`${C.r}FIX GAGAL${C.x}  ${C.d}${e.message}${C.x}`);
    } else {
      results.push({ id, severity, title, ok: false, evidence: e.message });
      console.log(`${C.y}TIDAK TERBUKTI${C.x}  ${C.d}${e.message}${C.x}`);
    }
  }
}

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const req = async (pathname, opts = {}) => {
  const res = await fetch(API + pathname, opts);
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body, text, headers: res.headers };
};
const authed = (token, extra = {}) => ({ Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', ...extra });
const login = async (username) => {
  const { body } = await req('/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'password123' }),
  });
  assert(body?.accessToken, `login ${username} gagal: ${JSON.stringify(body).slice(0, 80)}`);
  return body.accessToken;
};
const slot = (days, h = 3600000) => ({
  start: new Date(Date.now() + days * 86400000).toISOString(),
  end: new Date(Date.now() + days * 86400000 + h).toISOString(),
});
const book = async (token, roomId, title, days) => {
  const s = slot(days);
  const r = await req('/bookings', { method: 'POST', headers: authed(token), body: JSON.stringify({ roomId, title, activityType: 'SEMINAR', startTime: s.start, endTime: s.end }) });
  if (r.status !== 201) {
    throw new Error(`booking "${title}" (H+${days}) gagal: ${r.status} ${JSON.stringify(r.body?.error?.message || r.body?.message || r.body).slice(0, 110)}`);
  }
  return r;
};

(async () => {
  console.log(`\n${C.B}SIPERU YARSI — VERIFIKASI BUG${C.x}\n${C.d}${'='.repeat(58)}${C.x}`);

  // ---------- 0. Cek kesehatan DB utama ----------
  console.log(`\n${C.b}[0] Memeriksa database${C.x}`);
  const main = new PrismaClient({ datasources: { db: { url: MAIN_DB } } });
  let mainNote = '';
  try {
    const t = await main.$queryRawUnsafe("select table_name from information_schema.tables where table_schema='public'");
    const names = t.map((x) => x.table_name);
    mainNote = `DB utama punya ${names.length} tabel`;
    if (!names.includes('user_penalties')) {
      mainNote += ' — tapi belum sinkron dengan schema.prisma (butuh 14 tabel), jadi jalankan `npx prisma db push` + seed';
    }
  } catch (e) { mainNote = 'DB utama tidak bisa dibaca: ' + e.message.slice(0, 50); }
  await main.$disconnect();
  console.log(`  ${C.d}DB utama: ${mainNote}${C.x}`);

  // ---------- 1. Siapkan DB uji + backend ----------
  process.stdout.write('  Menyiapkan DB uji (siperu_repro) dan backend port 4001 ... ');
  // --force-reset: DB uji dibersihkan total tiap run supaya hasil deterministik dan
  // tidak bentrok dengan sisa run sebelumnya. Database utama Anda tidak tersentuh.
  await run('node', [path.join(BACKEND_DIR, 'node_modules', 'prisma', 'build', 'index.js'), 'db', 'push', '--force-reset', '--skip-generate'],
    { env: { ...process.env, DATABASE_URL: REPRO_DB } });
  await run('node', [path.join(BACKEND_DIR, 'node_modules', 'ts-node', 'dist', 'bin.js'), 'prisma/seed.ts'],
    { env: { ...process.env, DATABASE_URL: REPRO_DB } });

  // `nest start` CLI flaky di shell ini (proses yatim menahan port 4001),
  // jadi start backend via ts-node langsung.
  const child = spawn('node', ['-r', 'ts-node/register', '-r', 'tsconfig-paths/register', MAIN_TS], {
    cwd: BACKEND_DIR, shell: false, stdio: 'ignore', detached: true,
    env: { ...process.env, DATABASE_URL: REPRO_DB, PORT: '4001' },
  });
  // Sinkron: taskkill harus selesai sebelum process.exit(), kalau tidak proses
  // yatim tetap memegang port 4001 dan run berikutnya gagal start.
  const stopBackend = async () => {
    if (process.platform === 'win32' && child.pid) {
      await new Promise((resolve) => {
        const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
        killer.on('close', resolve);
        killer.on('error', resolve);
      });
      for (let i = 0; i < 15; i++) {
        try { await fetch(API + '/rooms'); await sleep(400); } catch { return; }
      }
      return;
    }
    try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
  };
  let up = false;
  for (let i = 0; i < 60 && !up; i++) {
    await sleep(2000);
    try { up = (await fetch(API + '/rooms')).status === 200; } catch { up = false; }
  }
  if (!up) { console.log('\nGAGAL menyalakan backend.'); await stopBackend(); process.exit(1); }
  console.log(`${C.g}siap${C.x}\n`);

  try {
    const mhs = await login('1402022001');
    const umum = await login('admin.umum');
    const su = await login('superadmin');
    const rooms = (await req('/rooms')).body;
    const generalRoom = rooms.find((r) => !r.isSpecialRoom && !/auditorium|senat|workshop/i.test(r.name));

    console.log(`${C.b}CRITICAL${C.x}`);

    // Setelah fix: invite & list users wajib login superadmin.
    const seedSu = await login('superadmin');
    const suAuthed = { Authorization: 'Bearer ' + seedSu, 'Content-Type': 'application/json' };

    await check(1, 'CRITICAL', 'Invite wajib login superadmin (FIX #1)', async () => {
      // Tanpa token -> 401.
      const anon = await req('/users/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'attacker1', fullName: 'Attacker', role: 'superadmin', unitName: 'PUSDATIN' }) });
      assert(anon.status === 401, `invite tanpa token balas ${anon.status}, seharusnya 401`);
      // Token mahasiswa -> 403.
      const mhsInvite = await req('/users/invite', { method: 'POST', headers: authed(mhs),
        body: JSON.stringify({ identifier: 'attacker2', fullName: 'Attacker', role: 'superadmin', unitName: 'PUSDATIN' }) });
      assert(mhsInvite.status === 403, `invite oleh mahasiswa balas ${mhsInvite.status}, seharusnya 403`);
      // Token superadmin -> 201 whitelist LDAP (tanpa password lokal).
      const ok = await req('/users/invite', { method: 'POST', headers: suAuthed,
        body: JSON.stringify({ identifier: 'staff.baru', fullName: 'Staff Baru', role: 'admin_umum', unitName: 'Bagian Umum' }) });
      assert(ok.status === 201, `invite oleh superadmin balas ${ok.status}`);
      assert(ok.body?.user?.hasLocalPassword === false, 'akun invite seharusnya tanpa password lokal');
      return `tanpa token -> ${anon.status}; mahasiswa -> ${mhsInvite.status}; superadmin -> ${ok.status} (hasLocalPassword=${ok.body.user.hasLocalPassword})`;
    }, true);

    await check(2, 'CRITICAL', 'Invite = whitelist LDAP tanpa password lokal (FIX #2)', async () => {
      // Invite oleh superadmin TANPA field password -> 201, passwordHash null.
      const inv = await req('/users/invite', { method: 'POST', headers: suAuthed,
        body: JSON.stringify({ identifier: 'ldap.user', fullName: 'Ldap User', role: 'USER', unitName: 'FTI' }) });
      assert(inv.status === 201, `invite balas ${inv.status}`);
      assert(inv.body?.user?.hasLocalPassword === false, 'harusnya tanpa password lokal');
      // Login pakai password default lama HARUS ditolak (tidak ada hash lokal).
      const l = await req('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'ldap.user', password: 'password123' }) });
      assert(l.status === 401, `login password default balas ${l.status}, seharusnya 401`);
      // Akun seed (punya hash lokal dev) tetap bisa login — hanya untuk dev/testing.
      const seed = await req('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'superadmin', password: 'password123' }) });
      assert(seed.body?.accessToken, 'akun seed dev seharusnya tetap bisa login lokal');
      return `invite -> ${inv.status} (hasLocalPassword=false); login "password123" -> ${l.status}; seed lokal tetap OK`;
    }, true);

    // Cek #3 (FIX): execute wajib login penyetuju/superadmin + audit jujur + tahap benar.
    await check(3, 'CRITICAL', 'Setujui booking tanpa login + audit dipalsukan (FIX #3)', async () => {
      const b = await book(mhs, generalRoom.id, 'Korban quick-action', 10);
      assert(b.status === 201, `booking ${b.status}`);
      const gen = await req(`/verify/quick-action/generate-link/${b.body.id}?action=APPROVE`, { headers: { Authorization: 'Bearer ' + su } });
      assert(gen.status === 200 && gen.body?.token, `generate-link ${gen.status}`);
      // Tanpa login -> 401.
      const anon = await req('/verify/quick-action/execute?token=' + encodeURIComponent(gen.body.token));
      assert(anon.status === 401, `execute tanpa login balas ${anon.status}, seharusnya 401`);
      // Mahasiswa (bukan penyetuju) -> 403.
      const mhsEx = await req('/verify/quick-action/execute?token=' + encodeURIComponent(gen.body.token), { headers: { Authorization: 'Bearer ' + mhs } });
      assert(mhsEx.status === 403, `execute oleh mahasiswa balas ${mhsEx.status}, seharusnya 403`);
      // Superadmin penyetuju -> APPROVED + audit atas nama eksekutor.
      const ex = await req('/verify/quick-action/execute?token=' + encodeURIComponent(gen.body.token), { headers: { Authorization: 'Bearer ' + su } });
      assert(ex.body?.status === 'APPROVED', `execute -> ${ex.status} ${JSON.stringify(ex.body).slice(0, 60)}`);
      const detail = (await req('/bookings/' + b.body.id, { headers: { Authorization: 'Bearer ' + su } })).body;
      const last = detail.approvalLogs?.[0];
      assert(last?.approver?.fullName === 'Super Administrator YARSI', `audit atas nama ${last?.approver?.fullName}, seharusnya Super Administrator YARSI`);
      // Link admin -> VERIFIED (bukan final APPROVED).
      const b2 = await book(mhs, generalRoom.id, 'Korban quick-action 2', 11);
      const genAdmin = await req(`/verify/quick-action/generate-link/${b2.body.id}?action=APPROVE`, { headers: { Authorization: 'Bearer ' + umum } });
      const exAdmin = await req('/verify/quick-action/execute?token=' + encodeURIComponent(genAdmin.body.token), { headers: { Authorization: 'Bearer ' + umum } });
      assert(exAdmin.body?.status === 'VERIFIED', `link admin -> ${exAdmin.body?.status}, seharusnya VERIFIED`);
      return `anon -> ${anon.status}; mahasiswa -> ${mhsEx.status}; su -> ${ex.body.status} (audit ${last?.approver?.fullName}); admin -> ${exAdmin.body?.status}`;
    }, true);

    await check(4, 'CRITICAL', 'Dokumen privat tidak bisa diintip guest (FIX #4)', async () => {
      const tmp = path.join(__dirname, '__privat.pdf');
      fs.writeFileSync(tmp, '%PDF-1.4\nRAHASIA PROPOSAL\n');
      const fd = new FormData();
      fd.append('roomId', generalRoom.id); fd.append('title', 'Dokumen Rahasia'); fd.append('activityType', 'SEMINAR');
      fd.append('startTime', slot(21).start); fd.append('endTime', slot(21).end);
      fd.append('attachment', new Blob([fs.readFileSync(tmp)], { type: 'application/pdf' }), 'privat.pdf');
      const up = await req('/bookings', { method: 'POST', headers: { Authorization: 'Bearer ' + mhs }, body: fd });
      fs.unlinkSync(tmp);
      assert(up.status === 201, `upload ${up.status}`);
      // Setelah fix GET /bookings wajib login: guest tidak bisa intip path lampiran.
      const guest = await req('/bookings');
      assert(guest.status === 401, `guest baca bookings balas ${guest.status}, seharusnya 401`);
      const own = (await req('/bookings', { headers: { Authorization: 'Bearer ' + mhs } })).body;
      const leak = Array.isArray(own) ? own.find((x) => x.attachmentUrl) : null;
      assert(leak, 'pemilik seharusnya tetap bisa lihat lampirannya sendiri');
      // User lain tetap tidak bisa unduh lampiran orang (403 via getAttachmentForUser).
      const other = await book(su, generalRoom.id, 'Booking superadmin', 12);
      const dl = await req(`/bookings/${other.body.id}/attachment`, { headers: { Authorization: 'Bearer ' + mhs } });
      assert(dl.status === 403 || dl.status === 404, `unduh milik orang balas ${dl.status}`);
      return `guest baca list -> ${guest.status}; pemilik lihat sendiri OK; unduh milik orang -> ${dl.status}`;
    }, true);

    console.log(`\n${C.b}HIGH${C.x}`);

    await check(5, 'HIGH', 'GET /bookings wajib login (FIX #5)', async () => {
      const anon = await req('/bookings');
      assert(anon.status === 401, `tanpa token balas ${anon.status}, seharusnya 401`);
      // Dengan token: list tetap jalan dan data pemohon ada.
      const ok = await req('/bookings', { headers: { Authorization: 'Bearer ' + mhs } });
      assert(ok.status === 200 && Array.isArray(ok.body) && ok.body.length > 0, `dengan token balas ${ok.status}`);
      assert(ok.body[0].user?.username, 'data pemohon hilang untuk user login');
      return `tanpa token -> ${anon.status}; dengan token -> ${ok.status} (${ok.body.length} booking)`;
    }, true);

    await check(6, 'HIGH', 'Hapus user wajib login superadmin (FIX #6)', async () => {
      const inv = await req('/users/invite', { method: 'POST', headers: suAuthed,
        body: JSON.stringify({ identifier: 'korban1', fullName: 'Korban', role: 'USER', unitName: 'FTI' }) });
      assert(inv.status === 201, `invite balas ${inv.status}`);
      const users = (await req('/users', { headers: suAuthed })).body;
      const target = users.find((u) => u.username === 'korban1');
      assert(target?.id, 'user korban tidak ketemu di list');
      // Tanpa token -> 401.
      const delAnon = await req('/users/' + target.id, { method: 'DELETE' });
      assert(delAnon.status === 401, `DELETE tanpa token balas ${delAnon.status}, seharusnya 401`);
      // Dengan token superadmin -> 200 terhapus.
      const del = await req('/users/' + target.id, { method: 'DELETE', headers: suAuthed });
      assert(del.status === 200, `DELETE oleh superadmin balas ${del.status}`);
      return `DELETE tanpa token -> ${delAnon.status}; oleh superadmin -> ${del.status}`;
    }, true);

    await check(7, 'HIGH', 'Mahasiswa ubah status booking orang lain', async () => {
      const b = await book(su, generalRoom.id, 'Booking milik admin', 22);
      const r = await req(`/bookings/${b.body.id}/status`, { method: 'PATCH', headers: authed(mhs), body: JSON.stringify({ status: 'PENDING' }) });
      assert(r.status === 200 && r.body?.status === 'PENDING', `status ${r.status} / ${r.body?.status}`);
      return `mahasiswa -> PATCH status PENDING atas booking orang lain: ${r.status}, status jadi ${r.body.status}`;
    });

    await check(8, 'HIGH', 'Double booking: VERIFIED tidak memblokir slot', async () => {
      const a = await book(mhs, generalRoom.id, 'Slot A', 14);
      const v = await req(`/bookings/${a.body.id}/status`, { method: 'PATCH', headers: authed(umum), body: JSON.stringify({ status: 'APPROVED' }) });
      assert(v.body?.status === 'VERIFIED', `A jadi ${v.body?.status}, bukan VERIFIED`);
      const b2 = await book(su, generalRoom.id, 'Slot B', 14);
      assert(b2.status === 201, `booking B ditolak ${b2.status} (maybe tidak vulnerable)`);
      const ap = await req(`/bookings/${b2.body.id}/status`, { method: 'PATCH', headers: authed(su), body: JSON.stringify({ status: 'APPROVED' }) });
      const retry = await req(`/bookings/${a.body.id}/status`, { method: 'PATCH', headers: authed(su), body: JSON.stringify({ status: 'APPROVED' }) });
      assert(retry.status === 409, `A tidak terkunci (balas ${retry.status})`);
      return `A=VERIFIED & B=APPROVED di slot sama; approve A -> ${retry.status} (A terkunci permanen)`;
    });

    await check(9, 'HIGH', 'Pemesanan kursi CBT tanpa roomId ditolak 400 (FIX #9)', async () => {
      const r = await req('/cbt-room/book', { method: 'POST', headers: authed(mhs), body: JSON.stringify({
        title: 'Ujian', faculty: 'FTI', seatStart: 1, seatEnd: 40, startTime: slot(5).start, endTime: slot(5).end, notes: '' }) });
      assert(r.status === 400, `balas ${r.status}, bukan 400`);
      const msg = r.body?.error?.message ?? r.body?.message?.message ?? r.body?.message;
      return `payload dari UI (tanpa roomId) -> ${r.status}: ${JSON.stringify(msg).slice(0, 70)}`;
    }, true);

    await check(10, 'HIGH', 'Kursi Ruang CBT 197-355 tapi batas backend cuma 159', async () => {
      const r = await req('/cbt-room/book', { method: 'POST', headers: authed(mhs), body: JSON.stringify({
        roomId: 'B', title: 'Ujian', faculty: 'FTI', seatStart: 197, seatEnd: 230, startTime: slot(6).start, endTime: slot(6).end, notes: '' }) });
      assert(r.status === 400, `balas ${r.status}, bukan 400`);
      return `kursi yang dirender UI (197-230) -> ${r.status}: ${r.body?.error?.message}`;
    });

    await check(11, 'HIGH', 'Booking CBT yang valid tetap 500 (tabel cbt_rooms kosong)', async () => {
      const r = await req('/cbt-room/book', { method: 'POST', headers: authed(mhs), body: JSON.stringify({
        roomId: 'A', title: 'Ujian', faculty: 'FTI', seatStart: 1, seatEnd: 40, startTime: slot(7).start, endTime: slot(7).end, notes: '' }) });
      assert(r.status === 500, `balas ${r.status}, bukan 500`);
      const m = r.body?.error?.message || '';
      assert(/Foreign key|does not exist/i.test(m), `pesan lain: ${m.slice(0, 60)}`);
      return `payload valid -> ${r.status}: ${m.split('\n').pop().trim().slice(0, 60)}`;
    });

    console.log(`\n${C.b}MEDIUM${C.x}`);

    await check(12, 'MEDIUM', 'Filter ?isSpecialRoom=false kembalikan ruang umum (FIX #12)', async () => {
      const all = (await req('/bookings', { headers: authed(su) })).body;
      const onlyGeneral = all.filter((b) => b.room?.isSpecialRoom === false);
      const filtered = (await req('/bookings?isSpecialRoom=false', { headers: authed(su) })).body;
      assert(onlyGeneral.length > 0, 'tidak ada booking ruang umum untuk uji');
      assert(Array.isArray(filtered) && filtered.length === onlyGeneral.length,
        `filter balas ${filtered.length} baris, seharusnya ${onlyGeneral.length}`);
      return `ada ${onlyGeneral.length} booking ruang umum, ?isSpecialRoom=false mengembalikan ${filtered.length} baris`;
    }, true);

    await check(13, 'MEDIUM', 'Respons 500 membocorkan file path & internal Prisma', async () => {
      const r = await req(`/bookings/runsheet/00000000-0000-0000-0000-000000000000/toggle-check`, {
        method: 'PATCH', headers: authed(mhs), body: JSON.stringify({ item: 'ac', value: true }) });
      const m = r.body?.error?.message || '';
      assert(/[A-Z]:\\.*\.ts:\d+/.test(m), 'path absolut tidak ada di respons');
      return `path sumber bocor ke klien: "${m.split('\n').find((l) => /:\d+:\d+/.test(l))?.trim().slice(0, 55)}"`;
    });

    await check(14, 'MEDIUM', 'Reschedule tanpa validasi body -> 500', async () => {
      const b = await book(mhs, generalRoom.id, 'Milik mahasiswa', 15);
      const r = await req(`/bookings/${b.body.id}/reschedule`, { method: 'POST', headers: authed(mhs), body: JSON.stringify({}) });
      assert(r.status === 500, `balas ${r.status}, bukan 500`);
      return `body {} -> ${r.status}, seharusnya 400 "jadwal tidak valid"`;
    });

    await check(15, 'MEDIUM', 'Checklist runsheet bisa diubah user lain', async () => {
      const b = await book(su, generalRoom.id, 'Booking admin untuk runsheet', 16);
      const r = await req(`/bookings/runsheet/${b.body.id}/toggle-check`, {
        method: 'PATCH', headers: authed(mhs), body: JSON.stringify({ item: 'ac', value: true }) });
      assert(r.status === 200, `balas ${r.status}`);
      assert(r.body?.checklist?.checkedBy === 'Ahmad Fikri Pratama', `checkedBy = ${r.body?.checklist?.checkedBy}`);
      return `mahasiswa isi checklist booking orang -> ${r.status}, dicatat atas nama "${r.body.checklist.checkedBy}"`;
    });

    await check(16, 'MEDIUM', 'Isi feedback atas booking orang lain', async () => {
      const b = await book(su, generalRoom.id, 'Booking untuk uji feedback', 17);
      const attack = await req('/feedbacks', { method: 'POST', headers: authed(mhs), body: JSON.stringify({
        bookingId: b.body.id, cleanlinessRating: 1, facilityRating: 1, staffRating: 1, comments: 'Feedback palsu', reportedIssues: 'Recon' }) });
      assert(attack.status === 201, `balas ${attack.status}`);
      const owner = await req('/feedbacks', { method: 'POST', headers: authed(su), body: JSON.stringify({
        bookingId: b.body.id, cleanlinessRating: 5, facilityRating: 5, staffRating: 5, comments: 'Evaluasi asli' }) });
      assert(owner.status === 409, `pemilik asli masih bisa isi (${owner.status})`);
      return `mahasiswa isi -> ${attack.status}; pemilik asli coba -> ${owner.status} (terkunci, "${owner.body?.error?.message}")`;
    });

    await check(17, 'MEDIUM', 'Check-in booking jauh hari ditolak (FIX #17)', async () => {
      const b = await book(mhs, generalRoom.id, 'Booking jauh masa depan', 20);
      await req(`/bookings/${b.body.id}/status`, { method: 'PATCH', headers: authed(su), body: JSON.stringify({ status: 'APPROVED' }) });
      const r = await req(`/bookings/${b.body.id}/check-in`, { method: 'POST', headers: authed(mhs) });
      assert(r.status === 400, `check-in H+20 balas ${r.status}, seharusnya 400`);
      return `booking mulai ${b.body.startTime.slice(0, 10)} (20 hari lagi) -> check-in ditolak ${r.status}`;
    }, true);

    await check(18, 'MEDIUM', 'CORS memantulkan origin bebas + credentials', async () => {
      const r = await req('/bookings', { headers: { Origin: 'https://evil.example' } });
      const acao = r.headers.get('access-control-allow-origin');
      const acac = r.headers.get('access-control-allow-credentials');
      assert(acao === 'https://evil.example', `ACAO = ${acao}`);
      assert(acac === 'true', `ACAC = ${acac}`);
      return `Origin https://evil.example dipantulkan (${acao}) + credentials ${acac}`;
    });

  } finally {
    await stopBackend();
  }

  // ---------- Ringkasan ----------
  const fixed = results.filter((r) => r.ok && /\(FIX #/.test(r.title)).length;
  const fixedFail = results.filter((r) => !r.ok && /\(FIX #/.test(r.title)).length;
  const proven = results.filter((r) => r.ok && !/\(FIX #/.test(r.title)).length;
  const unproven = results.filter((r) => !r.ok && !/\(FIX #/.test(r.title)).length;
  console.log(`\n${C.d}${'='.repeat(58)}${C.x}`);
  console.log(`${C.B}RINGKASAN${C.x}  ${results.length} dicek, ${C.g}${fixed} FIX AMAN${C.x}` + (fixedFail ? `, ${C.r}${fixedFail} FIX GAGAL${C.x}` : '') + (proven ? `, ${C.r}${proven} masih TERBUKTI${C.x}` : '') + (unproven ? `, ${C.y}${unproven} tidak terbukti${C.x}` : ''));
  const bySev = {};
  results.forEach((r) => { bySev[r.severity] = (bySev[r.severity] || 0) + (r.ok ? 1 : 0); });
  Object.entries(bySev).forEach(([s, n]) => console.log(`  ${s.padEnd(9)} ${n} bug`));
  console.log(`\n${C.d}DB uji 'siperu_repro' masih ada. Hapus: psql -c "DROP DATABASE siperu_repro"${C.x}`);
  console.log(`${C.d}Database Anda (peminjaman_ruang) tidak tersentuh.${C.x}\n`);
  process.exit(0);
})().catch((e) => { console.error('\nERROR:', e.message); process.exit(1); });
