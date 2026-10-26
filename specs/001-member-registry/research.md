# Phase 0 Research: Member Registry

**Feature**: `001-member-registry` | **Date**: 2026-10-23 | **Plan**: [plan.md](plan.md)

This document resolves every open technical question before design. Each item uses the format
**Decision / Rationale / Alternatives considered**, followed by risks where relevant.

Operating constraints that frame every decision (from the project owner):

- Everything lives in the Club's **single consumer Gmail account** (not Google Workspace).
- **$0**: no billing account, no credit card, no paid service, no server to operate.
- The data is visible to the Admin as a **Google Sheet**, and **Drive version history** is the backup.
- The system is handed over to a **non-technical Club Admin**.
- **Authentication (added 2026-10-23)**: Club users (Admin, EC member, treasurer) MUST sign in with a
  **Google account** (any email address may be used to create one); self-registrants need no account. The
  system MUST NOT store passwords.

---

## R0. Stack choice (recorded once, per constitution "Data & Security Constraints")

**Decision**: Google Apps Script web app (V8 runtime) written in TypeScript, bundled with esbuild and
deployed with clasp; Google Sheets as the data store behind a repository layer; UI served by
HtmlService (vanilla TypeScript, no UI framework); Jest for unit/application tests; Playwright for
360px layout tests against a local UI harness; GitHub Actions for CI.

**Rationale**:

- The only hosting that meets "$0, no billing, no server, inside one Gmail account" *and* keeps the data
  in a Sheet the Admin can open is Apps Script running as that account. Encryption in transit (HTTPS)
  and access control on the data are provided by Google.
- A single Apps Script project with one web-app deployment is a single deployable application
  (Principle VI).
- No runtime npm dependencies are shipped: the Apps Script platform supplies storage (SpreadsheetApp),
  locking (LockService), caching (CacheService), configuration (PropertiesService), HTTP (UrlFetchApp)
  and `Intl` date formatting (V8). Build/test tools are dev-only.
- Pure-TypeScript domain and application layers (no `SpreadsheetApp`, `LockService`, etc.) keep the
  rules testable with Jest on any machine (Principle V) and keep the storage replaceable.

**Alternatives considered**:

| Alternative | Why rejected |
|---|---|
| Firebase Hosting + Firestore (Spark plan) | Free, but data is not in a Sheet; Cloud Functions need the Blaze (billing) plan; a second platform for a non-technical Admin. |
| Cloudflare Pages/Workers + D1, Vercel, Render, Fly.io free tiers | Separate accounts outside the Club Gmail account; some require a card; data not visible in a Sheet; free tiers change terms. |
| Self-hosted (Node/Postgres) on a VPS | Costs money and someone must operate a server. |
| Google Forms + Sheets only (no app) | Cannot enforce roles (FR-025), duplicate rule (FR-012), append-only history (FR-018), bilingual UI (FR-020) or search (FR-013) without sharing the Sheet. |
| AppSheet | Free tier limited to 10 users "prototype"; deploying for real users requires paid plans; logic not testable in CI. |
| clasp's built-in TypeScript transpilation | Removed in clasp 3; esbuild bundling is the supported path and lets us generate the global entry-point stubs Apps Script requires. |
| A UI framework (React/Vue/Svelte) | Adds bundle weight to every HtmlService page and a dependency to maintain; the feature has ~6 simple screens. Revisit only if later features need it (would require Complexity Tracking justification). |

---

## R1. Identifying signed-in Club users with consumer Gmail accounts

### Problem

For a web app deployed **"Execute as: Me (Club account)"**, `Session.getActiveUser().getEmail()` returns an
empty string for visitors outside the owner's Workspace domain. A consumer Gmail account has no domain,
so the server never learns who is calling. We need a reliable identity for Admins, EC members and
treasurers **without sharing the data spreadsheet with them**.

**Constraint (owner, 2026-10-23)**: Club users MUST sign in with a **Google account**. Any email address can be
used to create one, so a Gmail address is not required. Self-registrants need no account. The system MUST NOT
store passwords. So the only acceptable options are ones where Google authenticates the person and the
registry receives only a verified identity (`sub`, `email`). Any option where the registry issues or checks its
own secrets for people (passwords, PINs, emailed codes) is out.

### Options compared

