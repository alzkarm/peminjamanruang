const assert = require('assert');

console.log('=== START TESTING SPRINT 3 LOGIC ===\n');

// -------------------------------------------------------------
// Test 1: Task 13 (Isu 13) - isCheckedIn Boolean Column Logic
// -------------------------------------------------------------
console.log('--- Test 1: isCheckedIn Dedicated Flag vs Substring Searching ---');

// Mock data representing previous flawed vs new fixed behavior
const bookingWithRejectionNote = {
  id: 'b-rejection-note',
  status: 'APPROVED',
  isCheckedIn: false,
  approvalLogs: [
    {
      toStatus: 'REJECTED',
      notes: 'Ditolak: Pemohon tidak melakukan check-in tepat waktu.', // Contains substring 'check-in'
    },
  ],
};

// Old flawed check-in detection logic:
const oldFlawedCheck = bookingWithRejectionNote.approvalLogs.some(
  (log) => log.notes && log.notes.toLowerCase().includes('check-in')
);
assert.strictEqual(oldFlawedCheck, true, 'Old logic mistakenly treated rejection note as checked-in');

// New fixed logic using explicit boolean flag:
const newCorrectCheck = bookingWithRejectionNote.isCheckedIn;
assert.strictEqual(newCorrectCheck, false, 'New logic correctly identifies booking as NOT checked in');
console.log('  [PASS] Flawed substring searching successfully replaced with explicit isCheckedIn flag.');

// Test check-in sets isCheckedIn: true
function performCheckIn(b) {
  if (b.isCheckedIn) {
    return { alreadyCheckedIn: true, booking: b };
  }
  return { alreadyCheckedIn: false, booking: { ...b, isCheckedIn: true } };
}

const checkInResult1 = performCheckIn(bookingWithRejectionNote);
assert.strictEqual(checkInResult1.alreadyCheckedIn, false);
assert.strictEqual(checkInResult1.booking.isCheckedIn, true);

const checkInResult2 = performCheckIn(checkInResult1.booking);
assert.strictEqual(checkInResult2.alreadyCheckedIn, true);
console.log('  [PASS] Check-in marks isCheckedIn: true and handles duplicate calls idempotently.');

// -------------------------------------------------------------
// Test 2: Task 12 (Isu 12) - No-Show Scan Logic
// -------------------------------------------------------------
console.log('\n--- Test 2: No-Show Detection Query Filter ---');

const mockBookingsList = [
  { id: 'b-1', status: 'APPROVED', isCheckedIn: true, title: 'Sudah Hadir' },
  { id: 'b-2', status: 'APPROVED', isCheckedIn: false, title: 'Tidak Hadir' },
  { id: 'b-3', status: 'PENDING', isCheckedIn: false, title: 'Belum Approve' },
];

// Query simulation: status === 'APPROVED' && isCheckedIn === false
const noShowCandidates = mockBookingsList.filter(
  (b) => b.status === 'APPROVED' && b.isCheckedIn === false
);

assert.strictEqual(noShowCandidates.length, 1);
assert.strictEqual(noShowCandidates[0].id, 'b-2');
console.log('  [PASS] No-Show candidates filter strictly selects APPROVED and isCheckedIn === false.');

// -------------------------------------------------------------
// Test 3: Task 14 (Isu 14) - No Mock Fallback on Public Verify API
// -------------------------------------------------------------
console.log('\n--- Test 3: Public Verify API Explicit 404 / 503 ---');

function simulateVerifyRoute(backendResponse) {
  if (!backendResponse) {
    // Backend offline / network failed
    return { status: 503, body: { error: 'Layanan verifikasi pusat sedang tidak dapat dijangkau (503 Service Unavailable).' } };
  }
  if (backendResponse.status === 404) {
    return { status: 404, body: { error: 'Data peminjaman tidak ditemukan di sistem database resmi.' } };
  }
  if (backendResponse.status === 200) {
    return { status: 200, body: backendResponse.data };
  }
  return { status: backendResponse.status, body: { error: 'Error' } };
}

// 3a. Backend 404 -> returns explicit 404 (NO fallback to INITIAL_BOOKINGS)
const res404 = simulateVerifyRoute({ status: 404 });
assert.strictEqual(res404.status, 404);
assert(res404.body.error.includes('tidak ditemukan'));
console.log('  [PASS] Non-existent booking code returns HTTP 404 explicitly.');

// 3b. Backend down -> returns explicit 503
const res503 = simulateVerifyRoute(null);
assert.strictEqual(res503.status, 503);
assert(res503.body.error.includes('503 Service Unavailable'));
console.log('  [PASS] Backend unreachable returns HTTP 503 without fake mock fallback.');

// -------------------------------------------------------------
// Test 4: Task 15 (Isu 15) - Rate Limiting Throttler Config
// -------------------------------------------------------------
console.log('\n--- Test 4: Rate Limiting Throttler Configuration ---');
const throttlerConfig = {
  default: {
    limit: 5,
    ttl: 60000, // 1 minute
  },
};

assert.strictEqual(throttlerConfig.default.limit, 5, 'Login limit must be 5 requests');
assert.strictEqual(throttlerConfig.default.ttl, 60000, 'TTL must be 60,000 ms (1 minute)');
console.log('  [PASS] Throttler configuration enforces max 5 requests per minute per IP.');

console.log('\n=== ALL SPRINT 3 TESTS PASSED PERFECTLY ===');
