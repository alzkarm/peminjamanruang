# SIPERU YARSI Scheduling Core Design

Date: 2026-08-26

Status: Approved in chat, pending written-spec review

Scope: Public calendar, room availability, booking flow, PostgreSQL integration, uploads, and conflict protection

## 1. Purpose

SIPERU YARSI must make two questions easy to answer:

1. Is this room available at the time I need?
2. How do I book this room?

The calendar is the primary scheduling interface. The backend remains the final authority for availability and must prevent overlapping bookings even when requests arrive concurrently.

## 2. Confirmed Existing Behavior

The current implementation was inspected before defining this design.

- Booking creation, room availability, and frontend conflict feedback treat `PENDING`, `RECOMMENDED`, and `APPROVED` as blocking statuses.
- The existing approval workflow routes special rooms through LPF recommendation and Yayasan approval. This workflow will be preserved.
- Existing overlap checks use half-open intervals: `existing.start < requested.end` and `existing.end > requested.start`.
- Adjacent intervals do not conflict. A booking ending at 10:00 can be followed by one beginning at 10:00.
- Academic bulk sessions are stored as `APPROVED` bookings with `isAcademicBulk = true`, so they already participate in normal booking conflict queries.
- Academic bulk creation currently does not protect itself from overlaps and must use the shared availability rules.
- The active Prisma datasource is `backend/prisma/schema.prisma`, which currently uses SQLite.
- `backend/.env` currently uses a `file:` database URL, the generated Prisma client targets SQLite, and `backend/prisma/dev.db` is the active development database.
- `backend/prisma/schema.postgresql.prisma` is not used by current scripts.
- The exact existing progress filename is `PROGRESS.md`.

## 3. Archived SQLite Comparison

The SQLite data was compared with `backend/prisma/seed.ts` using read-only queries that excluded password hashes.

Seed-reproducible data:

- 14 floors
- 7 rooms
- 4 seeded users
- 3 bookings
- 3 approval logs
- 1 feedback record

The only additional SQLite record is a simulated LDAP `guest` user with no bookings, approvals, or feedback. It is not needed for the public calendar and will not be migrated.

Decision:

- PostgreSQL becomes the only active datasource.
- PostgreSQL is initialized from the safe seed.
- `dev.db` remains untouched as an archive and is not used by the application.
- No SQLite record requires selective migration.

## 4. Delivery Strategy

Use cohesive vertical slices so each user-visible path is verified from database to interface before moving forward.

1. PostgreSQL foundation, timezone handling, and conflict engine.
2. Public schedule and availability APIs.
3. Calendar interface and responsive scheduling views.
4. Authenticated booking form, upload persistence, and refresh behavior.
5. Approval and dashboard regression, concurrency verification, accessibility review, and final end-to-end testing.

`PROGRESS.md` must be updated after each meaningful completed slice. A slice does not start until the previous slice passes its focused verification.

## 5. Database and Prisma

### 5.1 Single active datasource

- Merge the complete active data model into `backend/prisma/schema.prisma`.
- Change the datasource provider to `postgresql`.
- Reconcile and retire the duplicate `schema.postgresql.prisma` configuration after its useful definitions are merged.
- Do not delete or modify `backend/prisma/dev.db`.
- Do not commit database credentials.
- Verify the configured `DATABASE_URL` targets PostgreSQL before running any migration or seed command.

### 5.2 Migrations and seed

- Create normal Prisma migration files against PostgreSQL.
- Add `estimatedAttendees Int?` to `Booking`, because the existing form collects this established value but the API currently discards it.
- Keep applicant identity sourced from the authenticated `User` record. Do not duplicate editable name, username, unit, or email fields on each booking.
- Omit applicant phone from booking details until a real persisted phone field exists. Do not display or store a fabricated fallback number.
- Make the seed repeatable and non-destructive.
- Remove the seed's current `deleteMany` behavior for feedback, approval logs, and bookings.
- Use existence checks, upserts, or stable natural-key matching so rerunning the seed does not duplicate or erase operational data.
- Run the migration and seed only after confirming the target datasource is PostgreSQL.