| | (a1) GIS button in the HtmlService page + server-side ID-token check | (a2) OpenID Connect authorization-code flow, `doGet` as redirect endpoint (**recommended**) | (b) "Execute as user accessing" front deployment + owner-executed backend | (c1) Email one-time code (magic code) | (c2) Firebase Auth (Spark) |
|---|---|---|---|---|---|
| How it works | Load `accounts.google.com/gsi/client` in the page; Google returns an ID token (JWT) to JS; JS passes it to the server; server calls `oauth2.googleapis.com/tokeninfo` and checks `aud`, `iss`, `exp`, `email_verified`. | A top-level link (`target="_top"`) sends the user to Google's consent URL (`scope=openid email`, `state`). Google redirects to the web app's `/exec?code=…&state=…`. `doGet` exchanges the code over TLS at `oauth2.googleapis.com/token` with the client secret, reads the ID token claims, creates an app session. | Web app A runs as each user (so `getActiveUser()` works) and calls web app B (runs as Club account) with `ScriptApp.getIdentityToken()`; B verifies it. | User types their email; server (Club account) emails a 6-digit code via `MailApp`; user enters it; server creates a session. | Firebase JS SDK signs in; server verifies the Firebase ID token through Identity Toolkit REST. |
| Spreadsheet shared with users? | No | No | No (B holds the data) | No | No |
| Extra setup | Google Cloud project (free, no billing) + OAuth client ID; the HtmlService iframe origin (`https://n-<hash>-script.googleusercontent.com`) must be registered as an authorized JavaScript origin. | Google Cloud project (free, no billing) + OAuth client ID/secret; the `/exec` URL registered as an authorized redirect URI. | Two deployments; every Club user must grant OAuth consent to the script (unverified-app warning for non-owner users). | None beyond `MailApp` scope. | Firebase project, second SDK, second console. |
| Main technical risk | The page runs in a sandboxed cross-origin iframe: GIS popups/FedCM and third-party-cookie restrictions inside that iframe are not documented for Apps Script; the iframe hostname is not a documented stable contract. | Redirect URI must equal the deployment URL exactly (we must keep **one** deployment and update it in place). Embedded browsers (e.g., the WeChat in-app browser) are blocked by Google sign-in (`disallowed_useragent`). | Two deployments violate "single deployable" (Principle VI); unverified-app consent screen alarms users; each call pays an extra HTTP hop. | `MailApp` consumer quota 100 recipients/day; email deliverability; we would be building and securing our own authentication. | A second platform and SDK for a volunteer to maintain; same iframe concerns as (a1). |
| UX for Club users | One tap if it works. | "Sign in with Google" → choose account → back in the app (2–3 taps). | Consent screen on first use, then transparent. | Leave app, open email, copy code (slow at events). | Similar to (a1). |
| Google-account sign-in, no stored passwords? | Yes | Yes | Yes | **No**: not a Google-account sign-in (we would issue our own codes) | Only if restricted to the Google provider; the email/password provider must stay off |
| Verdict | **Fallback** | **Chosen** | Rejected | Rejected under the current constraint; the owner may reconsider it only if SPIKE-001 fails in every browser | Rejected |

### Decision

**(a2) OpenID Connect authorization-code flow with `doGet` as the redirect endpoint**, in a single web
app deployed *Execute as: Club account*, *Who has access: Anyone*.

Flow:

1. Signed-out page shows "Sign in" (Club users only). The client creates a random `clientNonce`, stores it
   in `sessionStorage`, and calls `beginSignIn(clientNonce)`; the server stores a `state` → `{clientNonce}`
   entry in CacheService (10-minute TTL) and returns Google's authorization URL
   (`response_type=code`, `scope=openid email`, `prompt=select_account`, `state`).
2. The link opens at top level. After the user picks their Google account, Google redirects to
   `<exec URL>?code=…&state=…`.
3. `doGet` (running as the Club account) consumes the single-use `state`, exchanges `code` at
   `https://oauth2.googleapis.com/token` (client secret from Script Properties), and checks the ID token
   claims: `iss ∈ {accounts.google.com, https://accounts.google.com}`, `aud = CLIENT_ID`, `exp` in the
   future, `email_verified = true`. Because the token is received directly from Google's token endpoint
   over TLS, signature verification is not required (OpenID Connect Core §3.1.3.7). Apps Script has no
   RSA verification primitive, so this matters.
4. The server matches the Google `sub` (or, on the first sign-in, the lowercased verified `email`) to an
   active row in the **ClubUsers** sheet. On a match it binds `sub`, creates a 256-bit random session
   token, stores `session:<SHA-256(token)>` → `{userId, createdAt}` in CacheService (sliding 6-hour TTL,
   absolute limit 12 hours), and renders the app shell with the token and the `clientNonce` from step 1.
   The client accepts the token only if the nonce equals the one in its `sessionStorage` (protects
   against login CSRF), then keeps the token in `sessionStorage`.
5. Every non-public server function takes the session token as its first argument. The API guard resolves
   the session, **re-reads the user's roles from the ClubUsers sheet on every call** (so role changes take
   effect on the next use, US5 AS3) and checks the FR-025 permission matrix.
6. Unknown Google accounts get `NOT_A_CLUB_USER` and see only self-registration and sign-in (FR-023).

### Rationale

