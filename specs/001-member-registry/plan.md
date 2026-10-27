# Implementation Plan: Member Registry

**Branch**: `001-member-registry` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-member-registry/spec.md`

## Summary

Build the Club's single member register: a public bilingual registration form, plus signed-in screens where Admins,
EC members and treasurers search, view, register on someone's behalf, edit, delete (Admin), and manage Club roles
(Admin), with an append-only change history.

As the first feature, this plan fixes the project stack (constitution, *Data & Security Constraints*): a
**Google Apps Script web app** (V8, TypeScript, esbuild + clasp) running as the Club's consumer Gmail account, with
**Google Sheets** as the data store behind a repository layer, an **HtmlService** mobile-first UI with
English/Simplified Chinese resources, pure-TypeScript domain logic tested with **Jest**, 360px layout tests with
**Playwright** against a local harness, and **GitHub Actions** CI. Cost: $0; no servers, no billing account.

Key design decisions (details in [research.md](research.md)):

- **Identity**: Club users (Admin, EC member, treasurer) MUST sign in with a **Google account** (any email address
  may be used to create one). Self-registrants need no account. The system **stores no passwords**. Sign-in uses
  OpenID Connect authorization codes with Google, with `doGet` as the redirect endpoint and server-side code exchange.
  The verified Google identity is matched against a private ClubUsers sheet, and the data spreadsheet is never shared
  (R1). Proven first by **SPIKE-001**.
- **One deployment** ("Anyone" access) serves both the public form and the signed-in app; every non-public function
  requires a session and a capability (R2).
- **History** is split into ChangeHistory (never modified) and ChangeValues (personal values, purged only by an
  audited deletion) (R3).
- **One script lock** for writes, per-row `version` for optimistic concurrency, member numbers from a monotonic counter
  starting at 1001 plus a Script Property high-water mark (R4).
- **Public form protection**: honeypot, signed form token with minimum fill time, global rate limit, and idempotent
  submission ids plus content hash (R5).

## Technical Context

**Language/Version**: TypeScript 5.x compiled for the Apps Script V8 runtime (ES2020 target); Node.js 22 LTS for tooling.

**Primary Dependencies**: Runtime: none (Apps Script built-ins: SpreadsheetApp, LockService, CacheService,
PropertiesService, UrlFetchApp, HtmlService, Utilities, MailApp). Dev-only: typescript, esbuild, @google/clasp,
jest + ts-jest, @types/google-apps-script, eslint + typescript-eslint, @playwright/test.

**Storage**: One Google Spreadsheet owned by the Club account (sheets: README, Members, ClubUsers, ChangeHistory,
ChangeValues, Counters), accessed only through repository ports. Script Properties for configuration and secrets;
CacheService for sessions and short-lived anti-abuse keys.

**Testing**: Jest for domain, application (use cases with in-memory adapters), and contract tests (endpoint registry,
role matrix); Playwright for 360px layout and language-switch tests against a local harness; scripts for translation
completeness, glossary consistency, and synthetic-fixture scanning; an owner-only adapter self-test in the dev Apps
Script project; manual release checklist on a real phone.

**Target Platform**: Google Apps Script web app (consumer Gmail account), modern mobile and desktop browsers (Chrome,
Safari iOS, Chrome Android, Firefox, Edge).

**Project Type**: Web application (single Apps Script project: server + HtmlService client).

**Performance Goals**: Search ≤ 4 s warm round trip at 3,000 records (SC-001 requires < 10 s); registration
≤ 5 s; self-registration completed in < 3 min (SC-002).

**Constraints**: $0, no billing account, no servers; consumer Apps Script quotas (6 min/execution, 30 concurrent
executions, 20k UrlFetch/day, 100 email recipients/day); data spreadsheet shared with nobody; phone layout at 360 CSS px;
all UI text in English and Simplified Chinese; no member personal data in logs. **Authentication**: Club users sign in
only with a Google account (any email may be used to create one); self-registrants need no account; no passwords
(or PINs or emailed codes) are stored or issued by the system.

**Scale/Scope**: A few thousand members (target 3,000 for tests); fewer than 20 Club users; small concurrent load with
bursts at events; about 6 screens; 13 server functions.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-research check (2026-10-23)

| Principle / constraint | Assessment | Result |
|---|---|---|
| I. Privacy First | Data stays in the Club account; spreadsheet not shared; dev uses a separate project and synthetic data; logs carry ids only (FR-027). Open question: how to identify users without sharing the sheet → R1. Drive version history retains deleted data → tension, see Complexity Tracking. | PASS (research needed: R1, R3, R7) |
| II. Record, Don't Process, Payments | No payment fields or processors in this feature; no card/bank fields in the data model. | PASS |
| III. Bilingual by Default | Translation resources by key; CI completeness check; glossary terms keyed; `Intl` date formatting; server returns codes, not text, except the Club-account rate-limit alert email, which the server builds from `email.*` keys in both languages (R5). | PASS |
| IV. Auditable Money Trail | No money or status changes in this feature; FR-018 history follows the same rules. Deletion redaction must not rewrite history → R3. | PASS (research needed: R3) |
| V. Test-First | Jest for pure domain/application; Playwright for layout; AC-tagged tests. Apps Script adapters cannot run in CI → see Complexity Tracking. | PASS with justified gap |
| VI. Simplicity | One Apps Script project, one deployment, zero runtime dependencies, $0. Extra component: Google Cloud OAuth client → see Complexity Tracking. | PASS with justification |
| VII. Mobile-Friendly | Registration and search at 360 px are required (FR-028); automated checks → R8. | PASS (research needed: R8) |
| Data & Security: stack decided once | This plan fixes it (research R0). | PASS |
| Data & Security: TLS, access control, backups | Apps Script serves HTTPS only; sheet is private to the Club account; backups = Drive version history in the same account, never in the repo. | PASS |
| Data & Security: secrets | OAuth client secret and form-token secret only in Script Properties; `config/script-properties.example.json` committed with placeholders. | PASS |
| Data & Security: business rules in specs | No fees or active-status rules in this feature. | PASS |
| Owner constraint: Google-account sign-in, no stored passwords | Must choose a sign-in pattern where Google authenticates Club users and the registry keeps no person credentials → R1. Self-registration stays account-free (FR-007). | PASS (research needed: R1) |

Gate: **passed**; research R1–R8 required before design.

### Post-design check (2026-10-23)

| Principle | Evidence in design | Result |
|---|---|---|
| I. Privacy First | Spreadsheet private (R1, R7); public endpoints return only the registrant's own new member number on success and no member data otherwise (contracts/public.md; FR-009 as amended 2026-10-23); FR-027 logger port and ESLint rule; synthetic-fixture check in CI; deletion purges ChangeValues (R3); dev and prod separated (R7); cache entries hold no personal fields (data-model, non-sheet state). Residual: Drive version history (Complexity Tracking #1). | PASS |
| II. Payments | Data model has no card, bank, or payment fields; no processor dependencies. | PASS |
| III. Bilingual | `src/i18n/en.json`, `zh-Hans.json`; `check:i18n` (key parity, placeholders, glossary terms); error codes → `error.*` keys; `Intl` formatting with `en-CA` / `zh-CN`; language persisted in ClubUsers. FR-021 glossary terms already added (2026-10-23); Chinese wording to be confirmed by the Club. | PASS |
| IV. Auditable trail | ChangeHistory repository port has no update/delete; test asserts this; every write use case appends history atomically with rollback (R4); deletion recorded with who/when/reason (R3). Redaction tension in Complexity Tracking #2. | PASS |
| V. Test-First | Each acceptance scenario maps to contract and application tests named by AC id (contracts list AC coverage); role matrix and endpoint-registry tests (SC-007); 360px Playwright tests; tasks will place tests first. Adapter gap in Complexity Tracking #4. | PASS |
| VI. Simplicity | One deployable, zero runtime deps, dev-only tooling listed; quickstart Part 1 lets a volunteer set up and deploy; YAGNI: no UI framework, no client-side index, no CAPTCHA, no search cache unless the spike requires it. | PASS |
| VII. Mobile | 360 px Playwright assertions (scroll width, 44 px targets, font sizes) for registration and search/member view in both languages; manual phone checklist. | PASS |
| Data & Security | HTTPS; access control; secrets in Script Properties; CI holds no credentials; production deploys under the Club account only. | PASS |
| Owner constraint: Google-account sign-in, no stored passwords | Sign-in is Google OpenID Connect only (R1). ClubUsers has no credential column; only the email and Google `sub` (data-model). Session tokens are stored as hashes. OAuth codes and tokens are never stored or logged. The email-code option (c1) was rejected, and the only fallback (a1) is also Google sign-in. A no-password schema test and sign-in tests run in CI (R8). `submitRegistration` needs no account (contracts/public.md). | PASS |

Gate: **passed**. No unjustified violations.

**Principle I re-check (2026-10-23, after the FR-009 amendment)**: the public success response now returns the new
member number. **PASS**: the number is the registrant's own identifier, newly assigned from a sequential counter; it
carries no personal details, gives no access to any record (self-registrants have no account, FR-029), and is never
returned for an existing record: `ALREADY_REGISTERED` still carries no number or record data. The only repeat path is
the 10-minute identical-resubmission collapse (FR-010), which requires the exact same form content (including email
and phone), so it returns the number only to someone who already holds all of those details. Sequential numbers
reveal roughly how many members have registered; that is not personal data. No new Complexity Tracking entry.

## Project Structure

### Documentation (this feature)

```text
specs/001-member-registry/
├── plan.md              # This file
├── research.md          # Phase 0: R0–R9 decisions, SPIKE-001
├── data-model.md        # Phase 1: sheets, columns, validation, protection
├── quickstart.md        # Phase 1: Part 1 developers, Part 2 Club Admin
├── contracts/           # Phase 1: server functions and doGet routes
│   ├── README.md        #   conventions, error codes, access summary
│   ├── api-types.ts     #   request/response types
│   ├── routes.md
│   ├── public.md
│   ├── session.md
│   ├── members.md
│   └── club-users.md
├── checklists/
└── tasks.md             # Phase 2 (/speckit-tasks; not created here)
```

### Source Code (repository root)

```text
src/
├── appsscript.json          # V8, time zone, scopes (spreadsheets, script.external_request, script.send_mail, userinfo.email)
├── domain/                  # PURE TypeScript, no Apps Script globals (lint-enforced)
│   ├── member.ts            #   types, editable fields, diff
│   ├── validation.ts        #   FR-004…FR-006, field error codes
│   ├── normalize.ts         #   email/phone/text keys (FR-012, FR-013)
│   ├── birthday.ts          #   FR-005
│   ├── duplicates.ts        #   FR-012 rule
│   ├── search.ts            #   FR-013 matching and ranking
│   ├── permissions.ts       #   FR-024/FR-025 matrix
│   ├── history.ts           #   history entries and redaction plan (FR-018)
│   └── errors.ts
├── application/             # use cases; depend on ports only
│   ├── registerMember.ts  searchMembers.ts  getMember.ts  updateMember.ts  deleteMember.ts
│   ├── clubUsers.ts  session.ts  signIn.ts  antiAbuse.ts
├── ports/                   # MemberRepository, HistoryRepository, ClubUserRepository, CounterStore,
│                            # Lock, Cache, Clock, Config, IdentityProvider, MemberReferences, Logger
├── adapters/
│   ├── gas/                 # Sheets repositories, LockService, CacheService, UrlFetch OIDC, Properties, logger
│   └── memory/              # in-memory implementations (tests and UI harness)
├── server/
│   ├── endpoints.ts         # registry: name → access rule → handler
│   ├── api.ts               # guard + envelope + error mapping
│   ├── doGet.ts             # routes (contracts/routes.md)
│   └── setup.ts             # owner-only setup, dev-only seed and adapter checks
├── ui/
│   ├── pages/               # register.html, signin.html, app.html (templates)
│   ├── client/              # vanilla TS: router, form, search, member, edit, users, i18n runtime, api client
│   └── styles/              # mobile-first CSS
└── i18n/
    ├── en.json
    └── zh-Hans.json

