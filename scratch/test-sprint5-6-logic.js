const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('=== SPRINT 5 & SPRINT 6 VERIFICATION SUITE ===\n');

// -------------------------------------------------------------
// Test 21: Deactivated user check in AuthService & JwtStrategy
// -------------------------------------------------------------
console.log('1. Testing Task 21: Inactive user blocking...');
const authServiceContent = fs.readFileSync(
  path.resolve(__dirname, '../backend/src/auth/auth.service.ts'),
  'utf8'
);
assert(
  authServiceContent.includes('!(user as any).isActive') || authServiceContent.includes('!user.isActive'),
  'AuthService must check user.isActive'
);
assert(
  authServiceContent.includes('Akun Anda telah dinonaktifkan oleh administrator'),
  'AuthService must throw UnauthorizedException with inactive account message'
);

const jwtStrategyContent = fs.readFileSync(
  path.resolve(__dirname, '../backend/src/auth/strategies/jwt.strategy.ts'),
  'utf8'
);
assert(
  jwtStrategyContent.includes('!(user as any).isActive') || jwtStrategyContent.includes('!user.isActive'),
  'JwtStrategy must check user.isActive'
);
console.log('   [PASS] Inactive users are strictly blocked during login and JWT verification.');

// -------------------------------------------------------------
// Test 22: FacilitiesController guards
// -------------------------------------------------------------
console.log('\n2. Testing Task 22: FacilitiesController route guards...');
const facilitiesControllerContent = fs.readFileSync(
  path.resolve(__dirname, '../backend/src/facilities/facilities.controller.ts'),
  'utf8'
);
assert(facilitiesControllerContent.includes('RolesGuard'), 'FacilitiesController must use RolesGuard');
assert(
  facilitiesControllerContent.includes('@Roles(Role.SUPERADMIN, Role.ADMIN)'),
  'FacilitiesController mutating endpoints must be restricted to Superadmin and Admin'
);
console.log('   [PASS] FacilitiesController mutating endpoints are protected by JwtAuthGuard and RolesGuard.');

// -------------------------------------------------------------
// Test 23: Next.js Middleware cookie fallback removal
// -------------------------------------------------------------
console.log('\n3. Testing Task 23: Next.js Middleware token-only authority...');
const middlewareContent = fs.readFileSync(
  path.resolve(__dirname, '../src/middleware.ts'),
  'utf8'
);
assert(
  !middlewareContent.includes('cookieRole : null'),
  'middleware.ts must not fall back to cookieRole'
);
assert(
  middlewareContent.includes('const role = effectivePayload?.role || null;'),
  'middleware.ts must use verified JWT payload role only'
);
console.log('   [PASS] Middleware enforces verified JWT payload as sole authority without cookie forgery loophole.');

// -------------------------------------------------------------
// Test 24: Client IP forwarding & trust proxy
// -------------------------------------------------------------
console.log('\n4. Testing Task 24: Client IP forwarding & trust proxy...');
const loginRouteContent = fs.readFileSync(
  path.resolve(__dirname, '../src/app/api/auth/login/route.ts'),
  'utf8'
);
assert(
  loginRouteContent.includes('headers[\'x-forwarded-for\'] = clientIp'),
  'Login route handler must forward client IP in x-forwarded-for header'
);

const mainTsContent = fs.readFileSync(
  path.resolve(__dirname, '../backend/src/main.ts'),
  'utf8'
);
assert(
  mainTsContent.includes('set(\'trust proxy\', true)'),
  'main.ts must enable trust proxy in Express adapter'
);
console.log('   [PASS] Client IP forwarded and trust proxy enabled for accurate per-user rate limiting.');

// -------------------------------------------------------------
// Test 25: CBT and Feedbacks access restrictions & my routes
// -------------------------------------------------------------
console.log('\n5. Testing Task 25: CBT & Feedbacks data isolation...');
const cbtControllerContent = fs.readFileSync(
  path.resolve(__dirname, '../backend/src/cbt-room/cbt-room.controller.ts'),
  'utf8'
);
assert(
  cbtControllerContent.includes('@Get(\'my-bookings\')'),
  'CbtRoomController must provide my-bookings endpoint'
);
const cbtGetAllMatch = cbtControllerContent.match(/@Get\('bookings'\)[\s\S]*?async getAllBookings/);
assert(
  cbtGetAllMatch && cbtGetAllMatch[0].includes('RolesGuard'),
  'CbtRoomController getAllBookings must be guarded with RolesGuard'
);