- Meets the authentication constraint: Google authenticates the person (password, 2-step verification and
  account recovery are Google's), and the registry receives only the verified `sub` and `email`. It works for any
  Google account, including one created for a non-Gmail address.
- **No passwords are stored**: the registry has no password, PIN or code column, and does not issue its own
  credentials to people. The only secrets it holds are *application* credentials (OAuth client secret and form-token
  HMAC key in Script Properties) and session tokens, which are stored only as SHA-256 hashes with a 12-hour maximum
  life. Google's OAuth `code`, access token and ID token are used once during sign-in and are never stored or logged.
- Avoids the main unknown of (a1): it does not depend on GIS JavaScript working inside the sandboxed
  googleusercontent iframe. The only browser requirement is top-level navigation on a user click, which
  HtmlService permits (`allow-top-navigation-by-user-activation`).
- Keeps a single deployment (Principle VI) and keeps the spreadsheet private to the Club account
  (Principle I).
- The Google Cloud project and OAuth client cost $0 and need no billing account. With only `openid email`
  (non-sensitive scopes) the consent screen can be published "In production" without Google verification,
  which avoids the 100-test-user cap and the "unverified app" interstitial.

### Risks (and mitigations)

| # | Risk | Mitigation |
|---|---|---|
| R1-1 | Redirect URI is tied to the deployment URL; a new deployment would break sign-in. | Release procedure always **updates the existing deployment** (`clasp deploy -i <deploymentId>`); the URL is recorded in Script Properties and quickstart. |
| R1-2 | Google blocks OAuth in embedded webviews (WeChat, some in-app browsers). | Sign-in page detects common in-app user agents and tells the user (bilingual) to open the link in Chrome/Safari. Self-registration does not need sign-in, so WeChat links still work for it. |
| R1-3 | CacheService is "best effort"; a session may be evicted before 6 hours. | User signs in again (2–3 taps). The spike measures this; if eviction is frequent, sessions move to Script Properties (refresh at most once per 10 minutes to stay within property-write quotas). |
| R1-4 | Client secret stored in Script Properties. Leaking it lets someone run a consent screen branded as our app but gives no access to data or sessions. | Stored only in Script Properties of the production project (Club account) and never in the repo/CI; rotation steps in quickstart. |
| R1-5 | Each Club user needs a Google account (this is now a requirement). A volunteer without one cannot sign in until they create it. | Admin guide explains how to create a Google account for any existing email at accounts.google.com/signup ("use my current email address instead"); the Add Club user screen shows the same hint. Self-registration needs no account. |
| R1-6 | Session token held in the page's `sessionStorage`; script injection would expose it. | No third-party scripts; all user values rendered with `textContent` (never `innerHTML`); HtmlService sandbox; short session lifetime; sign-out removes the server entry. |
| R1-7 | Google changes HtmlService sandbox or redirect behaviour. Fallback (a1) is pre-analysed and is also Google-account sign-in; identity is behind an `IdentityProvider` port, so the switch is local to one adapter and one screen. |
| R1-8 | Someone signs in as the wrong Google account (multi-account browsers). | `prompt=select_account`; app shell shows the signed-in email and a sign-out button. |

### Spike task (must complete before any other implementation): **SPIKE-001 — Prove sign-in and platform limits**

Owner: developer, in the **development** Apps Script project with a developer-owned Google account and
synthetic data only.

Steps:

1. Create a Google Cloud project (no billing) and an OAuth client (Web application). Configure the consent
   screen with `openid` and `email` only, and publish it to "In production".
2. Create a throw-away web app (Execute as: me, Access: Anyone) with: a sign-in link implementing the
   (a2) flow; `doGet` callback with code exchange via `UrlFetchApp`; session in CacheService;
   `whoAmI(token)` via `google.script.run` returning the email.
3. Test matrix: Chrome desktop; Safari iOS; Chrome Android; Firefox; a private window; a browser signed
   in to two Google accounts; a link opened inside WeChat (expect a block, confirm our message shows).
4. Verify that `/exec?code=…&state=…` reaches `doGet` with the parameters intact (including when the
   browser is redirected through `/macros/u/N/`).
5. Verify which account a web app executes as after a **different editor** updates the deployment (decides
   the R7 release procedure).
6. Load 3,000 synthetic member rows and measure: `searchMembers` round trip (cold and warm), a locked
   write (registration) round trip, and two concurrent writes.
7. Check `sessionStorage` survives within a tab on iOS Safari inside the HtmlService iframe.

Exit criteria (all must hold): sign-in works on the four main browsers; parameters arrive intact; search
round trip ≤ 4 s warm and ≤ 8 s cold at 3,000 rows; registration round trip ≤ 5 s.
If steps 2–4 fail, repeat with fallback (a1) GIS popup. Then:

- **Works in some browsers only** (with either method): record which browsers work. The project owner decides
  whether Club users can be asked to sign in with a supported browser. Self-registration needs no sign-in, so it is
  unaffected.
- **Fails in every browser with both methods**: **stop** and report to the project owner. The owner then decides
  whether to relax the Google-only rule and add an emailed one-time code as a sign-in method (owner decision,
  2026-10-23). That would change the spec and plan, not the constitution. The spike does **not** test the email
  code: it doesn't depend on the browser behaviour the spike checks, and its building blocks (`google.script.run`,
  CacheService sessions, `sessionStorage`) are already exercised by steps 2 and 7. If the owner adds it, a short
  follow-up spike (SPIKE-002) checks only email delivery (inbox vs spam at Gmail, Outlook, QQ Mail, 163 Mail) and
  the time to sign in at an event.