tests/
├── unit/                    # domain (incl. permission matrix)
├── application/             # use cases with memory adapters; AC-tagged (e.g., "US1-AS6")
├── contract/                # every endpoint × every role; endpoint registry; public endpoints leak nothing
├── ui/                      # Playwright: 360px layout, language switch, keep values on switch
└── fixtures/                # synthetic data generator (example.org, 555-01xx)

scripts/
├── build.mjs                # esbuild bundle + generate Apps Script global stubs from endpoints.ts
├── check-i18n.mjs           # key parity, placeholders, glossary terms vs docs/brief/glossary.md
├── check-fixtures.mjs       # synthetic-only scan
└── harness.mjs              # local server for UI with stub google.script.run

config/script-properties.example.json
.clasp.example.json          # .clasp.dev.json / .clasp.prod.json are git-ignored
.github/workflows/ci.yml     # lint, typecheck, test, check:i18n, check:fixtures, build, test:ui
```

**Structure Decision**: Single project (one Apps Script deployable). Layers: `domain` (pure) ← `application`
(use cases over `ports`) ← `adapters` (gas / memory) ← `server` (entry points). The UI is part of the same project and
is bundled into HtmlService templates. Only `adapters/gas` and `server` may reference Apps Script globals (ESLint
`no-restricted-globals` per directory), so later features can replace storage by writing new adapters.

## Delivery order (input for /speckit-tasks)

1. **SPIKE-001** (research R1): sign-in, parameters, latency at 3,000 rows. Gate for everything else. The spike
   tests Google sign-in only. If it fails in every browser with both Google methods, work stops and the owner decides
   whether to add an emailed one-time code as a sign-in method (then a short SPIKE-002 checks email delivery).
2. Tooling skeleton: build, lint, Jest, i18n check, fixture check, CI, harness.
3. Domain modules with tests first (validation, normalization, birthday, duplicates, permissions, search, history).
4. Ports + memory adapters; use cases with AC-tagged tests (US1 → US2 → US6 → US3 → US4 → US5).

> **Increments (owner decision 2026-10-27)**: tasks.md runs steps 2–7 twice. Increment 1 (MVP) covers US1, US2,
> US6 and all of US5 (Club-user management and deletion) and is released to production; increment 2 adds US3 and US4.
> See tasks.md "Organization" and "Implementation Strategy".
5. Sheets/Lock/Cache/OIDC adapters + `setup` + `runAdapterChecks`.
6. UI screens with Playwright 360px tests; translations.
7. Dev deployment, manual checklist, production first-time setup with the Admin.

## Open items carried forward

- ~~**Spec inconsistency**: US1 vs FR-009 on showing the member number.~~ **Resolved 2026-10-23**: the confirmation
  shows the new member number (FR-009 amended, US1 AS1); contracts updated.
- ~~**Spec wording**: sign-in "approach chosen in planning".~~ **Resolved 2026-10-23**: FR-029 (Google account only,
  no stored passwords or own credentials); the Assumption now points to it.
- ~~**Club time zone**.~~ **Resolved 2026-10-23**: `America/Halifax`.
- **Chinese glossary wording** for new terms is draft; confirm before UI translation is final (FR-021).
- **SPIKE-001 completed 2026-10-26: (a2) confirmed** (see research.md, "Spike result"). Carry into tasks:
  - F1 operating rule: bilingual hint on the sign-in page and a section in the Admin guide (one Google account per
    browser or profile, or a private window; Club Gmail account in its own Chrome profile).
  - F3: refreshing right after sign-in must not show an error; the session is kept.
  - F2: never log or display the OAuth `code`.
  - Test 11 (another editor updates the deployment) must be run before the production release procedure (R7) is final.

## Complexity Tracking

| # | Tension / addition | Why needed | Simpler alternative rejected because |
|---|---|---|---|
| 1 | **Drive version history keeps deleted members' personal data** (Principle I; FR-016 "removed from the register") | The owner chose version history as the backup; Google cannot purge selected values from it. | Turning version history off is not possible for Sheets; a separate backup system costs effort/money and has the same problem. Mitigation: history visible only to the Club account (access-controlled backup, allowed by Data & Security Constraints); Admin guide explains it and the restore caveat. |
| 2 | **Personal values removed from change history on deletion** (Principle IV "append-only", FR-018) | FR-016/FR-018 and Principle I require that deleted records leave no personal details. | Keeping values forever violates FR-016/SC-006. Blanking cells in the audit rows modifies them. Chosen split: ChangeHistory rows are never modified; only ChangeValues rows for that member are purged, and only by the audited deletion, which records who, when, and why (R3). Principle IV's money/status scope is untouched (FR-017 blocks deleting members with payments). |
| 3 | **Extra component: a Google Cloud project with an OAuth client** (Principle VI) | Consumer Gmail web apps cannot identify callers when executing as the owner (R1); the alternative that does identify them requires sharing the data or two deployments. | Option (b) needs two deployments and consent screens. Email codes are excluded by the Google-account-only, no-stored-credentials constraint. The Google Cloud project is free, needs no billing, and is configured once. |
| 4 | **Apps Script adapters are not covered by CI tests** (Principle V) | Sheets/Lock/Cache/UrlFetch exist only inside Apps Script; CI must not hold Club or developer Google credentials. | Storing credentials in CI is rejected (R7). Mitigation: adapters are kept thin; all rules live in tested pure code; `runAdapterChecks` self-test in the dev project plus the manual release checklist (quickstart §5). |
| 5 | **Write atomicity relies on compensation, not transactions** (FR-018 "history fails → change not saved") | Sheets has no transactions. | No transactional store is available at $0 inside the Club account. Mitigation: single lock, batched writes, history appended in the same locked section with rollback on failure (R4); residual risk is the platform killing an execution between two writes taking about 1 s. |
