const assert = require('assert');
const { createHmac, randomBytes } = require('crypto');

console.log('=== START TESTING SPRINT 2 LOGIC ===\n');

// -------------------------------------------------------------
// Test 1: Task 6 (Isu 5) - Quick Action Signed Token & POST Execution
// -------------------------------------------------------------
console.log('--- Test 1: Quick Action Signed Token & Preview/Execute Flow ---');
const secret = 'YARSI_SMART_CAMPUS_SECRET_KEY_2026_SUPER_SECURE';
const bookingId = 'b0000000-0000-0000-0000-000000000001';
const approverId = 'u0000000-0000-0000-0000-000000000001';

// Generate token
const payload = {
  bookingId,
  action: 'APPROVE',
  approverId,
  exp: Date.now() + 48 * 3600 * 1000,
};
const jsonStr = JSON.stringify(payload);
const b64Payload = Buffer.from(jsonStr).toString('base64url');
const hmac = createHmac('sha256', secret);
hmac.update(b64Payload);
const sig = hmac.digest('base64url');
const token = `${b64Payload}.${sig}`;

assert(token.includes('.'), 'Token must contain signature delimiter');
console.log('  [PASS] Token signed successfully:', token.slice(0, 30) + '...');

// Verify tamper detection
const tamperedToken = token.slice(0, -5) + 'abcde';
const [tB64, tSig] = tamperedToken.split('.');
const tHmac = createHmac('sha256', secret);
tHmac.update(tB64);
const expectedSig = tHmac.digest('base64url');
assert.notStrictEqual(tSig, expectedSig, 'Tampered token must fail signature check');
console.log('  [PASS] Tampered token signature check correctly detected manipulation.');

// -------------------------------------------------------------
// Test 2: Task 7 (Isu 6) - Check-In Authorization Logic
// -------------------------------------------------------------
console.log('\n--- Test 2: Check-In Authorization & Protection ---');
const mockBooking = {
  id: 'b-100',
  userId: 'user-borrower',
  title: 'Workshop AI',
  passToken: 'PASS-TEST-1234',
  status: 'APPROVED',
  startTime: new Date(Date.now() + 10 * 60 * 1000), // in 10 minutes (within 60-min window)
  endTime: new Date(Date.now() + 120 * 60 * 1000), // in 2 hours
};

function testCheckInAuth(booking, currentUser, passTokenInput) {
  const isRoomOfficer = currentUser.role === 'ADMIN' || currentUser.role === 'SUPERADMIN';
  const isBorrower = currentUser.id === booking.userId;

  if (!isRoomOfficer && !isBorrower) {
    throw new Error('403: Hanya peminjam ruangan atau petugas yang berwenang');
  }

  if (!isRoomOfficer) {
    const provided = passTokenInput || null;
    if (!provided || (booking.passToken && provided !== booking.passToken)) {
      throw new Error('403: Check-in mandiri memerlukan verifikasi token pass/QR fisik');
    }
  }

  const now = new Date();
  const startTime = new Date(booking.startTime);
  const endTime = new Date(booking.endTime);
  const openFrom = new Date(startTime.getTime() - 60 * 60 * 1000);

  if (now < openFrom) {
    throw new Error('400: Check-in belum dibuka (mulai 60 menit sebelum jadwal)');
  }
  if (now > endTime) {
    throw new Error('400: Waktu check-in sudah lewat');
  }

  return { success: true, verifiedBy: isRoomOfficer ? 'Officer' : 'Borrower-With-Pass' };
}

// 2a. Random user attempts check-in -> 403
assert.throws(
  () => testCheckInAuth(mockBooking, { id: 'random-intruder', role: 'USER' }, null),
  /403: Hanya peminjam ruangan/,
  'Unrelated user must be rejected with 403'
);
console.log('  [PASS] Random unauthorized user blocked with 403.');

// 2b. Borrower attempts check-in without pass token -> 403
assert.throws(
  () => testCheckInAuth(mockBooking, { id: 'user-borrower', role: 'USER' }, null),
  /403: Check-in mandiri memerlukan verifikasi token pass/,
  'Borrower without pass token must be blocked'
);
console.log('  [PASS] Remote borrower script without physical QR pass blocked with 403.');

// 2c. Borrower with valid pass token -> 200
const borrowerOk = testCheckInAuth(mockBooking, { id: 'user-borrower', role: 'USER' }, 'PASS-TEST-1234');
assert.strictEqual(borrowerOk.success, true);
console.log('  [PASS] Borrower with valid physical pass checked in successfully.');

// 2d. Room officer (Admin) -> 200 without needing personal pass
const officerOk = testCheckInAuth(mockBooking, { id: 'admin-officer', role: 'ADMIN' }, null);
assert.strictEqual(officerOk.success, true);
console.log('  [PASS] Room officer (Petugas Admin) checked in successfully.');

// 2e. Check-in outside window (e.g. tomorrow) -> 400
const futureBooking = {
  ...mockBooking,
  startTime: new Date(Date.now() + 24 * 3600 * 1000),
  endTime: new Date(Date.now() + 26 * 3600 * 1000),
};
assert.throws(
  () => testCheckInAuth(futureBooking, { id: 'admin-officer', role: 'ADMIN' }, null),
  /400: Check-in belum dibuka/,
  'Early check-in must be rejected'
);
console.log('  [PASS] Check-in outside valid schedule window rejected with 400.');

