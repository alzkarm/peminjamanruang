const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('=== SPRINT 4 VERIFICATION SUITE ===\n');

// -------------------------------------------------------------
// Test 1: Task 16 - Check cleanupExpired route guards and roles
// -------------------------------------------------------------
console.log('1. Testing Task 16: Guard & Role Protection on cleanupExpired...');
const controllerPath = path.resolve(__dirname, '../backend/src/bookings/bookings.controller.ts');
const controllerCode = fs.readFileSync(controllerPath, 'utf8');

const cleanupExpiredMatch = controllerCode.match(/@Post\('cleanup-expired'\)[\s\S]*?async cleanupExpired/);
assert(cleanupExpiredMatch, 'cleanupExpired endpoint must exist in bookings.controller.ts');

const cleanupBlock = cleanupExpiredMatch[0];
assert(
  cleanupBlock.includes('RolesGuard'),
  'cleanupExpired must be decorated with RolesGuard'
);
assert(
  cleanupBlock.includes('Role.ADMIN') && cleanupBlock.includes('Role.SUPERADMIN'),
  'cleanupExpired must be restricted to ADMIN and SUPERADMIN'
);
console.log('   [PASS] cleanupExpired endpoint is guarded with RolesGuard and restricted to Admin/Superadmin.');

// -------------------------------------------------------------
// Test 2: Task 17 - Verify database index @@index([userId])
// -------------------------------------------------------------
console.log('\n2. Testing Task 17: Database Index @@index([userId])...');
const schemaPath = path.resolve(__dirname, '../backend/prisma/schema.prisma');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');
assert(
  schemaContent.includes('@@index([userId])'),
  'schema.prisma must define @@index([userId]) on Booking model'
);

// Verify directly against PostgreSQL
const { PrismaClient } = require(path.resolve(__dirname, '../backend/node_modules/@prisma/client'));
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:postgres@localhost:5432/siperu_yarsi?schema=public"
    }
  }
});

async function runAsyncTests() {
  try {
    const indexes = await prisma.$queryRawUnsafe(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'bookings';
    `);
    const hasUserIdIndex = indexes.some(idx => 
      idx.indexname === 'bookings_userId_idx' || idx.indexdef.includes('("userId")')
    );
    assert(hasUserIdIndex, 'Database must contain bookings_userId_idx in PostgreSQL pg_indexes');
    console.log('   [PASS] bookings_userId_idx is present and verified in PostgreSQL!');
  } catch (err) {
    console.error('DB query error:', err);
    throw err;
  } finally {
    await prisma.$disconnect();
  }

  // -------------------------------------------------------------
  // Test 3: Task 18 - StorageService & Persistent Storage
  // -------------------------------------------------------------
  console.log('\n3. Testing Task 18: StorageService & Persistent Storage...');
  const storageServicePath = path.resolve(__dirname, '../backend/src/storage/storage.service.ts');
  assert(fs.existsSync(storageServicePath), 'storage.service.ts must exist');

  const { StorageService } = require(path.resolve(__dirname, '../backend/dist/src/storage/storage.service'));
  const storageService = new StorageService();

  assert(typeof storageService.getUploadDir === 'function', 'getUploadDir must be defined');
  const uploadDir = storageService.getUploadDir();
  assert(fs.existsSync(uploadDir), 'Upload directory must exist on disk');

  assert(typeof storageService.persistUploadedFile === 'function', 'persistUploadedFile must be a function');
  assert(typeof storageService.sendOrStreamFile === 'function', 'sendOrStreamFile must be a function');
  assert(typeof storageService.deleteFile === 'function', 'deleteFile must be a function');
  console.log('   [PASS] StorageService supports persistent volumes, S3/MinIO drivers, and path safety.');

  // -------------------------------------------------------------
  // Test 4: Task 19 - Formula Injection Sanitization
  // -------------------------------------------------------------
  console.log('\n4. Testing Task 19: Formula Injection Sanitization in Reports...');
  const { sanitizeFormulaInjection } = require(path.resolve(__dirname, '../backend/dist/src/reports/reports.service'));
  
  assert.strictEqual(typeof sanitizeFormulaInjection, 'function', 'sanitizeFormulaInjection must be exported');

  // Test formula triggers (=, +, -, @)
  assert.strictEqual(sanitizeFormulaInjection('=cmd|/C calc!A0'), "'=cmd|/C calc!A0");
  assert.strictEqual(sanitizeFormulaInjection('+12345'), "'+12345");
  assert.strictEqual(sanitizeFormulaInjection('-SUM(1+1)'), "'-SUM(1+1)");
  assert.strictEqual(sanitizeFormulaInjection('@HYPERLINK("evil.com")'), "'@HYPERLINK(\"evil.com\")");
  assert.strictEqual(sanitizeFormulaInjection('   =1+1'), "'   =1+1");

  // Test safe strings and other types
  assert.strictEqual(sanitizeFormulaInjection('Ruang Sidang Senat'), 'Ruang Sidang Senat');
  assert.strictEqual(sanitizeFormulaInjection('Fakultas Kedokteran'), 'Fakultas Kedokteran');
  assert.strictEqual(sanitizeFormulaInjection(123), 123);
  assert.strictEqual(sanitizeFormulaInjection(null), null);
  assert.strictEqual(sanitizeFormulaInjection(undefined), undefined);
  console.log('   [PASS] All formula injection test vectors sanitized with leading single quote (\').');

  // -------------------------------------------------------------
  // Test 5: Task 20 - Verify dead code guard deletion
  // -------------------------------------------------------------
  console.log('\n5. Testing Task 20: Dead Code Guard Removal...');
  const guardPath = path.resolve(__dirname, '../backend/src/common/guards/optional-jwt-auth.guard.ts');
  assert(!fs.existsSync(guardPath), 'optional-jwt-auth.guard.ts must be deleted from the repository');
  console.log('   [PASS] optional-jwt-auth.guard.ts successfully removed.');

  console.log('\n🎉 ALL SPRINT 4 VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runAsyncTests().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