Record the outcome in this file (append "Spike result") before task work continues.

### Spike result (2026-10-26)

**Verdict: (a2) confirmed** for Club-user sign-in, with one operating limitation (F1). Owner decision 2026-10-26: accept.

Environment: development Apps Script project and Google Cloud project `club-registry-spike` (no billing) owned by a developer account; synthetic data only (3,000 rows, `example.org`, `902-555-01xx`); OAuth consent screen with `openid` and `email` scopes; throw-away code on branch `spike/001-signin` (never merged).

| # | Test | Result |
|---|---|---|
| 1 | Chrome desktop, several Google accounts signed in | Default (owner) account: pass. Non-default account (`authuser=2`): **fail**, see F1 |
| 2 | Safari iOS | Single account (Private tab), non-owner: pass. Second account in normal Safari (`authuser=1`): **fail** (F1) |
| 3 | Chrome Android | Not tested |
| 4 | Firefox | Not tested |
| 5 | Private / incognito window, single account | Pass (desktop Chrome and iOS Safari, non-owner account) |
| 6 | Two accounts in one browser | **Fail** in the cases described in F1 |
| 7 | `sessionStorage` survives a refresh inside the HtmlService frame | Pass (desktop Chrome and iOS Safari); refresh shows F3 |
| 7b | WeChat in-app browser (iOS, MicroMessenger 8.0.75) | Page loads signed out; in-app browser detected; bilingual "open in Chrome/Safari" warning shown before sign-in. Pass |
| 8 | `code` and `state` reach `doGet` intact | Pass (`authuser`, `code`, `iss`, `prompt`, `scope`, `state` received) |
| 9 | Search, 3,000 rows (one `getValues()` + in-memory filter) | Round trip 1,746 / 2,135 / 1,288 ms; server ~0.58 s, almost all Sheet read; filter ~5 ms. Pass (≤ 4 s warm, ≤ 8 s cold) |
| 10a | Registration (locked append) | Round trip 1,722 ms; server 575 ms; lock wait 123 ms; member number 3001 followed the seeded rows. Pass (≤ 5 s) |
| 10b | Two concurrent registrations | Both succeeded; member numbers 3002 / 3003 (sequential, no gap); lock waits 147 / 563 ms (serialized); round trips 1,787 / 3,204 ms. Pass |
| 11 | A different editor updates the deployment | Not tested; **must be done before the production release procedure (R7) is final** |

Exit criteria: sign-in works on the main browsers **when one Google account is used per browser or profile**; parameters arrive intact; search and registration times are within targets.

**Findings**

- **F1 — Multiple Google accounts in one browser.** `script.google.com` account routing (`/macros/u/N/`, `/accounts?authuser=N`) intercepts requests before app code runs ("Sorry, unable to open the file at this time"; Executions show no `doGet`). Observed: (a) signing in with a non-default account fails on the return from Google (Google appends `authuser=N`); (b) when the script owner's account is signed in but is not the default, even the first page load fails. Single-account and signed-out browsers work. Not tested: two non-owner accounts in one browser. Fallback (a1) runs on the same routing and is not expected to help.
- **F2 — Used `code` and `state` stay in the address bar** after sign-in. Low risk (single use, short-lived, exchange needs the client secret). The app must never log or display the code; support guidance must say to redact `code=` values.
- **F3 — Refresh right after sign-in** re-sends the used `state`; the single-use check correctly rejects it, but the user sees "Unknown or expired state" while the session itself is kept. The real build must not show an error in this case (for example, a "Continue" button that navigates to the clean `/exec` URL, or `doGet` ignoring a reused `state` when the browser already holds a valid session).
- **F4 — WeChat.** The public page works inside WeChat, so self-registration links can be shared in Club WeChat groups; sign-in must happen in Chrome or Safari.

**Decisions (owner, 2026-10-26)**

1. Adopt (a2) as the sign-in design.
2. Operating rule, in the Admin guide and as a bilingual hint on the sign-in page: use a browser or browser profile with only one Google account signed in, or a private window; keep the Club Gmail account in its own Chrome profile.
3. Fix F3 in the real build.
4. No switch to (a1). A static "bounce" redirect page that removes `authuser` is recorded as a possible future SPIKE-002 for F1(a), not planned.
5. Android Chrome, Firefox and test 11 are recorded as not tested; test 11 is required before the production release procedure is final.

---

## R2. Public self-registration and signed-in screens: one deployment or two

**Decision**: **One deployment** (Execute as: Club account; Who has access: **Anyone**, which allows
visitors who are not signed in to Google). `doGet` routes:

| Request | Response |
|---|---|
| `/exec` (no params), `/exec?page=register` | Registration form (public). |
| `/exec?page=signin` | Sign-in screen. |
| `/exec?code=…&state=…` | Sign-in callback → app shell or sign-in error. |
| `/exec?page=app` | App shell; without a valid session token in the tab it shows only "Register" and "Sign in" (FR-023). |
| anything else | Registration form. |