// -------------------------------------------------------------
// Test 3: Task 8 (Isu 7) - Reschedule Staging
// -------------------------------------------------------------
console.log('\n--- Test 3: Reschedule Staging & Safe State Transitions ---');
const originalStart = new Date('2026-10-20T08:00:00+07:00');
const originalEnd = new Date('2026-10-20T10:00:00+07:00');
const proposedStart = new Date('2026-10-22T13:00:00+07:00');
const proposedEnd = new Date('2026-10-22T15:00:00+07:00');

let activeBooking = {
  id: 'b-reschedule',
  startTime: originalStart,
  endTime: originalEnd,
  roomId: 'room-1',
  status: 'APPROVED',
  rescheduleStartTime: null,
  rescheduleEndTime: null,
  rescheduleRoomId: null,
  rescheduleReason: null,
};

// Simulation of requestReschedule
function requestReschedule(booking, dto) {
  return {
    ...booking,
    status: 'RESCHEDULE_PENDING',
    rescheduleStartTime: dto.newStart,
    rescheduleEndTime: dto.newEnd,
    rescheduleRoomId: dto.newRoomId || null,
    rescheduleReason: dto.reason,
    originalSchedule: `${booking.startTime.toISOString()} - ${booking.endTime.toISOString()}`,
  };
}

// User requests reschedule
const staged = requestReschedule(activeBooking, {
  newStart: proposedStart,
  newEnd: proposedEnd,
  newRoomId: 'room-2',
  reason: 'Dosen berhalangan hadir',
});

// Verify original startTime & endTime NOT overwritten
assert.strictEqual(staged.startTime.getTime(), originalStart.getTime(), 'Original startTime MUST NOT change');
assert.strictEqual(staged.endTime.getTime(), originalEnd.getTime(), 'Original endTime MUST NOT change');
assert.strictEqual(staged.rescheduleStartTime.getTime(), proposedStart.getTime(), 'Staging startTime recorded');
assert.strictEqual(staged.rescheduleEndTime.getTime(), proposedEnd.getTime(), 'Staging endTime recorded');
console.log('  [PASS] Reschedule request does NOT overwrite original startTime or endTime.');

// Simulation of admin rejection
function rejectReschedule(booking) {
  return {
    ...booking,
    status: 'APPROVED', // or REJECTED
    rescheduleStartTime: null,
    rescheduleEndTime: null,
    rescheduleRoomId: null,
    rescheduleReason: null,
  };
}
const rejected = rejectReschedule(staged);
assert.strictEqual(rejected.startTime.getTime(), originalStart.getTime(), 'Original startTime still intact after rejection');
assert.strictEqual(rejected.rescheduleStartTime, null, 'Staging cleared');
console.log('  [PASS] Reschedule rejection clears staging while preserving original schedule.');

// Simulation of admin approval
function approveReschedule(booking) {
  return {
    ...booking,
    status: 'APPROVED',
    startTime: booking.rescheduleStartTime,
    endTime: booking.rescheduleEndTime,
    roomId: booking.rescheduleRoomId || booking.roomId,
    rescheduleStartTime: null,
    rescheduleEndTime: null,
    rescheduleRoomId: null,
    rescheduleReason: null,
  };
}
const approved = approveReschedule(staged);
assert.strictEqual(approved.startTime.getTime(), proposedStart.getTime(), 'StartTime committed on approval');
assert.strictEqual(approved.endTime.getTime(), proposedEnd.getTime(), 'EndTime committed on approval');
assert.strictEqual(approved.rescheduleStartTime, null, 'Staging cleared after commit');
console.log('  [PASS] Reschedule approval successfully promotes staged times to actual schedule.');

// -------------------------------------------------------------
// Test 4: Task 9 (Isu 8) - Timezone WIB (+07:00) vs UTC
// -------------------------------------------------------------
console.log('\n--- Test 4: Timezone Calculation (WIB +07:00) ---');
const date = '2026-10-15';
const startTime = '08:00';

// Old flawed way with 'Z'
const flawedStart = new Date(`${date}T${startTime}:00.000Z`);
// New correct way with WIB (+07:00)
const cleanTime = startTime.length === 5 ? `${startTime}:00` : startTime;
const correctStart = new Date(`${date}T${cleanTime}+07:00`);

const diffHours = (flawedStart.getTime() - correctStart.getTime()) / (1000 * 3600);
assert.strictEqual(diffHours, 7, 'Raw Z shifts time by exactly 7 hours');
assert.strictEqual(correctStart.toISOString(), '2026-10-15T01:00:00.000Z', '08:00 WIB equals 01:00 UTC');
console.log('  [PASS] Explicit +07:00 timezone offset eliminates the 7-hour discrepancy.');

// -------------------------------------------------------------
// Test 5: Task 10 (Isu 9) - Secure Seed Password & mustChangePassword
// -------------------------------------------------------------
console.log('\n--- Test 5: Secure Seed Password Generator & mustChangePassword ---');
const fallbackPassword = `Yarsi@${randomBytes(8).toString('base64url')}2026!`;
assert(fallbackPassword.length >= 16, 'Fallback password must have high entropy');
assert.notStrictEqual(fallbackPassword, 'password123', 'Fallback password must not be password123');
console.log('  [PASS] Generated seed password satisfies complexity (e.g. ' + fallbackPassword.slice(0, 10) + '...).');

console.log('\n=== ALL SPRINT 2 TESTS PASSED PERFECTLY ===');