### 5.3 Time storage

- Store booking timestamps in UTC using PostgreSQL `timestamptz` columns.
- Accept timestamp inputs only when they include `Z` or an explicit UTC offset.
- Interpret user-entered dates and times as `Asia/Jakarta` (`UTC+07:00`).
- Return ISO UTC timestamps from APIs.
- Format booking and schedule timestamps in the frontend using `timeZone: "Asia/Jakarta"`.
- Construct academic bulk timestamps with an explicit Jakarta offset rather than the server's local timezone.
- Express intended seed schedule times with an explicit Jakarta offset.

## 6. Availability and Conflict Rules

### 6.1 Blocking statuses

The established blocking statuses remain:

- `PENDING`
- `RECOMMENDED`
- `APPROVED`

No approval state or transition role is changed by this work.

### 6.2 Overlap semantics

Intervals are half-open: `[startTime, endTime)`.

An overlap exists when:

```text
existing.startTime < requested.endTime
AND
existing.endTime > requested.startTime
```

Examples:

- 09:00-10:00 and 10:00-11:00: allowed.
- 09:00-10:30 and 10:00-11:00: conflict.
- 09:00-11:00 and 09:00-11:00: conflict.
- A request contained entirely inside another booking: conflict.

### 6.3 Shared availability service

One backend service owns the conflict query and is used by:

- Public and authenticated availability checks.
- Normal booking creation.
- Academic bulk creation.
- Any transition from a non-blocking state into a blocking state.
- Approval-time defensive validation where applicable.

Academic bulk sessions remain bookings and are not modeled as a separate conflict source.

### 6.4 Concurrent requests

- Run conflict check and insert in a PostgreSQL `SERIALIZABLE` Prisma transaction.
- Retry only Prisma serialization/write-conflict failures, such as `P2034`.
- Use a small fixed maximum of three transaction attempts.
- On retry, rerun the complete transaction, including room and overlap validation.
- If retries are exhausted, return HTTP 503 with stable code `SCHEDULING_BUSY`.
- Do not translate unrelated database or server failures into scheduling conflicts.
- Return HTTP 409 with `BOOKING_CONFLICT` only after a genuine overlapping booking is found.

## 7. Backend API Design

### 7.1 Public schedule

Add a public, bounded schedule endpoint that accepts a date range and optional room or floor filters.

The response may include:

- Booking or event identifier.
- Room identifier and real room name.
- Real floor name and level.
- Activity title and type.
- UTC start and end timestamps.
- Public booking status.
- Academic-block indicator.

It must not include:

- Applicant name, username, email, phone, or organization.
- Documents or document paths.
- Approval notes or internal audit history.
- Authentication information.

### 7.2 Availability

Standardize the response around `isAvailable` and return only privacy-safe conflict information.

The endpoint validates:

- Room identifier.
- Room active state.
- Valid offset-aware timestamps.
- `startTime < endTime`.

### 7.3 Errors

- HTTP 400: invalid timestamps, interval, status, file, or request fields.
- HTTP 403: unauthorized booking or attachment access.
- HTTP 404: missing or inactive room, booking, or attachment.
- HTTP 409 plus `BOOKING_CONFLICT`: confirmed scheduling overlap.
- HTTP 503 plus `SCHEDULING_BUSY`: serialization retries exhausted.
- HTTP 500: unexpected failures, logged without exposing internal details.

Frontend code maps stable backend codes to clear Indonesian messages and does not display raw internal codes.

## 8. Upload Persistence and Access

Continue using `backend/uploads` as the current local storage architecture.

### 8.1 Validation and naming

- Allow PDF, PNG, and JPEG only.
- Keep the existing 15 MB limit.
- Validate both an allowed extension and a server-observed file signature when the current stack can identify it.
- Do not rely on the client-provided MIME type alone.
- Generate unique server-controlled filenames with no unnecessary original filename content.
- Never accept a client-provided storage path as authoritative.