Screens are rendered client-side inside the app shell only after `whoAmI(token)` succeeds; the HTML served
to an anonymous visitor contains **no member data**, and every member-data function requires a valid
session (see contracts). Because all top-level, non-underscore functions are callable through
`google.script.run` by anyone who loads the page, the build generates the global stubs from a single
endpoint registry, and a contract test fails if any exposed function lacks a declared access rule.

**Rationale**: Principle VI (single deployable); one URL for the Admin and the QR code; one OAuth redirect
URI; shared code and translations.

**Alternatives considered**: Two deployments of the same project (public "Anyone" + signed-in "Anyone with
Google account"): access setting is per deployment, but "Anyone with Google account" still does not give us
the identity for consumer accounts (R1), so the second deployment adds nothing but a second URL to manage.
Two projects: rejected (two deployables, duplicated code).

---

## R3. Append-only change history with deletion redaction

**Decision**: Split the change history into two sheets.

- **ChangeHistory** (the audit fact): `entry_id`, `recorded_at`, `actor_kind`, `actor_user_id`,
  `change_kind`, `subject_kind`, `subject_id`, `fields_changed` (field *names* only), `request_id`.
  Holds no personal values of members. Rows are only ever **appended**; the repository port for this
  sheet exposes `append()` and read methods and **no update or delete method**.
- **ChangeValues** (the personal values): `entry_id`, `member_number`, `field`, `old_value`, `new_value`.
  One row per changed field per entry. The repository port exposes `append()`, reads, and exactly one
  removal method, `purgeMemberValues(memberNumber)`, which is callable only from the `deleteMember` use case.

Deleting member *N* (FR-016/FR-018), inside one script lock:

1. Check permission (Admin), confirmation, non-empty reason, version, and that no dependent records exist
   (FR-017; the check returns "none" in this feature and is implemented by later features).
2. Remove member row *N* from **Members**.
3. `purgeMemberValues(N)`: delete every **ChangeValues** row with `member_number = N`.
4. Append the deletion entry to **ChangeHistory** (`change_kind = member_deleted`) and its values to
   **ChangeValues**: `name_en`, `name_zh` (old value = name, new value empty) and `reason`. These are
   written *after* the purge, so they survive.

Every earlier **ChangeHistory** row for *N* stays unchanged: who, when, kind of change, and *which fields*
changed remain; only the values are gone (exactly what FR-018 requires). Role-change entries keep their
values (roles are not member personal data).

**How this satisfies Principle IV and Principle I together**

- *Principle IV* (append-only audit, no edit/delete path, audit write must succeed): **ChangeHistory** is
  never modified or deleted by the application; there is no code path that can do so (enforced by the port's
  shape and a test that the repository has no such method). Every creation, edit, deletion and role change
  appends an entry, and the change is rolled back if the append fails (R4). The purge is not a silent
  rewrite: it is itself caused by, and recorded as, an audited deletion entry stating who, when, and why.
  Principle IV's strict scope (payments, membership status) is not touched: a member with payments cannot be
  deleted (FR-017), and membership status does not exist yet.
- *Principle I* (personal data only where needed): after deletion the register holds no personal details of
  the person except the member number and name in the deletion entry (FR-016, SC-006).
- The residual tension (personal values are removed from an "append-only" store) is recorded in the plan's
  Complexity Tracking table.

**Known limitation (also in Complexity Tracking)**: Google Sheets **version history** keeps earlier
versions of the spreadsheet, including deleted members' rows and values, and cannot be purged selectively.
Version history is visible only to the Club account (access-controlled backup, allowed by "Data & Security
Constraints"). The Admin guide explains this and warns that restoring an old version brings deleted records
back (then the Admin deletes them again through the app).

**Alternatives considered**:

| Alternative | Why rejected |
|---|---|
| One history sheet with values; blank the value cells on deletion | Modifies audit rows in place; impossible to prove "rows are never modified" mechanically. |
| Encrypt values per member and destroy the key on deletion (crypto-shredding) | Apps Script has no built-in symmetric encryption; would need a bundled crypto library; the Admin could no longer read history in the Sheet. Overkill for this scale. |
| Keep values forever | Violates FR-016/FR-018 and Principle I. |

---

## R4. Concurrency, atomicity and member numbers

**Decision**:

- **One script lock for all writes**: every write use case runs inside `LockService.getScriptLock()`
  (`tryLock(15 s)`; on timeout the call returns `BUSY` and the UI asks to retry). Reads do not take the lock.
  At the expected load (a few Club users, bursts at events) contention is negligible.
- **Per-row optimistic version (FR-019)**: **Members** and **ClubUsers** rows carry an integer `version`.
  `getMember` returns it; `updateMember`/`deleteMember`/`setClubUserRoles` must send `expectedVersion`.
  Inside the lock the server re-reads the row; if the version differs it returns `VERSION_CONFLICT` with the
  current record (the user reviews and re-applies). On success, `version` increments.
- **Atomic change + history (FR-018 "if the history cannot be saved, the change is not saved")**: inside the
  lock, the use case (1) snapshots the affected Members row, (2) writes the member change, (3) appends the
  ChangeHistory and ChangeValues rows, (4) `SpreadsheetApp.flush()`. If step 3 or 4 throws, it restores the
  snapshot (or removes the new row) before releasing the lock, and returns `SAVE_FAILED`. Each write is one
  batched `setValues` call to keep the failure window small. Residual risk: the execution is killed by the
  platform between steps 2 and 3 (6-minute limit; our writes take about 1 s). Accepted and noted.
- **Member numbers (FR-001)**: positive integers assigned in sequence, starting at **1001** (configurable
  before first use via the `MEMBER_NUMBER_START` Script Property), displayed without padding (e.g., `1024`).
  Inside the lock: `next = max(Counters.next_member_number, ScriptProperty MEMBER_NUMBER_HIGH_WATER + 1,
  max(Members.member_number) + 1)`. The number is committed (Counters cell and the Script Property) only after
  the member row and history rows are written; a failed registration therefore does not consume a number, so
  numbers are assigned without gaps. Deleted numbers are never reused because the counter only increases,
  and the Script Property high-water mark survives a restore of an older spreadsheet version (which could
  otherwise roll the counter back).

**Rationale**: LockService is the platform's only cross-execution mutual exclusion and is free. A single
lock is the simplest correct choice at this scale.

**Alternatives considered**: per-row document locks (not available); Sheets formulas such as `ROW()` for
numbering (reuses numbers after deletion); UUIDs (not human-friendly at events; spec wants a member number).

---

## R5. Anti-abuse for the public form and identical-resubmission collapse (FR-010)

Apps Script cannot see the visitor's IP address, so per-IP rate limiting is impossible. Free measures:

**Decision**:

1. **Honeypot**: a visually hidden text field (off-screen, `tabindex=-1`, `autocomplete="off"`,
   `aria-hidden`). If it is filled, the server returns a confirmation without a member number and stores nothing.
2. **Signed form token with minimum fill time**: `doGet` embeds `formToken = issuedAt + HMAC-SHA256(issuedAt,
   FORM_TOKEN_SECRET)` (`Utilities.computeHmacSha256Signature`; secret in Script Properties). The server rejects
   tokens that are forged, younger than 3 seconds, or older than 24 hours (`FORM_EXPIRED`, the form offers to
   reload while keeping values).
3. **Global rate limit** (circuit breaker): a CacheService counter of public submissions per 10-minute window;
   above 30 (configurable), the form returns `RATE_LIMITED` ("Please try again in a few minutes or ask an EC
   member") and the Club account gets at most one alert email per hour (`MailApp`, well within quota).
   Registration by a signed-in EC member/Admin is not rate limited.
4. **Identical-resubmission collapse**: the client generates a `submissionId` (UUID) when the form is
   rendered and reuses it on retries. Inside the lock, the server keeps `submission:<id>` → result in
   CacheService for 10 minutes and returns the stored result for a repeated id. In addition, a
   `content:<SHA-256(normalized fields)>` key (also 10 minutes) collapses an identical form submitted again
   with a new id (e.g., page reloaded and re-sent): the visitor sees the normal confirmation with the same member number, not the
   already-registered message. Any later or different submission with the same email or phone follows FR-012.
5. Abusive registrations that get through are members until an Admin deletes them (FR-008, FR-016).

**Rationale**: zero cost, no third-party script (privacy), no visible challenge for real people.

**Alternatives considered**: reCAPTCHA / Turnstile (third-party script on the form and keys in another
console; reCAPTCHA keys now live in Google Cloud with quota/billing terms; kept as a future option if abuse is
observed). Email confirmation before creating a member (contradicts FR-008 "member immediately").

---

## R6. Quotas and limits versus scale and SC-001

Consumer (gmail.com) Apps Script limits that apply (the web app runs as the Club account, so all usage
counts against that one account):

| Limit (consumer) | Value | Our expected use | Verdict |
|---|---|---|---|
| Script runtime per execution | 6 min | ≤ 3 s per call | OK |
| Simultaneous executions | 30 per user | a handful of Club users + occasional public bursts | OK; `BUSY` handled |
| UrlFetch calls/day | 20,000 | 1 per sign-in | OK |
| Email recipients/day (`MailApp`) | 100 | ≤ 24 rate-limit alerts | OK |
| Properties read/write per day | 50,000 | configuration + counter high-water mark | OK |
| CacheService | value ≤ 100 KB, TTL ≤ 6 h, best effort | sessions, form/submission keys | OK |
| Spreadsheet size | 10 million cells | Members 3,000 × 18 ≈ 54 k; history ≈ 10–20 k rows/year × 9 | Decades of headroom |
| Web app response | HtmlService page ≤ a few MB | page ≈ 150 KB with both translations | OK |

**SC-001 (search < 10 s from first character, ≥ 2,000 records)**:

**Decision**: server-side search. `searchMembers(token, query)` reads the Members range in one `getValues()`
call (3,000 × 18 cells), normalizes and matches in memory (member number exact; names/email partial,
case-insensitive, whitespace-collapsed, NFKC; phone digits-only substring with a leading `1` removed), and
returns at most 25 summary rows (number, names, membership type, email, phone — all roles may see these).
The client debounces typing (300 ms) and ignores stale responses. Expected round trip 1.5–3 s (google.script.run
overhead plus about 0.5–1 s read). SPIKE-001 step 6 measures it; if warm search exceeds 4 s, add a
CacheService-chunked normalized index invalidated by a `members_revision` counter.

**Alternatives considered**: sending the whole register to the phone for client-side search (instant, but
places every member's contact details on event devices; rejected under Principle I); a Sheets `QUERY`
formula (still a full read plus formula injection concerns).

---

## R7. Environments, release promotion, and credentials

**Decision**:

| | Development | Production |
|---|---|---|
| Google account | Developer's own Google account | The Club's Gmail account |
| Apps Script project | `Member Registry (DEV)` standalone project | `Member Registry` standalone project |
| Spreadsheet | `Member Registry DEV data`, **synthetic data only** (generated by `npm run fixtures`) | `Member Registry`, real data; **shared with nobody** |
| OAuth client | Dev Google Cloud project | Club Google Cloud project |
| Script Properties | `SPREADSHEET_ID`, `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, `FORM_TOKEN_SECRET`, `WEB_APP_URL`, `BOOTSTRAP_ADMIN_EMAIL`, `MEMBER_NUMBER_START`, `ENVIRONMENT` | same keys, Club values |

- The script is **standalone**, not bound to the spreadsheet; the spreadsheet ID comes from Script Properties,
  so the same code runs against either sheet. `config/script-properties.example.json` in the repo lists the keys
  with placeholder values (constitution: example configuration).
- `.clasp.json` is generated per environment from `.clasp.dev.json` / `.clasp.prod.json`, both git-ignored;
  `.clasp.example.json` is committed.
- **CI never deploys** and holds no Google credentials. CI runs lint, type-check, unit/application/contract
  tests, translation completeness, glossary consistency, synthetic-fixture scan, build, and 360px layout tests.
- **Release promotion**:
  1. Merge to `main` with CI green; tag `vX.Y.Z`.
  2. Developer deploys the tag to **dev** (`npm run deploy:dev`, developer's own clasp login) and runs the
     manual role/sign-in checklist in quickstart.md on the dev URL.
  3. Production deploy is done in a session **signed in as the Club account**: the Admin (credential holder)
     signs in to clasp on the maintainer's machine during a short supervised session, or on their own machine
     following the quickstart (`npm run deploy:prod` = build + `clasp push` + `clasp deploy -i <PROD_DEPLOYMENT_ID>`),
     then runs `clasp logout`. Updating the existing deployment keeps the URL and the OAuth redirect URI.
  4. Rollback: `clasp deploy -i <PROD_DEPLOYMENT_ID> -V <previous version>` (or Apps Script editor → Manage
     deployments → choose earlier version).
- **Credentials**: the Club account password and 2-step verification stay with the Club Admin (and the Club's
  account-recovery contacts). They are never stored in the repository, CI secrets, or developer notes.
  Developers are **not** made editors of the production spreadsheet. SPIKE-001 step 5 checks whether sharing the
  production *script* (not the spreadsheet) with a maintainer could let them push code while the Admin only
  re-deploys; until proven, production pushes happen under the Club account.

**Rationale**: Principle I (no real data in development), constitution secrets rule, $0, and the Admin keeps
control of the Club account.

**Alternatives considered**: deploying from GitHub Actions with a stored clasp token for the Club account
(a long-lived credential for the account holding all member data, stored outside the Club's control: rejected);
container-bound script (ties code to the production sheet; dev would need a copy of real data: rejected).

---

## R8. Automating 360px layout checks (Principle VII) and role-based access tests (SC-007)

**Decision**:

1. **UI harness**: the build emits the same HTML pages that HtmlService serves. `npm run harness` serves them
   locally with a stub `google.script.run` that calls the real application layer wired to **in-memory
   adapters** and synthetic fixtures (`tests/fixtures`). No Google services are needed.
2. **Layout tests (Playwright, viewport 360×740, both languages)** for: registration form (all states:
   empty, validation errors, already-registered, confirmation), sign-in, search with results/no results, member
   view. Assertions: `document.documentElement.scrollWidth <= 360`; every interactive element's box is
   at least 44×44 CSS px; computed font size ≥ 16 px for inputs and ≥ 14 px for body text; no element overflows
   the viewport. Desktop (1280 px) smoke tests for the edit, delete and Club-user screens.
3. **Role-based access tests (Jest, no browser)**:
   - The FR-025 matrix is data (`domain/permissions.ts`); a table-driven test checks every capability × role,
     including combined roles (FR-024).
   - Contract tests call **every endpoint in the registry** as: no session, invalid session, unknown Google
     account, treasurer, EC member, Admin, and treasurer+EC. They assert the expected allow/refuse result and that
     refusals carry no member data (FR-026).
   - An endpoint-registry test fails if a global function exposed to `google.script.run` lacks an access rule,
     and if any public endpoint returns member fields.
   - **No-password test**: the sheet schema (`src/adapters/gas/schema.ts`) and the contract types are scanned.
     The test fails if any column or request field is named like `password`, `passcode`, `pin`, `otp`,
     `secret` or `credential`. A second test checks that session entries hold only the token hash, and that the
     OAuth `code` and tokens never reach the logger or a repository.
   - Sign-in tests (memory `IdentityProvider`): only Google-verified identities (`email_verified = true`, correct
     `aud`/`iss`) of active Club users get a session. No endpoint accepts an email-only or password-style sign-in.
4. **Translation completeness**: a script and test check that `en.json` and `zh-Hans.json` have identical key
   sets, no empty values, all placeholders match, every `t('…')` key used in source exists, and every
   `term.*` value equals the glossary's English/Chinese column (`docs/brief/glossary.md`).
5. **Real-platform checks** (sign-in against Google, Sheets adapter behaviour, locking) cannot run in CI without
   credentials. They run as (a) an adapter self-test function executed in the **dev** Apps Script project
   (`runAdapterChecks`, owner-only) and (b) the manual release checklist in quickstart.md, on a real phone.

**Rationale**: maximizes the share of Principle V/VII checks that run on every pull request for free (Playwright
browsers run on GitHub-hosted runners at no cost for public or within free minutes for private repos).

**Alternatives considered**: Playwright against the deployed dev web app (Google sign-in blocks automated
browsers; would need stored Google credentials in CI); visual screenshot diffing (flaky and adds baseline
maintenance; layout assertions are enough).

---

## R9. Smaller decisions

| Topic | Decision | Rationale |
|---|---|---|
| Phone normalization | Strip everything except digits and a leading `+`. North American: 10 digits (area code and exchange start with 2–9), optional leading `1`/`+1` removed → key is the 10 digits. Other countries: must start with `+` and have 8–15 digits → key is `+` + digits. Display the value as entered. | FR-012/FR-013; avoids bundling libphonenumber (~500 KB) for a rule this simple. |
| Email | Trim; validate with a pragmatic pattern (one `@`, non-empty local part, domain with a dot, no spaces, ≤ 254 chars); key = lowercase. | FR-006/FR-012. |
| Text matching | NFKC normalize, lowercase, collapse whitespace; Chinese matched by substring. | FR-013, US2 AS2–3. |
| Birthday | Month 1–12 and day 1–(29/30/31) using a fixed leap-year table (Feb = 29). | FR-005. |
| Spreadsheet injection | The Sheets adapter writes all user text as text: values beginning with `=`, `+`, `-`, `@` are prefixed with `'`; text columns use number format `@`. | Prevents formula injection and keeps leading zeros/`+`. |
| Time zone | Apps Script project time zone (`appsscript.json`), `America/Halifax` (confirmed by the owner 2026-10-23). Timestamps are stored as ISO 8601 with offset; registration and privacy acknowledgment dates as `YYYY-MM-DD` in Club time. | FR-018 "time zone"; FR-022. |
| Date display | `Intl.DateTimeFormat` with `en-CA` / `zh-CN`; birthday shown as "March 5" / "3月5日". | FR-022. |
| Language persistence | Signed-in: `language` column in ClubUsers (FR-020). Visitor: `sessionStorage` plus `?lang=`; default from `navigator.language`. | FR-020. |
| Logging | A `Logger` port that accepts only an event code, member number / user id, and error code; ESLint forbids `console.*` outside the adapter. No request bodies are logged. | FR-027, Principle I. |
| Server errors | The server returns error **codes** (never UI text); the client maps codes to translation keys. | Principle III. |
| Authentication | Club users: Google-account sign-in only (R1). Self-registrants: no account, no sign-in. No password, PIN or emailed-code mechanism exists anywhere in the system. | Owner constraint 2026-10-23. |
| First Admin | `setup()` (run once from the Apps Script editor by the Club account) creates sheets, headers, validation and protections, and the first Admin from `BOOTSTRAP_ADMIN_EMAIL`. It refuses to run when `Session.getActiveUser()` is not the owner (so it cannot be triggered from the web page). | Spec assumption "first Admin set up during deployment". |
| Dependent-records check for deletion (FR-017) | `MemberReferences` port with an implementation that returns "none"; later features (payments, attendance) implement it. | Keeps FR-017 enforceable without building later features. |
| Runtime dependencies | None. Dev dependencies: typescript, esbuild, @google/clasp, jest, ts-jest, @types/jest, @types/google-apps-script, eslint, typescript-eslint, @playwright/test. | Principle VI. |