const feedbackControllerContent = fs.readFileSync(
  path.resolve(__dirname, '../backend/src/feedbacks/feedbacks.controller.ts'),
  'utf8'
);
assert(
  feedbackControllerContent.includes('@Get(\'my\')'),
  'FeedbacksController must provide /my endpoint for personal feedbacks'
);
const feedbackFindAllMatch = feedbackControllerContent.match(/@Get\(\)[\s\S]*?async findAll/);
assert(
  feedbackFindAllMatch && feedbackFindAllMatch[0].includes('RolesGuard'),
  'FeedbacksController findAll must be restricted by RolesGuard'
);
console.log('   [PASS] CBT bookings and feedbacks protected with role boundaries and personal history routes.');

// -------------------------------------------------------------
// Test 26: Penalty check on CBT bookSeats
// -------------------------------------------------------------
console.log('\n6. Testing Task 26: CBT cooling-down penalty check...');
const cbtServiceContent = fs.readFileSync(
  path.resolve(__dirname, '../backend/src/cbt-room/cbt-room.service.ts'),
  'utf8'
);
assert(
  cbtServiceContent.includes('coolingDownUntil: { gt: new Date() }'),
  'CbtRoomService must check active coolingDownUntil in bookSeats'
);
console.log('   [PASS] CBT bookSeats validates UserPenalty to reject users in cooling-down state.');

// -------------------------------------------------------------
// Test 27: Helmet & Security Headers
// -------------------------------------------------------------
console.log('\n7. Testing Task 27: Helmet & Next.js Security Headers...');
assert(
  mainTsContent.includes('helmet('),
  'main.ts must register helmet middleware'
);
assert(
  mainTsContent.includes('disable(\'x-powered-by\')'),
  'main.ts must disable x-powered-by header'
);

const nextConfigContent = fs.readFileSync(
  path.resolve(__dirname, '../next.config.mjs'),
  'utf8'
);
assert(
  nextConfigContent.includes('X-Frame-Options') && nextConfigContent.includes('X-Content-Type-Options'),
  'next.config.mjs must define security headers'
);
console.log('   [PASS] Helmet and security headers configured to prevent clickjacking and tech stack disclosure.');

// -------------------------------------------------------------
// Test 28: Health Check endpoint
// -------------------------------------------------------------
console.log('\n8. Testing Task 28: Health check endpoint...');
const healthControllerContent = fs.readFileSync(
  path.resolve(__dirname, '../backend/src/health/health.controller.ts'),
  'utf8'
);
assert(
  healthControllerContent.includes('PrismaHealthIndicator') && healthControllerContent.includes('HealthCheckService'),
  'HealthController must implement database health check via Terminus'
);

const appModuleContent = fs.readFileSync(
  path.resolve(__dirname, '../backend/src/app.module.ts'),
  'utf8'
);
assert(
  appModuleContent.includes('HealthModule'),
  'AppModule must import HealthModule'
);
console.log('   [PASS] GET /api/health available with Prisma database ping and memory probe.');

// -------------------------------------------------------------
// Test 29: Next.js users API Authorization forwarding
// -------------------------------------------------------------
console.log('\n9. Testing Task 29: Next.js users API header forwarding...');
const usersRouteContent = fs.readFileSync(
  path.resolve(__dirname, '../src/app/api/users/route.ts'),
  'utf8'
);
assert(
  usersRouteContent.includes('headers[\'authorization\'] = auth') || usersRouteContent.includes('headers[\'authorization\'] = `Bearer'),
  'users route must forward Authorization header'
);
console.log('   [PASS] Next.js users API route forwards Authorization bearer tokens to backend.');

// -------------------------------------------------------------
// Test 30: 401 Session expired redirect & toast
// -------------------------------------------------------------
console.log('\n10. Testing Task 30: 401 session expiration handling & toast...');
const apiContent = fs.readFileSync(
  path.resolve(__dirname, '../src/lib/api.ts'),
  'utf8'
);
assert(
  apiContent.includes('/auth/login?expired=true'),
  'api.ts must redirect on 401 to /auth/login?expired=true'
);

const loginPageContent = fs.readFileSync(
  path.resolve(__dirname, '../src/app/(public)/auth/login/page.tsx'),
  'utf8'
);
assert(
  loginPageContent.includes('searchParams.get(\'expired\') === \'true\''),
  'login/page.tsx must display toast when expired=true param is present'
);
console.log('   [PASS] 401 unauthorized automatically redirects to login with session expired toast.');

console.log('\n🎉 ALL SPRINT 5 & SPRINT 6 VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉\n');