### 8.2 Persistence and cleanup

- Store the server-generated path only after upload succeeds.
- If booking creation fails after Multer has written the file, remove the orphan in a reliable `catch` or cleanup path.
- Cleanup failures are logged separately and do not mask the original booking error.

### 8.3 Authenticated serving

- Serve files through a guarded booking attachment endpoint.
- Authorize only the booking owner and permitted administrators.
- Resolve the stored filename against the fixed upload directory.
- Reject any resolved path outside that directory.
- Serve only the file path associated with the requested booking.
- Do not expose attachment URLs in public schedule responses.

Verification covers multipart upload, disk presence, PostgreSQL path persistence, authorized download, unauthorized denial, path traversal rejection, and cleanup after failed booking creation.

## 9. Frontend Data and Authentication

- Public schedule and room availability work without authentication.
- Booking creation and personal dashboards require a real authenticated session.
- Remove the fake default authenticated user.
- Remove offline fallbacks that create local bookings, approvals, cancellations, or login sessions after API failures.
- Demo accounts may remain as development conveniences only when they authenticate through the real backend.
- Zustand remains the client cache, but APIs are the source of truth.
- Track explicit loading and error state for schedule, rooms, availability, bookings, and mutations.
- Do not silently retain stale data after a failed fetch without showing that it may be stale.

## 10. Calendar Experience

### 10.1 Shared date state

- Default to the current date in `Asia/Jakarta`.
- Remove hardcoded August 2026 dates.
- Day, week, and month views share selected-date state.
- Selecting a month cell updates and opens the same date in the day view.
- Browser back and forward navigation remain predictable.

### 10.2 Views

- Desktop day view: room columns with 30-minute rows and accurately spanning events.
- Desktop week view: one selected room across seven days with 30-minute rows.
- Month view: compact schedule summary and a clear path into a selected day.
- Mobile view: vertical agenda grouped by time and room, not a compressed desktop matrix.
- Mobile retains easy previous, next, and today navigation plus room and floor filtering.

### 10.3 Status and availability

- Use the existing emerald YARSI palette.
- Preserve amber for LPF pending, sky for Yayasan recommendation, emerald for approved, and the established academic purple.
- Pair every color with a visible status label and appropriate icon.
- Explain in the legend that pending and recommended requests block new requests while approval is in progress.
- Available slots lead to a prefilled booking form.
- A prefilled slot is never treated as verified availability.

### 10.4 States and refresh

Provide distinct states for:

- Loading schedule data.
- No scheduled activity.
- Filters matching no rooms or events.
- API error with retry.
- Stale data when a refresh fails.

Refetch every 45 seconds only while the page is visible, and refetch immediately after successful relevant mutations.

## 11. Booking Form

### 11.1 Honest initial state

- Prefill room, date, and time only from an explicit calendar selection or URL parameters.
- Keep title, logistics, attachment, and internal approval empty by default.
- Do not show a fake filename, fabricated phone number, invented room details, or preselected logistics.
- Do not pre-check the internal approval declaration.

### 11.2 Availability lifecycle

- Run immediate local overlap feedback for responsiveness.
- Debounce the API availability check by 400 ms.
- Trigger the check only when room, date, start time, or end time changes.
- Immediately invalidate the previous result after any of those fields changes.
- Disable submission while availability is unknown, checking, failed, or conflicting.
- Require a successful API verification for the exact current selection.
- Repeat validation inside the final server transaction.

Availability states are:

- Not ready.
- Checking.
- Available.
- Conflict.
- Unable to verify.

### 11.3 Validation and submission

- Retain room, schedule, title, activity type, description, attendee estimate, logistics, optional document, and internal approval confirmation.
- Persist `estimatedAttendees` through the additive nullable booking column defined in the database section.
- Present authenticated applicant identity as read-only profile data rather than accepting unsaved per-booking identity overrides.
- Keep inline field errors.
- On failed submission, focus an accessible error summary that links to invalid fields.
- Show success only after the PostgreSQL transaction commits.
- Refresh schedule and dashboard data after success.

