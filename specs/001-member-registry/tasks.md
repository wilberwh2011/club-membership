---

description: "Task list for feature 001-member-registry"
---

# Tasks: Member Registry

**Input**: Design documents from `specs/001-member-registry/`: [plan.md](plan.md), [spec.md](spec.md),
[research.md](research.md) (including "Spike result"), [data-model.md](data-model.md), [contracts/](contracts/),
[quickstart.md](quickstart.md); constitution `.specify/memory/constitution.md`.

**Prerequisites done**: SPIKE-001 is **complete** (research.md "Spike result", 2026-10-26: (a2) confirmed). No task
repeats it. Its follow-ups are tasks below: **F1** one-account hint T095, T096, T106, T107; **F2** never log or
display the OAuth `code` T062, T082, T086, T102, T106; **F3** no error on refresh after sign-in T062, T068, T086,
T095, T097; **test 11** T109 → T110 (before the production release procedure is final and before the first
production deploy, T113).

**Tests**: Required. Constitution Principle V (test-first, non-negotiable): in every phase, test tasks come before the
implementation they cover and must be observed failing first. Every test task names the acceptance scenarios
(`US<n>-AS<m>`) and FRs it covers; test names inside the files use the same tags (e.g. `it('US1-AS6 …')`).

**Organization (MVP shortcut, owner decision 2026-10-27)**: the plan's delivery order (tooling skeleton → domain
modules → ports and memory adapters → use cases by story → Apps Script adapters → UI → dev deployment and release)
is kept **within each increment**. Increment 1 (MVP, Phases 1–9) runs it for US1 → US2 → US6 → US5 (Club-user
management and deletion) and releases to production. Increment 2 (Phases 10–12) adds US3 → US4, each story with its
tests, use case and screen.

**🎯 MVP**: the P1 stories **US1, US2, US6**, plus **all of US5** (Phase 6): Club-user management, because without it
the Admin could give EC members and treasurers access only by editing the ClubUsers sheet by hand, bypassing the change
history and the last-Admin rule; and deletion, because FR-008 relies on Admin deletion to keep spam and test
self-registrations out of the register once the public form is live (owner decision 2026-10-27, analysis I1). Tasks
marked 🎯 belong to the MVP. Task IDs are kept stable when tasks move between phases, so IDs are not always in order.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: the user story the task serves (US1…US6)
- Paths are relative to the repository root (single Apps Script project, plan.md "Project Structure")

## Additions to the plan's port list

Two ports are needed that plan.md does not name; both are thin and pure at the interface:

- `Crypto` (`sha256Hex`, `hmacSha256Hex`, `randomToken`): session-token hashes (R1), form-token HMAC and content hash
  (R5). Apps Script implements it with `Utilities`; memory uses Node `crypto`.
- `AlertNotifier` (`notifyRateLimit`): the at-most-hourly rate-limit email to the Club account (R5). Apps Script
  implements it with `MailApp`.

---

## Phase 1: Setup (tooling skeleton)

**Purpose**: build, lint, Jest, i18n check, fixture check, harness and CI, so every later task lands on a green pipeline.

- [X] T001 Create `package.json` (Node 22 in `engines`, **no runtime dependencies**; dev dependencies typescript,
  esbuild, @google/clasp, jest, ts-jest, @types/jest, @types/google-apps-script, eslint, typescript-eslint,
  @playwright/test, all pinned) with scripts `build`, `lint`, `typecheck`, `test`, `test:ui`, `check:i18n`,
  `check:fixtures`, `fixtures`, `harness`, `dev:create`, `deploy:dev`, `deploy:prod`; run `npm install` to create
  `package-lock.json`
- [X] T002 Create `tsconfig.json` (strict, target ES2020, `noEmit`, includes `src`, `tests`, `scripts`) and
  `jest.config.ts` (ts-jest; roots `tests/unit`, `tests/application`, `tests/contract`; ignores `tests/ui`)
- [X] T003 Create the source and test folders from plan.md "Project Structure" with a `.gitkeep` each:
  `src/{domain,application,ports,adapters/gas,adapters/memory,server,ui/pages,ui/client,ui/styles,i18n}`,
  `tests/{unit,application,contract,ui,fixtures}`, `scripts/`, `config/`
- [X] T004 [P] Create `eslint.config.mjs` with typescript-eslint and: `no-restricted-globals` for Apps Script globals
  (`SpreadsheetApp`, `LockService`, `CacheService`, `PropertiesService`, `UrlFetchApp`, `HtmlService`, `Utilities`,
  `MailApp`, `Session`, `ScriptApp`, `Logger`) in `src/domain`, `src/application`, `src/ports`,
  `src/adapters/memory`, `src/ui`; `no-console` everywhere except `src/adapters/gas/logger.ts` (FR-027);
  `no-restricted-properties` banning `innerHTML`/`outerHTML`/`insertAdjacentHTML` in `src/ui/client` (R1-6)
- [X] T005 [P] Create `src/appsscript.json`: runtime V8, `timeZone: "America/Halifax"`, `oauthScopes` exactly
  spreadsheets, script.external_request, script.send_mail, userinfo.email; `webapp.executeAs: USER_DEPLOYING`,
  `webapp.access: ANYONE_ANONYMOUS`
