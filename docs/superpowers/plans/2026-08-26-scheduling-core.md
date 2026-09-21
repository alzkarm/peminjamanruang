# SIPERU YARSI Scheduling Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver an API-backed, privacy-safe room calendar and booking flow on PostgreSQL that guarantees overlapping concurrent requests for one room cannot both commit.

**Architecture:** Implement five cohesive vertical slices. A shared scheduling service owns half-open overlap rules, blocking statuses, Jakarta time conversion, and PostgreSQL serializable retries; public schedule and authenticated booking APIs consume that service. The Next.js application treats APIs as the source of truth and presents the existing YARSI emerald identity through responsive desktop calendars and a mobile agenda.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, Zustand, NestJS 10, Prisma 5, PostgreSQL 14, Jest, Supertest, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-26-scheduling-core-design.md`

## Global Constraints

- PostgreSQL is the only active Prisma datasource; `backend/prisma/dev.db` remains untouched as an archive.
- Preserve the existing `PENDING`, `RECOMMENDED`, and `APPROVED` blocking rule and the existing LPF/Yayasan approval workflow.
- Intervals are half-open: `[startTime, endTime)`.
- Store UTC `timestamptz`; interpret and display campus scheduling values in `Asia/Jakarta`.
- Use at most three `SERIALIZABLE` transaction attempts and retry only Prisma `P2034` failures.
- Return HTTP 409 only for confirmed overlaps and HTTP 503 `SCHEDULING_BUSY` only after retry exhaustion.
- Keep `backend/prisma/dev.db`; never run a destructive migration or seed cleanup.
- Keep the YARSI emerald palette and current branding.
- Public schedule data must not expose applicant, attachment, or approval-note fields.
- Update `PROGRESS.md` after every completed slice.
- Use test-first red, green, refactor cycles for every behavior change.

---

## File Responsibility Map

- `backend/prisma/schema.prisma`: sole PostgreSQL schema.
- `backend/prisma/seed.ts`: additive, repeatable YARSI development seed.
- `backend/src/scheduling/scheduling.constants.ts`: blocking statuses and retry count.
- `backend/src/scheduling/scheduling-time.ts`: Jakarta parsing and UTC range helpers.
- `backend/src/scheduling/scheduling.service.ts`: overlap queries, room validation, serializable retry wrapper.
- `backend/src/scheduling/scheduling.module.ts`: shared scheduling dependency.
- `backend/src/schedule/schedule.controller.ts`: privacy-safe public schedule and availability routes.
- `backend/src/schedule/schedule.service.ts`: bounded public schedule projection.
- `backend/src/uploads/booking-attachments.service.ts`: signature validation, safe paths, cleanup, authorized streaming.
- `src/lib/dateTime.ts`: browser-independent Jakarta conversion and display helpers.
- `src/lib/api.ts`: stable public schedule, availability, booking, and attachment contracts.
- `src/lib/store.ts`: API-backed cache without fake mutation success.
- `src/components/calendar/*`: calendar controls, desktop grids, mobile agenda, states, and event details.
- `src/app/(user)/dashboard/booking/new/page.tsx`: verified availability lifecycle and honest booking form.

---

### Task 1: Test Harness and PostgreSQL Schema

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/prisma/schema.prisma`
- Delete after merge: `backend/prisma/schema.postgresql.prisma`
- Modify: `backend/prisma/seed.ts`
- Create: `backend/jest.config.js`
- Create: `backend/test/seed-shape.spec.ts`
- Create: `backend/.env.example`

**Interfaces:**
- Produces: PostgreSQL Prisma client with `BookingStatus`, `ActivityType`, `estimatedAttendees`, `BookingLogistik`, and `DateTime @db.Timestamptz(3)`.
- Produces: `npm test -- --runInBand` backend test command.

- [ ] **Step 1: Add the backend test command and Jest dependencies**

Add scripts `test`, `test:watch`, and `test:e2e`; install `jest`, `ts-jest`, `@types/jest`, `@nestjs/testing`, and `supertest` development dependencies.

- [ ] **Step 2: Write a failing seed behavior test**

Create a test around an exported `seedDatabase(prisma)` function using a repository-shaped in-memory test double. Assert that calling it twice produces the same room, user, booking, approval, and feedback counts and never calls `deleteMany`.

- [ ] **Step 3: Run the focused test and verify red**

Run: `npm test -- seed-shape.spec.ts --runInBand`  
Expected: FAIL because `seedDatabase` is not exported and the seed still calls destructive cleanup.

- [ ] **Step 4: Reconcile the Prisma schema**

Set `provider = "postgresql"`; use enums from the alternate schema; retain active fields `dokumenUrl`, `logistik`, `isLeaderApproved`, `isAcademicBulk`, and `bulkGroupId`; add `estimatedAttendees Int?`; annotate booking and audit timestamps with `@db.Timestamptz(3)`. Remove the duplicate schema file only after merging all fields.

- [ ] **Step 5: Make the seed additive**

Export `seedDatabase`, replace cleanup and unconditional booking creation with natural-key lookup by room, title, start, and end, then create missing approval and feedback rows only. Encode seeded times with `+07:00`.

- [ ] **Step 6: Run the focused test and Prisma validation**

Run: `npm test -- seed-shape.spec.ts --runInBand`  
Expected: PASS.  
Run: `npx prisma validate` with a PostgreSQL-format test URL.  
Expected: schema valid and provider PostgreSQL.

- [ ] **Step 7: Create and apply the baseline PostgreSQL migration**

Confirm `DATABASE_URL` begins with `postgresql:` before running `prisma migrate dev --name scheduling_core_postgresql`; seed twice and verify stable counts.

- [ ] **Step 8: Commit slice foundation**

Commit message: `feat: establish PostgreSQL scheduling schema`

---

### Task 2: Scheduling Time, Overlap, and Retry Domain

**Files:**
- Create: `backend/src/scheduling/scheduling.constants.ts`
- Create: `backend/src/scheduling/scheduling-time.ts`
- Create: `backend/src/scheduling/scheduling-time.spec.ts`
- Create: `backend/src/scheduling/serializable-retry.ts`
- Create: `backend/src/scheduling/serializable-retry.spec.ts`

**Interfaces:**
- Produces: `BLOCKING_BOOKING_STATUSES: BookingStatus[]`.
- Produces: `intervalsOverlap(aStart, aEnd, bStart, bEnd): boolean`.
- Produces: `parseJakartaDateTime(date, time): Date` and `jakartaDayRange(date): { start: Date; end: Date }`.
- Produces: `runSerializableWithRetry<T>(operation, maxAttempts = 3): Promise<T>`.

- [ ] **Step 1: Write failing half-open interval tests**

Use literal cases for adjacency, partial overlap, containment, equality, and invalid ranges. The mutation caught is changing `<` or `>` to an inclusive comparison.

- [ ] **Step 2: Run and verify red**

Run: `npm test -- scheduling-time.spec.ts --runInBand`  
Expected: FAIL because the scheduling-time module does not exist.

- [ ] **Step 3: Implement minimal Jakarta and overlap helpers**

Parse `YYYY-MM-DDTHH:mm:ss+07:00`, reject invalid calendar dates and `start >= end`, and keep overlap comparisons half-open.

- [ ] **Step 4: Run and verify green**

Run the focused time tests and expect PASS.

- [ ] **Step 5: Write failing bounded retry tests**

Test success on first call, retry for Prisma code `P2034`, success on the third attempt, failure after exactly three attempts, and immediate propagation of non-`P2034` errors.

- [ ] **Step 6: Implement minimal bounded retry**

Retry only errors whose `code === "P2034"`; after attempt three throw a typed scheduling-busy error. Do not relabel other exceptions.

- [ ] **Step 7: Run all domain tests and commit**

Commit message: `feat: define scheduling time and retry rules`

---

### Task 3: Shared Availability and Atomic Booking Creation

**Files:**
- Create: `backend/src/scheduling/scheduling.service.ts`
- Create: `backend/src/scheduling/scheduling.module.ts`
- Create: `backend/src/scheduling/scheduling.service.spec.ts`
- Modify: `backend/src/bookings/bookings.module.ts`
- Modify: `backend/src/bookings/bookings.service.ts`
- Modify: `backend/src/bookings/dto/create-booking.dto.ts`
- Modify: `backend/src/academic-bulk/academic-bulk.module.ts`
- Modify: `backend/src/academic-bulk/academic-bulk.service.ts`

**Interfaces:**
- Produces: `validateRoomAndFindConflict(tx, selection, excludeBookingId?)`.
- Produces: `createBookingAtomically(userId, dto)` through `BookingsService.create`.
- Consumes: Task 2 blocking constants, overlap semantics, and retry wrapper.

- [ ] **Step 1: Write failing service tests**

Cover missing room, inactive room, invalid time order, each blocking status, non-blocking canceled/rejected/returned status, adjacency, academic booking overlap, and a privacy-safe conflict object.

- [ ] **Step 2: Verify red**

Run: `npm test -- scheduling.service.spec.ts --runInBand`  
Expected: FAIL because the shared service does not exist.

- [ ] **Step 3: Implement the shared query**

Use `startTime: { lt: end }`, `endTime: { gt: start }`, blocking statuses, room activity validation, and optional booking exclusion.

- [ ] **Step 4: Refactor normal creation into a serializable transaction**

Run room validation, conflict query, booking insert, logistics insert, and initial audit insert inside the retried transaction. Convert only a found overlap to `ConflictException` with code `BOOKING_CONFLICT`.

- [ ] **Step 5: Add transition revalidation tests, then implementation**

Write red tests proving `REJECTED -> PENDING`, `RETURNED -> APPROVED`, and `CANCELED -> PENDING` recheck overlap while blocking-to-blocking approval preserves workflow. Implement only the conflict check and retain role rules.

- [ ] **Step 6: Add academic bulk conflict tests, then implementation**

Prove bulk creation rejects an overlap with a normal booking, detects duplicates inside its own request, and is atomic. Use the same shared service inside a serializable transaction.

- [ ] **Step 7: Run backend tests and update `PROGRESS.md` for slice 1**

Record PostgreSQL decision, archived SQLite status, safe seed, UTC/Jakarta strategy, blocking statuses, overlap boundary, and concurrency protection.

- [ ] **Step 8: Commit slice 1**

Commit message: `feat: enforce atomic room availability`

---

### Task 4: Public Schedule and Availability API

**Files:**
- Create: `backend/src/schedule/schedule.module.ts`
- Create: `backend/src/schedule/schedule.controller.ts`
- Create: `backend/src/schedule/schedule.service.ts`
- Create: `backend/src/schedule/dto/query-schedule.dto.ts`
- Create: `backend/src/schedule/schedule.service.spec.ts`
- Modify: `backend/src/app.module.ts`
- Modify: `backend/src/rooms/rooms.controller.ts`
- Modify: `backend/src/rooms/rooms.service.ts`

**Interfaces:**
- Produces: `GET /api/schedule?startDate&endDate&roomId&floorId`.
- Produces: `GET /api/rooms/availability?roomId&startTime&endTime` with `{ isAvailable, checkedAt, conflict? }`.

- [ ] **Step 1: Write failing privacy projection tests**

Feed complete booking records containing user, attachment, and approval data into the service. Assert the returned event contains only id, room, floor, title, activity type, status, timestamps, and `isAcademicBlock`.

- [ ] **Step 2: Verify red, implement projection, verify green**

Run the focused schedule test before and after implementation.

- [ ] **Step 3: Write failing query validation tests**

Cover missing offsets, invalid ranges, excessive date range, missing room, and inactive room. Assert 400 or 404, never 409.

- [ ] **Step 4: Implement bounded public queries and stable errors**

Limit public ranges to 42 days; return ISO UTC values and privacy-safe conflict summaries.

- [ ] **Step 5: Add controller integration tests**

Use Supertest to prove schedule and availability work without JWT while booking creation remains protected.

- [ ] **Step 6: Run focused API verification and update `PROGRESS.md` for slice 2**

- [ ] **Step 7: Commit slice 2**

Commit message: `feat: expose privacy-safe room schedule`

---

### Task 5: Secure Booking Attachments

**Files:**
- Create: `backend/src/uploads/booking-attachments.service.ts`
- Create: `backend/src/uploads/booking-attachments.service.spec.ts`
- Modify: `backend/src/bookings/bookings.controller.ts`
- Modify: `backend/src/bookings/bookings.service.ts`
- Modify: `backend/src/main.ts`

**Interfaces:**
- Produces: `validateUploadedFile(file): Promise<void>`.
- Produces: `removeUploadedFile(path): Promise<void>`.
- Produces: `resolveAuthorizedAttachment(bookingId, currentUser): Promise<{ path, mimeType }>`.
- Produces: authenticated `GET /api/bookings/:id/attachment`.

- [ ] **Step 1: Write failing signature and extension tests**

Use literal PDF, PNG, JPEG, disguised executable, mismatched extension, and oversized fixtures. Assert both extension and magic bytes are required.

- [ ] **Step 2: Implement server-controlled upload validation**

Generate UUID filenames with an allowed canonical extension. Do not include the original basename.

- [ ] **Step 3: Write failing path and authorization tests**

Cover owner, LPF admin, Yayasan admin, unrelated user, stored traversal path, absolute outside path, missing file, and path not associated with the requested booking.

- [ ] **Step 4: Implement guarded resolution and streaming**

Resolve with `path.resolve(uploadRoot, storedBasename)`, require the result to remain under `uploadRoot`, and remove public static serving from `main.ts`.

- [ ] **Step 5: Write failing orphan cleanup test, then implement cleanup**

Force booking creation to throw after Multer writes a file. Assert the file is removed and the original conflict or validation error is preserved.

- [ ] **Step 6: Run attachment tests and commit**

Commit message: `feat: secure booking attachments`

---

### Task 6: Frontend Contracts, Time Helpers, and API-backed Store

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/lib/dateTime.ts`
- Create: `src/lib/dateTime.test.ts`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/api.ts`
- Modify: `src/lib/store.ts`
- Create: `src/lib/api.test.ts`

**Interfaces:**
- Produces: `toJakartaIso(date, time): string`, `formatJakartaDate`, and `formatJakartaTime`.
- Produces: `scheduleApi.getRange`, `roomsApi.checkAvailability`, stable `ApiError.code`, and authenticated attachment URL retrieval.
- Produces: nullable authenticated user and resource-specific loading/error state.

- [ ] **Step 1: Add Vitest and Testing Library configuration**

- [ ] **Step 2: Write failing Jakarta conversion tests**

Assert `2026-08-20` plus `08:30` becomes `2026-08-20T01:30:00.000Z` and formats back to `08.30` in Jakarta independent of process timezone.

- [ ] **Step 3: Implement time helpers and verify green**

- [ ] **Step 4: Write failing API mapping tests**

Assert no invented building, room code, facilities, image, PIC, phone, description, attendee count, or QR token appears when backend omits it. Assert stable backend codes map to Indonesian messages.

- [ ] **Step 5: Replace fabricated mapping and offline mutation fallbacks**

Use only real API fields, make `currentUser` nullable, preserve cached data only with a visible stale error, and rethrow failed booking, approval, cancellation, or login mutations.

- [ ] **Step 6: Run frontend unit tests and build**

- [ ] **Step 7: Commit frontend data foundation**

Commit message: `refactor: make scheduling APIs source of truth`

---

### Task 7: Responsive Public Calendar

**Files:**
- Modify: `src/app/(public)/schedule/page.tsx`
- Modify: `src/components/calendar/CalendarTimeline.tsx`
- Modify: `src/components/calendar/CalendarGrid.tsx`
- Modify: `src/components/calendar/EventDetailModal.tsx`
- Create: `src/components/calendar/CalendarToolbar.tsx`
- Create: `src/components/calendar/MobileAgenda.tsx`
- Create: `src/components/calendar/CalendarState.tsx`
- Create: `src/components/calendar/calendar-layout.ts`
- Create: `src/components/calendar/calendar-layout.test.ts`

**Interfaces:**
- Consumes: public schedule events and real room/floor data from Task 6.
- Produces: shared-date day/week/month calendar and mobile agenda.

- [ ] **Step 1: Write failing calendar layout tests**

Test 30-minute row placement for 08:30-10:00, clipping at visible-day bounds, sorted mobile agenda grouping, and status labels for pending/recommended/approved/academic.

- [ ] **Step 2: Implement pure calendar layout helpers**

- [ ] **Step 3: Implement shared toolbar and URL date state**

Use current Jakarta date, previous/next/today controls, real floor and room filters, and accessible view tabs.

- [ ] **Step 4: Implement desktop and mobile layouts**

Render spanning events on desktop; render a vertical agenda below the content-driven mobile breakpoint. Keep touch targets at least 44 pixels.

- [ ] **Step 5: Add loading, empty, filtered-empty, stale, and retry states**

- [ ] **Step 6: Add a complete status legend**

Explicitly state that LPF pending and Yayasan recommended slots cannot receive another request while review is active.

- [ ] **Step 7: Add conservative refresh**

Refetch every 45 seconds only when `document.visibilityState === "visible"`; refetch on visibility return.

- [ ] **Step 8: Run calendar tests, build, and update `PROGRESS.md` for slice 3**

- [ ] **Step 9: Commit slice 3**

Commit message: `feat: rebuild room calendar around availability`

---

### Task 8: Verified Booking Form

**Files:**
- Modify: `src/app/(user)/dashboard/booking/new/page.tsx`
- Create: `src/hooks/useRoomAvailability.ts`
- Create: `src/hooks/useRoomAvailability.test.tsx`
- Modify: `src/app/(public)/auth/login/page.tsx`
- Modify: `src/components/common/Navbar.tsx`

**Interfaces:**
- Produces: 400 ms debounced availability lifecycle tied only to room/date/start/end.
- Consumes: authenticated session, rooms API, availability API, booking mutation, and calendar URL prefills.

- [ ] **Step 1: Write failing hook tests with fake timers**

Assert relevant-field changes immediately reset to unknown, one request fires after 400 ms, stale responses are ignored, unrelated title changes do not recheck, errors become `unavailable`, and only the exact verified selection enables submission.

- [ ] **Step 2: Implement the minimal availability hook**

Use an abort controller or request sequence guard and store the verified selection key.

- [ ] **Step 3: Refactor the form to honest defaults**

Remove fake room fallback, fake profile data, preselected logistics, fake filename, and prechecked approval. Show authenticated profile fields read-only.

- [ ] **Step 4: Add accessible validation summary**

On submit failure, focus a `role="alert"` summary with links to fields and preserve inline errors.

- [ ] **Step 5: Wire real multipart upload and committed success**

Show success only after API response; invalidate schedule and booking caches; treat calendar parameters as prefill only.

- [ ] **Step 6: Require real authentication**

Redirect unauthenticated booking visits to login with a safe return path. Remove fake login fallback while preserving real seeded demo login buttons.

- [ ] **Step 7: Run form tests and build**

- [ ] **Step 8: Update `PROGRESS.md` for slice 4 and commit**

Commit message: `feat: verify availability before booking`

---

### Task 9: Approval, Dashboard, and Room Information Regression

**Files:**
- Modify: `src/app/(public)/page.tsx`
- Modify: `src/components/common/RoomCard.tsx`
- Modify: `src/app/(user)/dashboard/page.tsx`
- Modify: `src/app/(admin)/admin/approvals/page.tsx`
- Modify: `src/app/(admin)/admin/approvals/yayasan/page.tsx`
- Modify: `src/components/common/StatusBadge.tsx`

**Interfaces:**
- Consumes: real room, booking, status, and protected attachment contracts.
- Preserves: LPF recommendation, Yayasan final approval, rejection/return notes, cancellation, and audit display.

- [ ] **Step 1: Add characterization tests for status mapping and approval actions**

Test the existing routing: LPF regular approval becomes approved, LPF special approval becomes recommended, and Yayasan special approval becomes approved.

- [ ] **Step 2: Remove invented room and applicant presentation**

Show only room name, floor, capacity, active availability, authenticated user profile values, and real booking data.

- [ ] **Step 3: Route document actions through the protected endpoint**

- [ ] **Step 4: Exercise rejection, return, cancellation, and availability release**

Write a failing regression test for any discovered defect before fixing it.

- [ ] **Step 5: Run regression tests and commit**

Commit message: `fix: preserve approval flow with live scheduling data`

---

### Task 10: Full End-to-End Verification and Delivery Gate

**Files:**
- Create: `backend/test/scheduling.e2e-spec.ts`
- Modify: `PROGRESS.md`
- Potentially modify after a failing regression test: `backend/src/bookings/bookings.service.ts`, `backend/src/academic-bulk/academic-bulk.service.ts`, `src/lib/api.ts`, `src/lib/store.ts`, `src/components/calendar/CalendarTimeline.tsx`, `src/app/(user)/dashboard/booking/new/page.tsx`

**Interfaces:**
- Verifies the complete approved specification.

- [ ] **Step 1: Write the PostgreSQL concurrency E2E test**

Create two authenticated users and send simultaneous overlapping POST requests for one room. Assert one returns 201, one returns 409 `BOOKING_CONFLICT`, and the database contains one blocking booking for the interval.

- [ ] **Step 2: Add E2E flow assertions**

Verify login, public schedule privacy, room list, availability, adjacency, academic conflict, normal booking, special-room recommendation, final approval, cancellation release, upload persistence, protected download, and unauthorized denial.

- [ ] **Step 3: Run complete automated verification**

Run backend unit tests, backend E2E tests, backend build, frontend unit tests, and frontend production build. Fix only from a failing reproduction.

- [ ] **Step 4: Exercise browser flows**

Run frontend and backend, check console/server logs, test desktop, 375 pixel mobile, landscape, keyboard-only navigation, focus visibility, reduced motion, loading, empty, stale, error, and every interactive control.

- [ ] **Step 5: Run contrast checks**

Use the Anti-Slop contrast script for every changed semantic text, status, control boundary, and focus color pairing.

- [ ] **Step 6: Run Anti-Slop delivery gates**

Confirm purpose reasons, ENERGY 1 / RHYTHM 2 / MOTION 1, no invented content, no dead controls, real UI states, responsive reflow, keyboard operation, and no horizontal page overflow.

- [ ] **Step 7: Finalize `PROGRESS.md`**

Record migration, seed counts, tests, builds, concurrency result, public privacy verification, upload verification, approval regression, calendar/mobile verification, and any environment-specific run command.

- [ ] **Step 8: Commit final verification**

Commit message: `test: verify scheduling core end to end`