## 12. Visual and Accessibility Direction

Design read:

> YARSI academic operations system for campus users, retaining the emerald visual language. ENERGY 1 / RHYTHM 2 / MOTION 1.

Reasons:

- Emerald palette: preserves the existing YARSI identity.
- Calm motion: scheduling requires precision and low distraction.
- Balanced rhythm: selected date and availability are the primary focal points.
- Desktop spatial calendar: supports comparison across rooms and times.
- Mobile agenda cards: support readable scanning without horizontal matrix compression.
- Selective cards and shadows: identify actionable states without turning every region into a floating panel.

Accessibility requirements:

- Keyboard access for all calendar and form actions.
- Visible `:focus-visible` indicators.
- Status is never communicated by color alone.
- Minimum 44 by 44 pixel touch targets.
- No horizontal page overflow on mobile.
- Calendar matrix scrolling is contained and has a distinct mobile alternative.
- Text remains usable at 200 percent zoom.
- Loading and errors are perceivable by assistive technology.
- Reduced-motion preferences are respected.

## 13. Verification Strategy

### Slice 1: PostgreSQL and conflicts

- Prisma schema validation against PostgreSQL.
- Migration applies to an empty PostgreSQL database.
- Seed runs twice without deletion or duplication.
- Seeded users can authenticate.
- Room, booking, approval, and feedback counts are verified.
- Unit or integration tests cover invalid timestamps, adjacency, partial overlap, containment, exact overlap, blocking statuses, cancellation, academic blocks, and non-blocking to blocking transitions.
- A concurrent booking test sends overlapping requests and proves exactly one succeeds.

### Slice 2: Public APIs

- Public schedule requires no token.
- Public response contains required schedule fields.
- Public response contains no applicant, attachment, or approval-note fields.
- Availability response and error codes match the frontend contract.

### Slice 3: Calendar

- Day, week, and month navigation use the same date.
- Events show correct WIB times.
- Filters, legend, available-slot links, loading, empty, stale, and error states work.
- Mobile agenda works at a 375 pixel viewport and landscape orientation.
- Keyboard and focus behavior is exercised.

### Slice 4: Booking and uploads

- Availability invalidates and rechecks only for relevant fields.
- Submission remains disabled until the current selection is verified.
- Conflict responses remain clear and privacy-safe.
- A successful booking appears in dashboard and calendar.
- Upload validation, persistence, protected retrieval, traversal protection, and cleanup are exercised.

### Slice 5: Regression and delivery

- Existing LPF and Yayasan approval paths still work.
- Approval notes and required rejection or return reasons still work.
- Cancellation releases availability and retains audit history.
- Frontend and backend builds pass.
- Automated tests pass.
- Console and server logs contain no unexpected errors during the exercised flow.
- Anti-Slop, accessibility, contrast, keyboard, mobile, and responsive delivery gates pass.

## 14. Out of Scope

- A new approval workflow or new approval roles.
- WebSockets or a new real-time infrastructure layer.
- Cloud object storage migration.
- Invented room facilities, room codes, images, PIC contacts, or applicant details.
- Destructive migration of the archived SQLite database.
- Migrating the simulated SQLite guest user.

## 15. Completion Criteria

The scheduling core is complete only when:

- PostgreSQL is the sole active datasource.
- `dev.db` remains archived and untouched.
- Seed, authentication, rooms, bookings, approvals, feedback, and schedule data are verified on PostgreSQL.
- Concurrent overlapping booking requests cannot both commit.
- Academic blocks use the same availability calculation.
- Public schedule data is privacy-safe.
- Calendar and booking flow work together on desktop and mobile.
- Uploads persist and are served only to authorized users.
- Existing approval workflow remains intact.
- `PROGRESS.md` records every completed slice.
- All focused and final verification passes.