- [X] T006 [P] Add `.clasp.json`, `.clasp.dev.json`, `.clasp.prod.json`, `dist/`, `test-results/`,
  `playwright-report/` to `.gitignore`; create `.clasp.example.json` (placeholders `scriptId`, `rootDir: "dist"`,
  `deploymentId`) and `config/script-properties.example.json` with placeholder values for `SPREADSHEET_ID`,
  `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, `FORM_TOKEN_SECRET`, `WEB_APP_URL`, `BOOTSTRAP_ADMIN_EMAIL`,
  `MEMBER_NUMBER_START` (`1001`), `ENVIRONMENT` (`dev`), optional `PUBLIC_RATE_LIMIT_PER_10_MIN` (`30`, R5)
- [X] T007 Write `scripts/build.mjs`: esbuild bundles `src/server/main.ts` to `dist/Code.js` (ES2020, IIFE exposing a
  `__registry` object), then appends one top-level stub per entry of `src/server/endpoints.ts` plus `doGet`, `setup`,
  `seedSyntheticMembers`, `runAdapterChecks`; bundles `src/ui/client/*.ts` and inlines it, `src/ui/styles/*.css` and
  both `src/i18n/*.json` into `dist/register.html`, `dist/signin.html`, `dist/app.html`, and makes both
  `src/i18n/*.json` available to server code in `dist/Code.js` (for the bilingual alert email, T052); copies
  `src/appsscript.json`.
  Start with a stub `src/server/main.ts` and an empty registry so `npm run build` exits 0
- [X] T008 [P] Write failing tests for the translation check in `tests/unit/check-i18n.test.ts` (FR-020, FR-021,
  SC-004, Principle III): key-set mismatch, empty value, placeholder mismatch (`{n}`), a `t('…')` key used in
  `src/ui`, `src/application` or `src/server` but missing,
  and a `term.*` value that differs from `docs/brief/glossary.md` each make the check fail; matching inputs pass
- [ ] T009 Implement `scripts/check-i18n.mjs` (exported `checkI18n()` plus CLI exit code) to make T008 pass, reading
  `src/i18n/en.json`, `src/i18n/zh-Hans.json`, `src/ui/**`, `src/application/**`, `src/server/**` and the
  English/Chinese columns of `docs/brief/glossary.md`
- [ ] T010 [P] Create `src/i18n/en.json` and `src/i18n/zh-Hans.json` holding only the `term.*` keys for every glossary
  term this feature uses (member, member number, Admin, EC member, treasurer, Club user, Club role, Note, registration
  event, individual membership, family membership, delete, duplicate registration attempt, change history), values
  copied from `docs/brief/glossary.md`, so `npm run check:i18n` exits 0
- [ ] T011 [P] Write the synthetic fixture generator `tests/fixtures/synthetic.ts` (pure, deterministic seed): `n`
  members (default 3,000) with names `Test Person 0001…`, Chinese names from a fixed list of test names, emails
  `test0001@example.org…`, phones `<area>-555-01xx` cycling a fixed list of NANP area codes so every `phone_key` is
  unique, about 30% without WeChat ID or birthday, 10% family; plus `tests/fixtures/generate.mjs` (`npm run fixtures`)
  writing `tests/fixtures/members.synthetic.json`
- [ ] T012 [P] Write failing tests for the fixture scan in `tests/unit/check-fixtures.test.ts` (Principle I): an email
  outside `example.org`/`example.com`, a phone whose line number is not `555-01xx`, and a non-test name pattern in
  `tests/` or `scripts/` fail the scan; output of `tests/fixtures/synthetic.ts` passes
- [ ] T013 Implement `scripts/check-fixtures.mjs` (exported `checkFixtures()` plus CLI exit code) scanning `tests/`,
  `scripts/` and `src/server/setup.ts` to make T012 pass
- [ ] T014 Write `scripts/harness.mjs` skeleton: HTTP server on port 5173 serving `dist/*.html` and injecting a stub
  `google.script.run` that forwards calls to `POST /rpc/<function>`; for now `/rpc` answers
  `{ok:false,error:{code:'INTERNAL'}}` (wired to memory adapters in T077)
- [ ] T015 [P] Create `playwright.config.ts` (testDir `tests/ui`; projects `phone` 360×740 and `desktop` 1280×800,
  Chromium; `webServer: npm run build && npm run harness`) and layout helpers in `tests/ui/helpers/layout.ts`:
  `expectNoHorizontalScroll` (`scrollWidth <= 360`), `expectTapTargets` (every interactive element ≥ 44×44 CSS px),
  `expectReadableText` (inputs ≥ 16 px, body text ≥ 14 px), `expectNoOverflow` (R8, FR-028)
- [ ] T016 Create `.github/workflows/ci.yml` (pull requests and pushes to `main`; Node 22; `npm ci`; `lint`;
  `typecheck`; `test`; `check:i18n`; `check:fixtures`; `build`; `npx playwright install --with-deps chromium`;
  `test:ui`; upload the Playwright report on failure). No secrets, no deploy step (R7)

**Checkpoint**: `npm run lint && npm run typecheck && npm test && npm run check:i18n && npm run check:fixtures && npm run build` exit 0 locally and in CI.

---

## Phase 2: Foundational (domain modules, ports, memory adapters, server core)

**Purpose**: pure rules and the layer seams every story uses. **No story work starts before this phase is done.**

### Tests first (domain) ⚠️ write and see them fail before T026–T034

- [ ] T017 [P] Write failing tests in `tests/unit/normalize.test.ts` (FR-012, FR-013; US2-AS2, US2-AS4, US2-AS5):
  email key = trimmed lowercase; phone key: digits and a leading `+` kept, NANP "10 digits (area code and exchange
  start with 2–9), optional leading `1`/`+1` removed → key is the 10 digits", others "must start with `+` and have
  8–15 digits → key is `+` + digits"; `(604) 555-0123`, `604-555-0123`, `+1 604 555 0123` share one key; text key =
  NFKC, lowercase, whitespace collapsed
- [ ] T018 [P] Write failing tests in `tests/unit/birthday.test.ts` (FR-005; US1-AS5): month 1–12; day valid for
  month using a fixed leap-year table; `{2,29}` accepted, `{2,30}`, `{4,31}`, `{13,1}`, `{0,5}` rejected
  (`birthday_invalid`); month and day empty together or both set ("empty iff `birthday_day` empty"); no year field
- [ ] T019 [P] Write failing tests in `tests/unit/validation.test.ts` (FR-004, FR-006, FR-007; US1-AS3, US1-AS8,
  US3-AS1): all errors returned at once as `{field, code}`; `name_required` when both names empty; `required` for
  email, phone, membership type; `email_invalid` ("one `@`, non-empty local part, domain with a dot, no spaces, ≤ 254
  chars"); `phone_invalid`; `membership_type_invalid` (only `individual` | `family`); `privacy_ack_required`;
  `too_long` for `name_en` "text ≤ 100", `name_zh` "text ≤ 50", `email` "text ≤ 254", `phone` "text ≤ 30",
  `wechat_id` "text ≤ 50", `registration_event` "text ≤ 100", `note` "text ≤ 2,000"; `wechat_invalid` for internal
  spaces; registration event defaults to `N/A`; empty WeChat ID and birthday are valid; values are trimmed
- [ ] T020 [P] Write failing tests in `tests/unit/duplicates.test.ts` (FR-012; US1-AS6, US1-AS7, US3-AS3, US4-AS4,
  SC-005): email match ignores case; phone match across formats; email is reported before phone; the record being
  edited is excluded; a matching name alone never matches
- [ ] T021 [P] Write failing tests in `tests/unit/search.test.ts` (FR-013; US2-AS1…AS5, US2-AS7) for the query-shape
  table in `contracts/members.md`: digits ≤ 6 → exact member number or phone digit substring (≥ 4 digits); `@` →
  email substring; phone punctuation → phone-key substring; otherwise name/email text match; `1024` finds 1024,
  `mei lin` finds "Mei Lin Example", `林` finds "林美", `555-0123` and `6045550123` find "(604) 555-0123"; exact
  member-number match first, then by member number ascending; at most 25 with `truncated`; empty or > 100 chars →
  `VALIDATION_FAILED`; no matches → empty list
- [ ] T022 [P] Write failing table-driven tests in `tests/unit/permissions.test.ts` (FR-024, FR-025, SC-007; US2-AS6,
  US3-AS4, US4-AS6, US5-AS4, US6-AS4): every capability × each role, combined roles (treasurer+EC = union), empty roles
  = no capabilities, matching the matrix in data-model.md "Permission matrix"
- [ ] T023 [P] Write failing tests in `tests/unit/member.test.ts` (FR-002, FR-014; US4-AS5): editable fields are
  exactly `name_en`, `name_zh`, `membership_type`, `email`, `phone`, `wechat_id`, `birthday_month`/`birthday_day`,
  `registration_event`, `note`; a change set with `memberNumber`, `registrationDate`, `privacyAckDate` or any unknown
  key is rejected; `diff(old, merged)` lists only changed fields; `birthday: null` clears it
- [ ] T024 [P] Write failing tests in `tests/unit/history.test.ts` (FR-018; US4-AS1…AS3, US5-AS2): a creation entry
  carries every submitted field as `new_value` (including `privacy_ack_date`, `registration_event`); an update entry
  lists `fields_changed` names and old/new values; the deletion plan is "purge values of member N, then append
  `member_deleted` with values `name_en`, `name_zh` (old = name, new empty) and `reason`"; role-change values keep
  roles; timestamps are ISO 8601 with the Halifax offset
- [ ] T025 [P] Write failing tests in `tests/contract/schema-principles.test.ts` (FR-002, FR-006, Principle II): the
  Members columns in `src/adapters/gas/schema.ts` are exactly those in data-model.md; no column or `RegistrationInput`
  field is named like card, bank, payment, address, or birth year; sheet order is README, Members, ClubUsers,
  ChangeHistory, ChangeValues, Counters

### Implementation (domain)

- [ ] T026 Copy `specs/001-member-registry/contracts/api-types.ts` to `src/server/api-types.ts` (unchanged, the
  single source of request/response types for server and client) and create `src/domain/errors.ts` (`DomainError`
  carrying an `ErrorCode` and optional `FieldError[]`)
- [ ] T027 [P] Implement `src/domain/normalize.ts` to make T017 pass
- [ ] T028 [P] Implement `src/domain/birthday.ts` to make T018 pass
- [ ] T029 Implement `src/domain/validation.ts` to make T019 pass (uses normalize and birthday)
- [ ] T030 [P] Implement `src/domain/duplicates.ts` to make T020 pass
- [ ] T031 [P] Implement `src/domain/search.ts` to make T021 pass
- [ ] T032 [P] Implement `src/domain/permissions.ts` (matrix as data) to make T022 pass
- [ ] T033 [P] Implement `src/domain/member.ts` (`MembershipType`, `Member`, `MemberInput`, `MemberSummary`,
  editable-field list, `applyChanges`, `diff`) to make T023 pass
- [ ] T034 Implement `src/domain/history.ts` (entry builders and deletion plan) to make T024 pass
- [ ] T035 Write `src/adapters/gas/schema.ts` (pure data, no Apps Script globals): for each sheet the row-1 column keys
  and row-2 bilingual descriptions from data-model.md, column type, max length and text format; to make T025 pass

### Tests first (ports and memory adapters)

- [ ] T036 [P] Write failing tests in `tests/contract/history-port-shape.test.ts` (FR-018, Principle IV; US4-AS5):
  the `HistoryRepository` type and the memory implementation have `append` and read methods and **no** update or
  delete method; the only removal method is `purgeMemberValues(memberNumber)`, which removes only ChangeValues rows of
  that member and leaves every ChangeHistory row unchanged
- [ ] T037 [P] Write failing port-conformance tests in `tests/contract/ports.conformance.test.ts` against the memory
  adapters: Members get/list/insert/update/remove by member number; ClubUsers find by email, `google_sub`, `user_id`;
  CounterStore values only increase; Lock `tryLock` times out (→ `BUSY` path); Cache TTL expiry with a fake Clock;
  Clock returns Halifax-offset ISO timestamps and `YYYY-MM-DD` dates; Logger accepts only `{event, code, memberNumber?,
  userId?, durationMs?}`

### Implementation (ports and memory adapters)

- [ ] T038 Define storage ports in `src/ports/storage.ts`: `MemberRepository`, `HistoryRepository` (ChangeHistory +
  ChangeValues, shape per T036), `ClubUserRepository`, `CounterStore`, `MemberReferences` (`hasDependents`)
- [ ] T039 Define platform ports in `src/ports/platform.ts`: `Lock`, `Cache`, `Clock`, `Config`, `IdentityProvider`
  (`exchangeCode(code) → claims`), `Logger`, `Crypto`, `AlertNotifier` (see "Additions to the plan's port list")
- [ ] T040 [P] Implement `src/adapters/memory/storage.ts` (memory Members, History, ClubUsers, Counters,
  MemberReferences returning "none", plus a `failNextAppend()` switch for rollback tests) to make T036 and the storage
  part of T037 pass
- [ ] T041 [P] Implement `src/adapters/memory/platform.ts` (memory Lock with simulated contention, Cache, fake Clock
  in America/Halifax, Config from an object, fake IdentityProvider returning configured claims, recording Logger, Node
  `crypto` Crypto, recording AlertNotifier) to make the platform part of T037 pass
- [ ] T042 Create the test composition helper `tests/application/helpers/world.ts`: builds use cases on memory
  adapters, seeds Club users (Admin `U0001`, EC member, treasurer, treasurer+EC, no-roles user) and synthetic members
  from `tests/fixtures/synthetic.ts`, and exposes the recording Logger

### Server core (registry, envelope, guard, sessions)

- [ ] T043 Write failing tests in `tests/contract/api-guard.test.ts` (FR-023, FR-025, FR-026, FR-027; US5-AS3,
  US6-AS4): missing/expired/unknown session → `NOT_SIGNED_IN`; a user whose roles are now empty → `NOT_SIGNED_IN`;
  roles re-read from ClubUsers on every call (a role removed between two calls takes effect on the second);
  capability missing → `FORBIDDEN`; refusals carry no member fields; a thrown error becomes `INTERNAL` and the handler
  never throws; each call logs only `{endpoint, outcome, memberNumber | userId, durationMs}`
- [ ] T044 Write failing tests in `tests/application/sessionStore.test.ts` (R1, FR-029): sessions are stored under
  `session:<sha256(token)>` with value `{userId, createdAt}` only; the raw token is never stored; 6-hour sliding TTL;
  12-hour absolute limit; tokens are 256-bit random
- [ ] T045 Implement `src/application/sessionStore.ts` (create, resolve, touch, delete) to make T044 pass
- [ ] T046 Implement `src/server/endpoints.ts` (registry type `{name, access: 'public' | 'owner' | Capability |
  'session', handler}`, empty list) and `src/server/api.ts` (envelope, guard, error mapping, logging) to make T043 pass
- [ ] T047 Write failing tests in `tests/contract/endpoint-registry.test.ts` (SC-007, R2): every stub generated by
  `scripts/build.mjs` has a registry entry with an access rule; owner entries (`setup`, `seedSyntheticMembers`,
  `runAdapterChecks`) are marked `owner`; internal helpers end in `_`; public endpoints' declared response types
  contain no member field other than `memberNumber`; then export a `stubNames()` function from `scripts/build.mjs` so
  the test can read the generated list
- [ ] T102 [P] Write failing tests in `tests/contract/logging.test.ts` (FR-027, Principle I, spike F2): a table of
  logging scenarios per endpoint (synthetic inputs through `src/server/api.ts`, including the OAuth `code` and session
  token for sign-in); the test **fails if a registered endpoint has no scenario**, and for each scenario asserts the
  recording Logger never receives a name, email, phone, WeChat ID, birthday, Note, OAuth `code` or session token. Each
  story phase adds its endpoints' scenarios before registering them (like `role-matrix.test.ts`)
- [ ] T133 [P] Write `tests/contract/ac-coverage.test.ts` (Principle V): parse every `US<n>-AS<m>` acceptance scenario
  from `specs/001-member-registry/spec.md` and fail if a scenario of a story listed in `AC_SCOPE` has no tagged test in
  `tests/**`. `AC_SCOPE` starts empty; T100 adds the MVP stories, T119 adds US3 and T125 adds US4, and the test must stay green

**Checkpoint**: domain, ports, memory adapters and the API guard are tested and green. Story use cases can start.

---

## Phase 3: User Story 1 — Self-registration (Priority: P1) 🎯 MVP

**Goal**: an anonymous visitor submits the registration form and becomes a member immediately with a new member
number, seeing nothing about anyone else.

**Independent Test**: through `submitRegistration(null, request)` on memory adapters, each US1 scenario produces the
specified record, history and response; the response never contains member data other than the new member number.

### Tests for User Story 1 ⚠️ write first, see them fail

- [ ] T048 [P] [US1] Write failing tests in `tests/application/registerMember.public.test.ts` (FR-001, FR-003, FR-004,
  FR-005, FR-007, FR-008, FR-009, FR-012, FR-018): **US1-AS1** result is exactly `{kind:'created', memberNumber}`,
  record has today's Halifax `registration_date` and `privacy_ack_date`, `version = 1`, empty Note, ChangeHistory
  `member_created` with `actor_kind = self_registration`, ChangeValues for every submitted field, and is immediately
  found by search and count; **US1-AS2** family creates one record with only primary-contact fields; **US1-AS3** no
  WeChat ID or birthday succeeds; **US1-AS4** event name stored, unchanged field stores `N/A`; **US1-AS5** Feb 29 ok,
  Feb 30 refused; **US1-AS6** existing email or phone (any format) → `ALREADY_REGISTERED` with no `memberNumber`,
  `matched` or record data, and no new row; **US1-AS7** same name, different email and phone succeeds; **US1-AS8**
  missing/invalid fields or no privacy acknowledgment → `VALIDATION_FAILED` with every field error, nothing saved;
  edge cases "former member registers again" and "deleted records do not count"
- [ ] T049 [P] [US1] Write failing tests in `tests/application/registerMember.numbers.test.ts` (FR-001, FR-018, R4):
  first number is 1001 (or `MEMBER_NUMBER_START`); next = max(counter, high-water + 1, max row + 1); concurrent
  registrations get sequential numbers without gaps; a failed history append rolls back the row and does not consume
  a number → `SAVE_FAILED`; a lock timeout → `BUSY` with nothing saved (edge case "connection drops during save");
  numbers of removed rows are never reused
- [ ] T050 [P] [US1] Write failing tests in `tests/application/antiAbuse.test.ts` (FR-010, R5; edge cases "submits
  twice" and "automated submissions"): honeypot filled → `{kind:'received'}` and nothing stored; form token forged,
  younger than 3 s or older than 24 h → `FORM_EXPIRED`; more than 30 public submissions in a 10-minute window →
  `RATE_LIMITED` and at most one `AlertNotifier` call per hour; same `submissionId` twice → same `memberNumber`, one
  record; identical content with a new id within 10 minutes → same `memberNumber`, not `ALREADY_REGISTERED`; changed
  content with the same email → `ALREADY_REGISTERED`; cached envelopes hold only the outcome and member number; the
  `AlertNotifier` message is built from `email.rateLimit.subject` and `email.rateLimit.body` in **both** languages
  (English first, then Chinese, in one email) and contains no member data (Principle III)
- [ ] T051 [P] [US1] Write failing tests in `tests/contract/public-endpoints.test.ts` (FR-009, FR-023, SC-007;
  US1-AS1, US1-AS6): `submitRegistration` is registered `public`; called with a null session through `src/server/api.ts`
  its success and error envelopes contain no member field except `memberNumber` on success; the Logger received no
  email, phone, name or WeChat value (FR-027)

### Implementation for User Story 1

- [ ] T052 [US1] Implement `src/application/antiAbuse.ts` (issue/verify form token with `Crypto.hmacSha256Hex`,
  honeypot check, rate-limit window and hourly alert whose subject and body are resolved from `email.rateLimit.*`
  keys in `src/i18n/en.json` and `src/i18n/zh-Hans.json`, `submission:`/`content:` cache keys with 10-minute TTL) to
  make T050 pass
- [ ] T053 [US1] Implement the public channel of `src/application/registerMember.ts` (processing steps 1–10 in
  `contracts/public.md`, inside the lock, with snapshot/rollback and counter commit after the history append) to make
  T048 and T049 pass
- [ ] T054 [US1] Register `submitRegistration` (access `public`) in `src/server/endpoints.ts` and add the memory
  composition `src/server/composeMemory.ts` used by contract tests and the harness, after adding its scenarios to
  `tests/contract/logging.test.ts` (T102), to make T051 and T102 pass

**Checkpoint**: US1 works end to end on memory adapters. `US1` joins `AC_SCOPE` in T100, once T091 is also
green (Phase 8).

---

## Phase 4: User Story 2 — Find a member quickly (Priority: P1) 🎯 MVP

**Goal**: signed-in Admins, EC members and treasurers search by member number, names, email or phone and open a
member's full details and change history.

**Independent Test**: with 3,000 synthetic members on memory adapters, each US2 query returns the right records, and
`getMember` returns every field and the history for each of the three roles.

### Tests for User Story 2 ⚠️ write first, see them fail

- [ ] T055 [P] [US2] Write failing tests in `tests/application/searchMembers.test.ts` (FR-013, FR-016, SC-001):
  **US2-AS1** `1024`; **US2-AS2** `"  MEI   lin "`; **US2-AS3** `林美` and `林`; **US2-AS4** `6045550123` and
  `555-0123`; **US2-AS5** `mei.lin@example.org` against `Mei.Lin@example.org`; **US2-AS7** no matches → empty list;
  results are `MemberSummary` only, at most 25 with `truncated`; one repository read per call; correct results over
  the 3,000-row synthetic set
- [ ] T056 [P] [US2] Write failing tests in `tests/application/getMember.test.ts` (FR-014, FR-025, FR-018): **US2-AS6**
  a treasurer gets member number, names, membership type, email, phone, WeChat ID, birthday, registration and privacy
  acknowledgment dates, Note, `version` and history (newest first, actor display names from ClubUsers,
  "self_registration" actor); unknown number → `NOT_FOUND`; `countMembers` equals the number of Members rows (FR-008,
  SC-008)
- [ ] T057 [P] [US2] Write failing tests in `tests/contract/members-read.test.ts` (FR-025, SC-007; US2-AS6, US2-AS8
  server side): `searchMembers`, `countMembers`, `getMember` allowed for treasurer, EC member, Admin, treasurer+EC;
  `NOT_SIGNED_IN` with no or invalid session; refusals carry no member data
- [ ] T134 [P] [US2] Write failing tests in `tests/contract/performance.test.ts` (SC-001 support): `searchMembers` over
  3,000 synthetic rows in memory completes the domain filtering in under 50 ms

### Implementation for User Story 2

- [ ] T058 [US2] Implement `src/application/searchMembers.ts` (`searchMembers`, `countMembers`) to make T055 and T134
  pass
- [ ] T059 [US2] Implement `src/application/getMember.ts` (record + history view with actor names) to make T056 pass
- [ ] T060 [US2] Register `searchMembers`, `countMembers` (`member.search`) and `getMember` (`member.viewDetails`) in
  `src/server/endpoints.ts`, after adding their scenarios to `tests/contract/logging.test.ts`, to make T057 and T102 pass

**Checkpoint**: US1 and US2 work on memory adapters. `US2` joins `AC_SCOPE` in T100 (Phase 8).

---

## Phase 5: User Story 6 — Bilingual use and role-based access (Priority: P1) 🎯 MVP

**Goal**: Google-account sign-in for Club users, sessions, language persistence, the route rules for visitors who are
not signed in, and the full role matrix.

**Independent Test**: on memory adapters, only Google-verified active Club users get a session; every registered
endpoint gives the expected allow/refuse result for every caller kind; routes for anonymous visitors expose only
registration and sign-in; the language choice survives a new sign-in.

### Tests for User Story 6 ⚠️ write first, see them fail

- [ ] T061 [P] [US6] Write failing tests in `tests/application/signIn.test.ts` (FR-023, FR-029, R1): `beginSignIn`
  rejects a `clientNonce` shorter than 32 chars (`VALIDATION_FAILED`), stores `oauthstate:<state>` → `{clientNonce}`
  for 10 minutes, and builds the Google URL with `client_id`, `redirect_uri = WEB_APP_URL`, `response_type=code`,
  `scope=openid email`, `prompt=select_account`, `state`; the callback accepts only claims with `iss` in
  {`accounts.google.com`, `https://accounts.google.com`}, `aud = CLIENT_ID`, future `exp`, `email_verified = true`;
  binds `google_sub` on the first sign-in by lowercased email, then matches by `sub`; unknown account or empty roles
  → `NOT_A_CLUB_USER`; unknown or reused state → `SIGN_IN_FAILED`; success returns `{sessionToken, clientNonce}`
- [ ] T062 [P] [US6] Write failing tests in `tests/application/signIn.followups.test.ts` (spike F2, F3; FR-027):
  **F2** the OAuth `code`, access token and ID token never reach the Logger, any repository, the Cache, or any value
  returned to the page; **F3** a callback whose `state` was already used, arriving with a valid session for the same
  browser (`clientNonce` matches the consumed state's record), returns a `continue` outcome (clean app URL, session
  kept) and no error code
- [ ] T063 [P] [US6] Write failing tests in `tests/application/session.test.ts` (FR-020, FR-024, FR-025): `whoAmI`
  returns `userId`, `email`, `displayName`, roles, capabilities as the union over roles (**US6-AS4**) and the saved
  language, and refreshes the sliding TTL; **US6-AS2** `setLanguage('zh-Hans')` then a new sign-in → `whoAmI` returns
  `zh-Hans`; invalid language → `VALIDATION_FAILED`; `setLanguage` writes no change-history entry; `signOut` deletes
  the session and is idempotent
- [ ] T064 [P] [US6] Write failing tests in `tests/unit/routes.test.ts` (FR-023; US6-AS3): `resolveRoute(params)` maps
  no params, `page=register` and unknown params to `register`; `page=signin` to `signin`; `code`+`state` to `callback`;
  `page=app` to `appShell`; no route returns member data
- [ ] T065 [P] [US6] Write failing table-driven tests in `tests/contract/role-matrix.test.ts` (FR-023, FR-025, FR-026,
  SC-007; US6-AS3, US6-AS4): for every endpoint in the registry, call it as no session, invalid session, unknown Google
  account, treasurer, EC member, Admin, treasurer+EC, and compare with an expectation table copied from
  `contracts/README.md` "Access summary"; the test fails if a registered endpoint has no expectation row; refusals
  carry no member data
- [ ] T066 [P] [US6] Write failing tests in `tests/contract/no-password.test.ts` (FR-029, R8): no column in
  `src/adapters/gas/schema.ts` and no field in `src/server/api-types.ts` is named like `password`, `passcode`, `pin`,
  `otp`, `secret` or `credential`; session entries hold only the token hash; no endpoint accepts an email-only sign-in
- [ ] T067 [P] [US6] Write failing tests in `tests/unit/i18n-runtime.test.ts` (FR-020, FR-022; US6-AS1): `t(key,
  params)` replaces placeholders and throws on a missing key in tests; dates use `Intl.DateTimeFormat` with `en-CA` /
  `zh-CN`; birthday shows "March 5" / "3月5日"; visitor language resolves `?lang=` → `sessionStorage` →
  `navigator.language` → `en`; every `ErrorCode` and `FieldErrorCode` in `src/server/api-types.ts` maps to an
  `error.<code>` key

### Implementation for User Story 6

- [ ] T068 [US6] Implement `src/application/signIn.ts` (`beginSignIn`, `completeSignIn` with claim checks, `sub`
  binding, F2 handling, F3 `continue` outcome) to make T061 and T062 pass
- [ ] T069 [US6] Implement `src/application/session.ts` (`whoAmI`, `signOut`, `setLanguage`) to make T063 pass
- [ ] T070 [P] [US6] Implement `src/server/routes.ts` (pure `resolveRoute`) to make T064 pass
- [ ] T071 [P] [US6] Implement `src/ui/client/i18n.ts` (`t`, language resolution, `Intl` date and birthday formatting)
  to make T067 pass, adding the `error.*` keys for every code to `src/i18n/en.json` and `src/i18n/zh-Hans.json`
  (Chinese marked draft until T089)
- [ ] T072 [US6] Register `beginSignIn` (`public`) and `whoAmI`, `signOut`, `setLanguage` (`session`) in
  `src/server/endpoints.ts`, after adding their scenarios (including the OAuth `code` and session token) to
  `tests/contract/logging.test.ts`, to make T065, T066 and T102 pass for every endpoint registered so far

**Checkpoint**: all P1 use cases (US1, US2, US6) pass on memory adapters. The MVP back end still needs US5 (Phase 6)
and the Apps Script adapters (Phase 7). `US6` joins `AC_SCOPE` in T100 (Phase 8).

---

## Phase 6: User Story 5 — Club-user management and deletion (Priority: P2, pulled into the MVP) 🎯

**Why in the MVP**: US6 role-based access is only usable in production if the Admin can give EC members and
treasurers their roles. Without this, the only route would be editing the ClubUsers sheet by hand, which bypasses
the change history (FR-018) and the last-Admin rule (FR-015). Deletion is needed for the same reason: registrations
become members immediately (FR-008), so once the public form is live the Admin must be able to remove spam and test
records through the audited deletion (FR-016, research R3) rather than by editing the sheet.

**Independent Test**: as an Admin on memory adapters, add a Club user and change their roles; the next call by that
user has exactly the new permissions; the last Admin cannot be removed; a deleted record disappears from search and
count, leaving only the deletion entry's number, name and reason; EC members and treasurers are refused.

### Tests ⚠️ write first, see them fail

- [ ] T073 [P] [US5] Write failing tests in `tests/application/clubUsers.test.ts` (FR-015, FR-018, FR-024):
  `addClubUser` validates email, `display_name` "text ≤ 100" (1…100), roles a non-empty subset of `admin`,
  `ec_member`, `treasurer` (`roles_invalid`), refuses an existing email (`VALIDATION_FAILED`, field `email`), assigns
  `U` + 4 digits ascending, writes `club_user_added` with values `email`, `display_name`, `roles`; **US5-AS3**
  `setClubUserRoles` changes permissions on that user's next call and records `roles_changed` old/new; empty roles keep
  the row and make existing sessions `NOT_SIGNED_IN`; removing the last Admin, including one's own role → `LAST_ADMIN`
  (edge case "Admin removes their own Admin role"); stale version → `VERSION_CONFLICT`; `listClubUsers` sorted by
  display name with `hasSignedIn`; **US5-AS4** (role-management part) EC member and treasurer → `FORBIDDEN` for all three
- [ ] T074 [P] [US5] Add failing rows for `listClubUsers`, `addClubUser`, `setClubUserRoles` to
  `tests/contract/role-matrix.test.ts` (FR-025, US5-AS4)
- [ ] T126 [P] [US5] Write failing tests in `tests/application/deleteMember.test.ts` (FR-016, FR-017, FR-018, SC-006):
  **US5-AS1** missing reason → `reason_required` (reason 1…200 chars), `confirmed = false` → `confirmation_required`,
  nothing deleted; **US5-AS2** after deletion the record is absent from search and `countMembers` drops by one; every
  earlier ChangeHistory row is unchanged; ChangeValues for that member hold only the deletion entry's `name_en`,
  `name_zh`, `reason`; the deletion entry is readable through `HistoryRepository` by member number (SC-006); a scan of
  every memory repository and the Cache finds none of the member's email, phone, WeChat ID, birthday or Note;
  **US5-AS4** EC member and treasurer → `FORBIDDEN`; `MemberReferences.hasDependents = true` →
  `HAS_DEPENDENT_RECORDS`; stale version → `VERSION_CONFLICT`; the member number is not reused and the freed email
  and phone can register again (edge case "deleted records"); failure → snapshot restored, `SAVE_FAILED`
- [ ] T127 [US5] After T074 (same file), add failing rows for `deleteMember` to `tests/contract/role-matrix.test.ts`
  (FR-025, US5-AS4) and
  change `tests/contract/endpoint-registry.test.ts` to compare the registry with an explicit `EXPECTED_ENDPOINTS` list
  (12 after this task: the `ServerApi` functions except `updateMember`) plus the owner entries

### Implementation

- [ ] T075 [US5] Implement `src/application/clubUsers.ts` (`listClubUsers`, `addClubUser`, `setClubUserRoles`) to make
  T073 pass
- [ ] T076 [US5] Register the three Club-user functions (`clubUser.manage`) in `src/server/endpoints.ts`, after adding
  their scenarios to `tests/contract/logging.test.ts`, to make T074 and T102 pass
- [ ] T129 [US5] Implement `src/application/deleteMember.ts` (research R3 steps inside one lock, with snapshot and
  rollback) to make T126 pass
- [ ] T130 [US5] Register `deleteMember` (`member.delete`) in `src/server/endpoints.ts`, after adding its scenarios to
  `tests/contract/logging.test.ts`, to make T127 and T102 pass

**Checkpoint**: the MVP back end (12 endpoints) passes on memory adapters. `US5` joins `AC_SCOPE` in T100 (Phase 8).

---

## Phase 7: Apps Script adapters, setup and self-checks 🎯

**Purpose**: real storage and platform services behind the ports (plan step 5). Pure helpers are Jest-tested; the
rest is covered by `runAdapterChecks` in the dev project (Complexity Tracking #4). The whole phase is MVP work.

- [ ] T077 Wire `scripts/harness.mjs` to `src/server/composeMemory.ts` with `tests/fixtures/members.synthetic.json` and
  a harness-only sign-in (`/harness/signin?as=admin|ec|treasurer|treasurer_ec|unknown`) so `/rpc/<function>` runs the
  real application layer (R8)
- [ ] T078 [P] Write failing tests in `tests/unit/gas-rows.test.ts` (R9, data-model "Conventions"): values starting
  with `=`, `+`, `-`, `@` are written with a leading `'`; Members, ClubUsers, ChangeHistory, ChangeValues and Counters
  rows map to and from domain objects in the column order of `src/adapters/gas/schema.ts`; `+1 604…` and leading
  zeros survive as text
- [ ] T079 Implement the pure helpers `src/adapters/gas/rows.ts` (escaping and row mapping) to make T078 pass
- [ ] T080 [P] Implement the Sheets repositories in `src/adapters/gas/sheetsStorage.ts` (Members, ChangeHistory +
  ChangeValues with `purgeMemberValues`, ClubUsers, Counters plus the `MEMBER_NUMBER_HIGH_WATER` Script Property;
  one `getValues()` per read, one batched `setValues` per write, data starts at row 3)
- [ ] T081 [P] Implement `src/adapters/gas/platform.ts`: Lock (`LockService.getScriptLock().tryLock(15000)`), Cache
  (`CacheService.getScriptCache()`), Clock (`Utilities.formatDate` in `America/Halifax`), Config (Script Properties),
  Crypto (`Utilities.computeDigest`, `computeHmacSha256Signature`, random token), AlertNotifier (`MailApp`)
- [ ] T082 [P] Implement `src/adapters/gas/identityProvider.ts`: exchange the code at
  `https://oauth2.googleapis.com/token` with `UrlFetchApp` and decode the ID-token payload; never log, store or return
  the `code` or tokens (spike F2)
- [ ] T083 [P] Implement `src/adapters/gas/logger.ts` (the only `console` use; writes only the Logger port fields, FR-027)
- [ ] T084 Write failing tests in `tests/contract/owner-entrypoints.test.ts` (R9 "First Admin", contracts README):
  `assertOwner(activeEmail, ownerEmail)` refuses an empty or different email; `assertDev(environment)` refuses
  anything but `dev`; `setup` plan is idempotent (re-running adds nothing); the first Admin comes from
  `BOOTSTRAP_ADMIN_EMAIL`
- [ ] T085 Implement `src/server/setup.ts` to make T084 pass: `setup()` (owner-only) creates the six sheets in order,
  row-1 keys and row-2 bilingual descriptions from `schema.ts`, two frozen rows, plain-text formats, the
  `membership_type` list validation, warning-only protections, grouped key columns, the bilingual README sheet, Counters
  (`schema_version = 1`) and the first Admin; `seedSyntheticMembers()` (owner and dev only) loads
  `tests/fixtures/synthetic.ts` output; `runAdapterChecks()` (owner and dev only) checks Sheets read/write round trip,
  text escaping, lock contention, cache TTL and history purge on a scratch member, and returns "all checks passed" or
  the failing check names
- [ ] T086 Implement `src/server/compose.ts` (Apps Script composition) and `src/server/doGet.ts` from
  `contracts/routes.md`: register page with a fresh `formToken`, sign-in page, callback (exchange via
  `completeSignIn`; on success the app shell with `{sessionToken, clientNonce}`; on failure the sign-in page with the
  code; **F3**: the `continue` outcome renders the app shell with a "Continue" link to the clean `WEB_APP_URL`, no
  error), app shell; `XFrameOptionsMode.DEFAULT` and the viewport meta; never log `code` (**F2**)
- [ ] T087 Write `src/server/main.ts` exporting the registry, `doGet`, `setup`, `seedSyntheticMembers`,
  `runAdapterChecks` for `scripts/build.mjs`, and confirm `npm run build` produces `dist/Code.js` with a stub for every
  registered endpoint (12 in the MVP) and the owner entries (T047 green)

**Checkpoint**: `npm run build` produces a deployable `dist/`; the harness runs the real use cases.

---

## Phase 8: MVP UI screens, translations and 360px tests 🎯

**Purpose**: HtmlService screens in vanilla TypeScript with Playwright tests first (plan step 6), for US1, US2, US6
and Club-user management.

### Shared UI foundation

- [ ] T088 Implement `src/ui/client/api.ts` (promise wrapper over `google.script.run`, session token in
  `sessionStorage`, error codes → `error.*` keys) and `src/ui/client/router.ts` (hash routes `#search`,
  `#member/<n>`, `#users`, later `#register`; navigation built from `capabilities` and limited to screens present in
  the build); all user values rendered with `textContent` (R1-6)
- [ ] T089 Confirm the draft Chinese wording of the new glossary terms (member number, Admin, Note, registration
  event, delete, duplicate registration attempt, change history, Club user, Club role) with the Club and record the confirmed wording and
  date in `docs/brief/glossary.md` (FR-021). **Blocks T100 (final MVP translations)**
- [ ] T090 [P] Create the mobile-first stylesheet `src/ui/styles/main.css` (single column at 360 px, inputs 16 px,
  body ≥ 14 px, every control ≥ 44×44 px, visible focus, no fixed widths) (FR-028)

### User Story 1 UI

- [ ] T091 [P] [US1] Write failing Playwright tests in `tests/ui/register.spec.ts` (phone and desktop projects, both
  languages): **US1-AS10** 360 px layout helpers pass in the empty, validation-error, already-registered and
  confirmation states; **US1-AS9** switching language changes every label, option, instruction, privacy statement,
  validation message and confirmation and keeps entered values; **US1-AS1** confirmation shows the new member number
  and nothing else; **US1-AS8** each invalid field shows its own message; **US1-AS6** already-registered message shows
  no member data; the honeypot field is not visible or focusable; no Note field (FR-007); double tap creates one record
  (FR-010)
- [ ] T092 [US1] Implement `src/ui/pages/register.html` and the shared form component
  `src/ui/client/registrationForm.ts` (fields per FR-002 without Note, birthday month + day selects, registration
  event default `N/A`, privacy statement and acknowledgment, `submissionId` created once and reused on retry,
  `FORM_EXPIRED` → reload keeping values, `BUSY`/`SAVE_FAILED` → retry message) with `register.*` keys in
  `src/i18n/en.json` and draft `src/i18n/zh-Hans.json`, to make T091 pass

### User Story 2 UI

- [ ] T093 [P] [US2] Write failing Playwright tests in `tests/ui/search.spec.ts` (harness signed in as treasurer and as
  EC member, both languages): **US2-AS8** search, results and member view pass the 360 px helpers; **US2-AS7** "no
  members found" message; **US2-AS6** treasurer sees every field and the history with no edit, register, delete or
  users control; member count shown on the search screen (SC-008); typing is debounced and stale responses are ignored
- [ ] T094 [US2] Implement `src/ui/client/search.ts` (single search box, 300 ms debounce, stale-response guard,
  result list, member count) and `src/ui/client/memberView.ts` (all fields, birthday and dates via `Intl`, history
  newest first) with `search.*` and `member.*` keys, to make T093 pass

### User Story 6 UI

- [ ] T095 [P] [US6] Write failing Playwright tests in `tests/ui/access.spec.ts`: **US6-AS3** not signed in, `/`,
  `?page=app`, `#search`, `#users`, `#member/1001` show only registration and "Sign in", with no member data in the DOM;
  **US6-AS1** on every screen the language switch changes all text and glossary terms; sign-in page passes the 360 px
  helpers; **F1** the bilingual hint "use a browser or profile with only one Google account, or a private window" is
  visible on the sign-in page in both languages; an in-app user agent (MicroMessenger) shows the bilingual "open in
  Chrome or Safari" warning (R1-2, F4); **F3** reloading the callback URL after sign-in shows no error and keeps the
  session; the app shell shows the signed-in email and a sign-out button (R1-8)
- [ ] T096 [US6] Implement `src/ui/pages/signin.html` and `src/ui/client/signin.ts` (`clientNonce` in
  `sessionStorage`, `beginSignIn`, top-level link `target="_top"`, in-app-browser detection, F1 hint) with `signin.*`
  keys, to make the sign-in parts of T095 pass
- [ ] T097 [US6] Implement `src/ui/pages/app.html` and `src/ui/client/app.ts` (accept the embedded token only when
  `clientNonce` matches `sessionStorage`; `whoAmI`; capability-filtered navigation; signed-in email and sign-out;
  language switch calling `setLanguage`; F3 "Continue" handling; signed-out view with only Register and Sign in), to
  make the rest of T095 pass

### Club-user management UI (US5 part)

- [ ] T098 [P] [US5] Write failing Playwright tests in `tests/ui/club-users.spec.ts` (desktop 1280 px plus a phone smoke
  test): **US5-AS3** Add Club user and role ticks save and show in the list; the Add screen shows the "create a Google
  account for any email" hint (R1-5); removing the last Admin shows the `LAST_ADMIN` message; **US5-AS4** EC member and
  treasurer see no Club users navigation and `#users` shows the FR-026 refusal
- [ ] T099 [US5] Implement `src/ui/client/clubUsers.ts` (list, add, change roles with `expectedVersion`) with `users.*`
  keys, to make T098 pass

### Deletion UI (US5)

- [ ] T128 [P] [US5] Write failing Playwright tests in `tests/ui/delete.spec.ts` (desktop 1280 px plus a phone smoke
  test): **US5-AS1** Delete on the member view asks for a reason and a confirmation before deleting; **US5-AS2** the
  deleted record is gone from search and the count drops; **US5-AS4** EC member and treasurer see no Delete
- [ ] T131 [US5] Implement `src/ui/client/deleteMember.ts` (Delete action on the member view from T094) with
  `delete.*` keys, to make T128 pass

### MVP translations

- [ ] T100 Finalize every key used by the MVP screens in `src/i18n/zh-Hans.json` using the glossary wording confirmed
  in T089 (remove draft markers), so `npm run check:i18n` and all `tests/ui` language tests pass (FR-020, FR-021,
  SC-004); then add US1, US2, US5 and US6 to `AC_SCOPE` in `tests/contract/ac-coverage.test.ts` (T133) and keep it
  green. Depends on T089, T099 and T131

**Checkpoint**: all MVP screens pass their Playwright tests in both languages.

---

## Phase 9: MVP dev deployment and production release 🎯

**Purpose**: real-platform checks, the Admin guide, test 11, and the first production release (plan step 7,
research R7). Increment 2 reuses T101 and T104–T105 and repeats the checklist (T136).

- [ ] T101 Write `scripts/clasp-env.mjs` and wire `npm run dev:create`, `deploy:dev`, `deploy:prod`: copy
  `.clasp.dev.json` / `.clasp.prod.json` to `.clasp.json`, build, `clasp push`, then `clasp deploy -i <deploymentId>`
  (update in place); `deploy:prod` refuses to create a new deployment and supports `-- --version <n>` for rollback (R1-1)
- [ ] T103 [P] Review `src/` for `innerHTML`, unescaped template output in `src/ui/pages/*.html`, and secrets; confirm
  `config/script-properties.example.json` holds placeholders only; record findings and fixes in
  `specs/001-member-registry/checklists/release.md`
- [ ] T104 Set up the dev Apps Script project following quickstart.md §3 steps 1–8 (personal Google account,
  `Member Registry (DEV)`, `Member Registry DEV data`, Google Cloud project `member-registry-dev` with `openid email`
  published In production, redirect URI = dev `/exec` URL, all Script Properties, `setup`), and record the date and
  outcome (no IDs or secrets) in `specs/001-member-registry/checklists/release.md`
- [ ] T105 Run `seedSyntheticMembers` and `runAdapterChecks` in the dev project (quickstart §3 steps 9–10); record
  "all checks passed" or the failures in `specs/001-member-registry/checklists/release.md`; fix any failure in
  `src/adapters/gas/` before continuing
- [ ] T106 Write quickstart Part 2 additions in `specs/001-member-registry/quickstart.md`: section "Signing in: one
  Google account per browser" (**F1**: use a browser or browser profile with only one Google account signed in, or a
  private window; keep the Club Gmail account in its own Chrome profile); "Asking for help" (**F2**: never share the
  address bar after sign-in; redact any `code=` value in screenshots or messages); WeChat (F4: registration links work
  in WeChat, sign-in needs Chrome or Safari); creating a Google account for an existing email (R1-5); mark the
  register-on-behalf answer as "coming in the next release"
- [ ] T107 Make the README sheet written by `setup()` in `src/server/setup.ts` point to quickstart Part 2, repeat
  the F1 rule, and explain where deletion entries and Club-role changes are found in the ChangeHistory and
  ChangeValues sheets, all in both languages (spec Assumptions, SC-006)
- [ ] T108 Run the MVP manual phone checklist on the dev URL (quickstart.md §5 checks 1–5 and 8–12) on a real phone and
  desktop, plus: the F1 sign-in hint, F3 refresh after sign-in shows no error, and sign-in on Chrome Android and
  Firefox (not tested in the spike); record pass/fail per check in `specs/001-member-registry/checklists/release.md`
- [ ] T109 Run SPIKE-001 **test 11** in the dev project: a second Google account is added as editor of the dev
  script, updates the existing deployment, and the developer checks which account the web app executes as and whether
  sign-in and Sheets access still work; record the result as row 11 of the "Spike result" table in
  `specs/001-member-registry/research.md`
- [ ] T110 Finalize the production release procedure in `specs/001-member-registry/quickstart.md` §6 and research R7
  in `specs/001-member-registry/research.md` from the T109 result (who may push and who must deploy). **Depends on
  T109**; no production deploy before this task is done
- [ ] T111 Perform the production first-time setup with the Admin following quickstart.md §6 (Club account, project
  time zone `America/Halifax`, never-shared spreadsheet, `ENVIRONMENT = prod`), confirm `seedSyntheticMembers` and
  `runAdapterChecks` refuse in production, and record the date and outcome (no secrets or IDs) in
  `specs/001-member-registry/checklists/release.md`
- [ ] T112 Walk through quickstart Part 2 with the Admin (add an EC member and a treasurer, name a version in version
  history, the F1 one-account rule) and fix any unclear wording in `specs/001-member-registry/quickstart.md`
- [ ] T113 Tag the MVP release `v0.1.0` after CI is green, T108 passes and `AC_SCOPE` in
  `tests/contract/ac-coverage.test.ts` contains US1, US2, US5, US6; deploy it with `npm run deploy:prod` in a
  Club-account session following T110; record the tag, date and covered stories (US1, US2, US5, US6) in
  `specs/001-member-registry/checklists/release.md`

**🎯 MVP released.** Increment 2 (Phases 10–12) adds registering on someone's behalf and editing.

---

## Phase 10: User Story 3 — EC member registers on someone's behalf (Priority: P2)

**Goal**: signed-in EC members and Admins use the same `submitRegistration` with their session; the record names them
as creator.

**Independent Test**: as an EC member, a registration produces the same record as a self-registration except the
history actor; duplicates name the matched value and existing record; a treasurer is refused.

### Tests for User Story 3 ⚠️ write first, see them fail

- [ ] T114 [P] [US3] Write failing tests in `tests/application/registerMember.onBehalf.test.ts` (FR-011, FR-012):
  **US3-AS1** the US1 validation cases from T048 give identical field errors through the signed-in channel;
  **US3-AS2** success creates a record identical to a self-registration except ChangeHistory `actor_kind = club_user`
  with `actor_user_id`; **US3-AS3** existing email → `DUPLICATE_EMAIL` with `matched: 'email'` and `memberNumber`,
  existing phone → `DUPLICATE_PHONE`, email reported first; **US3-AS4** a treasurer-only session → `FORBIDDEN`;
  signed-in submissions skip honeypot, form token and rate limit
- [ ] T115 [P] [US3] Add failing rows to `tests/contract/role-matrix.test.ts` for `submitRegistration` with a session
  (treasurer `FORBIDDEN`; EC member, Admin allowed; FR-025, US3-AS4)
- [ ] T116 [P] [US3] Write failing Playwright tests in `tests/ui/register-on-behalf.spec.ts` (harness as EC member and
  as treasurer): **US3-AS1** `#register` renders the same form component, fields, privacy statement and messages as
  the public form; **US3-AS3** a duplicate shows which value matched and an "Open existing record" link to
  `#member/<n>`; **US3-AS4** treasurer has no Register navigation and `#register` shows the FR-026 refusal; 360 px helpers pass

### Implementation for User Story 3

- [ ] T117 [US3] Add the signed-in channel to `src/application/registerMember.ts` (capability `member.register`,
  `DUPLICATE_*` with `memberNumber`, club-user actor) to make T114 pass
- [ ] T118 [US3] Change the access rule of `submitRegistration` in `src/server/endpoints.ts` and `src/server/api.ts`
  to "public without a session, `member.register` with a session", after adding the signed-in scenario to
  `tests/contract/logging.test.ts`, to make T115 and T102 pass
- [ ] T119 [US3] Implement `src/ui/client/registerOnBehalf.ts` reusing `registrationForm.ts` with the session token and
  the duplicate-with-link message, add `#register` to `src/ui/client/router.ts`, with `register.onBehalf.*` keys, to
  make T116 pass; then add US3 to `AC_SCOPE` (T133) and keep it green

**Checkpoint**: US3 works in the harness on top of the MVP; `AC_SCOPE` includes US3 (T119).

---

## Phase 11: User Story 4 — View and update a member's details and Note (Priority: P2)

**Goal**: EC members and Admins edit every editable field and the Note with optimistic concurrency and full history.

**Independent Test**: as an EC member, edits appear on the record and in the change history with old/new values;
conflicting edits are refused for review; treasurers are refused.

### Tests for User Story 4 ⚠️ write first, see them fail

- [ ] T120 [P] [US4] Write failing tests in `tests/application/updateMember.test.ts` (FR-012, FR-014, FR-018, FR-019):
  **US4-AS1** phone change → record updated, `version + 1`, history `member_updated` with EC member, Halifax-offset
  timestamp, old and new phone; **US4-AS2** individual → family recorded; **US4-AS3** Note text saved and in history,
  Note "text ≤ 2,000"; **US4-AS4** email or phone of another record → `DUPLICATE_EMAIL`/`DUPLICATE_PHONE`, nothing
  saved; **US4-AS6** treasurer → `FORBIDDEN`; stale `expectedVersion` → `VERSION_CONFLICT` with `current` (edge case
  "two users editing"); a retry with the same version after the first save landed → `VERSION_CONFLICT` (edge case
  "connection drops"); no changed field → current record, no history entry; unknown keys → `VALIDATION_FAILED`;
  history append failure → row restored, `SAVE_FAILED`
- [ ] T121 [P] [US4] Write failing tests in `tests/contract/no-history-edit.test.ts` (FR-001, FR-018; **US4-AS5**): no
  registered endpoint edits or removes change-history entries or changes a member number; `updateMember` refuses
  `memberNumber`, `registrationDate`, `privacyAckDate`; and add `updateMember` rows to
  `tests/contract/role-matrix.test.ts` (US4-AS6)
- [ ] T122 [P] [US4] Write failing Playwright tests in `tests/ui/edit.spec.ts` (desktop 1280 px plus a phone smoke
  test): **US4-AS1…AS3** editing phone, membership type and Note shows the new values and new history entries;
  **US4-AS4** duplicate email or phone shows the refusal and keeps the form values; **US4-AS5** no control edits history
  or the member number; **US4-AS6** treasurer sees no Edit; a `VERSION_CONFLICT` shows the current record for review
  before saving again (FR-019)

### Implementation for User Story 4

- [ ] T123 [US4] Implement `src/application/updateMember.ts` (processing steps 1–5 in `contracts/members.md`) to make
  T120 pass
- [ ] T124 [US4] Register `updateMember` (`member.edit`) in `src/server/endpoints.ts` and add it to
  `EXPECTED_ENDPOINTS` in `tests/contract/endpoint-registry.test.ts` (13, the full `ServerApi`), after adding its
  scenarios to `tests/contract/logging.test.ts`, to make T121 and T102 pass
- [ ] T125 [US4] Implement `src/ui/client/editMember.ts` (editable fields only, Note textarea, `expectedVersion`,
  conflict review) with `edit.*` keys, to make T122 pass; then add US4 to `AC_SCOPE` (T133) and keep it green

**Checkpoint**: all six stories work; the registry holds all 13 functions; `AC_SCOPE` includes all six stories (T125).

---

## Phase 12: Increment 2 release and polish

- [ ] T132 Finalize the increment-2 keys (`register.onBehalf.*`, `edit.*`) in `src/i18n/zh-Hans.json`
  with the confirmed glossary wording (T089), so `npm run check:i18n` and all `tests/ui` language tests pass (FR-020,
  FR-021, SC-004)
- [ ] T135 Update `specs/001-member-registry/quickstart.md` Part 2: remove the "coming in the next release" marks from
  T106 and check the register-on-behalf answers against the built screens
- [ ] T136 Deploy to dev (`npm run deploy:dev`), re-run `runAdapterChecks`, and run the full manual checklist
  (quickstart.md §5 checks 1–13, F1, F3) on a real phone and desktop; record results in
  `specs/001-member-registry/checklists/release.md`
- [ ] T137 Tag `v1.0.0` after CI is green, T136 passes and `AC_SCOPE` contains all six stories; deploy with `npm run deploy:prod` in a Club-account
  session following the T110 procedure; record it in `specs/001-member-registry/checklists/release.md`

---

## Dependencies & Execution Order

### Phase dependencies

| Phase | Depends on | Blocks |
|---|---|---|
| 1 Setup | — | everything |
| 2 Foundational | 1 | all story phases |
| 3 US1 | 2 | 10 (US3 extends `registerMember`) |
| 4 US2 | 2 | — |
| 5 US6 | 2 | 6 and every role-matrix row; 8 sign-in UI |
| 6 US5 (Club users + deletion) | 5 | 8 (T098, T128) |
| 7 Adapters | 2; doGet callback needs 5 | 8 harness-backed tests (T077), 9 |
| 8 MVP UI | 7 (T077), Phases 3–6 | 9 |
| 9 MVP release | 7, 8 | increment 2 releases |
| 10 US3, 11 US4 | MVP back end (3–7); UI needs T088 | 12 |
| 12 Increment 2 release | 10–11 | — |

### Key task dependencies

- T089 (glossary confirmation) → T100 (final MVP translations) → T113; T089 → T132.
- T109 (test 11) → T110 (release procedure final) → T111 (production setup) → T113 (first production deploy).
- T047 needs `stubNames()` from `scripts/build.mjs` (T007); T087 makes it green for the MVP endpoints; T127 introduces
  `EXPECTED_ENDPOINTS` (12 in the MVP) and T124 completes it at 13.
- `tests/contract/role-matrix.test.ts` grows with T065, T074, T127, T115, T121.
- `tests/contract/logging.test.ts` (T102) grows with T054, T060, T072, T076, T130, T118, T124.
- `AC_SCOPE` in `tests/contract/ac-coverage.test.ts` (T133) gains US1, US2, US5, US6 in T100, US3 in T119 and US4 in T125; T113 needs US1, US2,
  US5, US6; T137 needs all six.

### Within each story

- Test tasks (application, contract, Playwright) before implementation; see them fail first (Principle V).
- Use case → endpoint registration → screen.

## Parallel Opportunities

- Phase 1: T004, T005, T006 together; T008, T010, T011, T012, T015 together.
- Phase 2: all domain tests T017–T025 together; T102 and T133 together with T047; then T027, T028, T030–T033 together; T036 and T037 together; T040 and
  T041 together.
- Each story's test tasks marked [P] run together (e.g. US1: T048–T051).
- Phase 7: T080–T083 together.
- Phase 8: each screen's Playwright test can be written in parallel with another screen's implementation.
- Phase 9: T103 alongside T104.
- Increment 2: Phases 10 and 11 touch different use-case and screen files and can run in parallel; their edits to
  `src/server/endpoints.ts`, `tests/contract/role-matrix.test.ts` and `tests/contract/logging.test.ts` must be merged in turn.

### Parallel example: User Story 1

```text
Task: "T048 tests/application/registerMember.public.test.ts (US1-AS1…AS8)"
Task: "T049 tests/application/registerMember.numbers.test.ts (FR-001, R4)"
Task: "T050 tests/application/antiAbuse.test.ts (FR-010, R5)"
Task: "T051 tests/contract/public-endpoints.test.ts (FR-009, FR-023)"
```

### Parallel example: User Story 6

```text
Task: "T061 tests/application/signIn.test.ts"
Task: "T062 tests/application/signIn.followups.test.ts (F2, F3)"
Task: "T063 tests/application/session.test.ts (US6-AS2, AS4)"
Task: "T064 tests/unit/routes.test.ts (US6-AS3)"
Task: "T065 tests/contract/role-matrix.test.ts"
Task: "T066 tests/contract/no-password.test.ts"
Task: "T067 tests/unit/i18n-runtime.test.ts (US6-AS1)"
```

---

## Implementation Strategy

### MVP first (shortcut) 🎯

The plan's layer order (tooling → domain → ports and memory adapters → use cases → Apps Script adapters → UI →
deployment) is kept **within each increment**. Only US3 and US4 move after the MVP release:

1. Phases 1–2: tooling, domain, ports, memory adapters, API guard.
2. Phases 3–6: US1, US2, US6 use cases, plus US5 Club-user management (needed for roles in production) and deletion
   (needed to remove spam and test self-registrations, FR-008).
3. Phase 7: Apps Script adapters.
4. Phase 8: MVP screens (including Club users and Delete) and final MVP translations (after glossary confirmation, T089).
5. Phase 9: dev checks, Admin guide, test 11, production setup, `v0.1.0` in production (T113).

### Increment 2

1. US3 → US4 (Phases 10–11), each with use-case, contract and Playwright tests first.
2. Phase 12: translations, full checklist, `v1.0.0`.

## Notes

- [P] = different files, no dependency on an incomplete task. [USn] = story traceability.
- Use only synthetic data (`tests/fixtures/synthetic.ts`); never real member data, in code, tests, screenshots or AI tools.
- Commit after each task or a test/implementation pair; commit history should show tests landing first.
- Never log or display the OAuth `code` (F2); never create a new production deployment (R1-1).
