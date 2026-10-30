# Quickstart: Member Registry

**Feature**: `001-member-registry` | **Plan**: [plan.md](plan.md)

Two parts:

- **Part 1 — Developers**: set up, test, deploy (dev and production).
- **Part 2 — Club Admin (plain language)**: where the data lives, backups, adding EC members and treasurers.

> **Privacy rule (constitution Principle I)**: development and testing use **synthetic data only** (names like
> "Test Person 0001", emails `@example.org`, phones `604-555-01xx`). Never copy real member data into the dev
> spreadsheet, the repository, screenshots, issues, or AI tools.

---

# Part 1 — Developers

## 1. Prerequisites

- Node.js 22 LTS (or later LTS) and npm; Git.
- A **personal** Google account for development (never the Club account).
- Apps Script API enabled for that account: <https://script.google.com/home/usersettings> → *Google Apps Script API: On*.

## 2. Install and run checks locally (no Google account needed)

```bash
npm ci
npm run lint          # ESLint (incl. no console.* outside the logger adapter)
npm run typecheck     # tsc --noEmit
npm test              # Jest: domain, application, contract tests (in-memory adapters)
npm run check:i18n    # en / zh-Hans key parity, placeholders, glossary terms
npm run check:fixtures # fixtures are synthetic (example.org / 555-01xx only)
npm run build         # esbuild → dist/ (Code.js, *.html, appsscript.json)
npx playwright install --with-deps chromium   # first time only
npm run test:ui       # Playwright 360px layout + language tests against the local harness
npm run harness       # open http://localhost:5173 to click through the UI with fake data
```

Expected: all commands exit 0. CI (`.github/workflows/ci.yml`) runs the same steps on every pull request; CI holds
no Google credentials and never deploys.

## 3. Development environment (once per developer)

1. `npx clasp login` with your **personal** Google account.
2. `npm run dev:create` — creates a standalone Apps Script project `Member Registry (DEV)` and writes the git-ignored
   `.clasp.dev.json` (see `.clasp.example.json`).
3. Create a Google Sheet `Member Registry DEV data` in your Drive. Copy its ID.
4. Google Cloud console (same personal account) → new project `member-registry-dev` (no billing) →
   *Google Auth Platform*: audience **External**, scopes `openid`, `email` only → publish **In production**.
   Create an OAuth client of type **Web application**; leave redirect URIs empty for now.
5. `npm run deploy:dev` — builds, pushes and creates the dev web-app deployment (Execute as: me; Access: Anyone).
   Note the `/exec` URL and deployment ID printed (stored in `.clasp.dev.json`).
6. Add the `/exec` URL as an **Authorized redirect URI** on the OAuth client.
7. Apps Script editor → Project settings → Script properties: fill every key from
   `config/script-properties.example.json` (`SPREADSHEET_ID`, `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`,
   `FORM_TOKEN_SECRET` (random 32+ chars), `WEB_APP_URL`, `BOOTSTRAP_ADMIN_EMAIL` (your Google email),
   `MEMBER_NUMBER_START` = `1001`, `ENVIRONMENT` = `dev`).
8. In the editor run `setup` (authorize when asked). It creates the sheets, headers, validation and protections, and
   makes you the first Admin.
9. Optional: run `seedSyntheticMembers` (dev only; refuses when `ENVIRONMENT ≠ dev`) to add 3,000 synthetic members.
10. Run `runAdapterChecks` (dev only): checks Sheets read/write, text escaping, lock, cache. Expect "all checks passed".

## 4. SPIKE-001 (before any other implementation)

Follow research.md R1 "Spike task". Record the result in research.md ("Spike result" section). Do not start feature
tasks until the exit criteria pass or a fallback is chosen.

## 5. Manual release checklist on the dev URL (real phone + desktop)

Use synthetic data. Accounts: one Google account each for Admin, EC member, treasurer (added via the Club users screen),
plus a private window that is not signed in.

| # | Check | Expected |
|---|---|---|
| 1 | Not signed in: open the URL, try `?page=app`, `#search`, `#users` | Only registration form and sign-in visible (FR-023, SC-007) |
| 2 | Self-register in English and in 中文 on a phone | Confirmation in chosen language shows the new member number and no other member data (US1 AS1, FR-009) |
| 3 | Register again with the same email | "Already registered" message only; no member number or record details (FR-009) |
| 4 | Double-tap submit | One record only; both confirmations show the same member number (FR-010) |
| 5 | Treasurer: search, open record, look for edit/register/delete/users | Can view all fields and history; no edit/register/delete/users (US2 AS6, US3 AS4) |
| 6 | EC member: register on behalf, edit phone and Note | History shows EC member, old/new values (US3, US4) |
| 7 | Two browsers edit the same record | Second save gets "record changed, review" (FR-019) |
| 8 | Admin: delete a test record, choosing the reason "Test record" | Gone from search and count; the ChangeHistory row shows only member number, who, when, `reason_code` = `test_record`; no ChangeValues rows for that member (US5) |
| 9 | Admin: try removing own Admin role while sole Admin | Refused (FR-015) |
| 10 | Search at 2,000+ synthetic records on a phone | Result in < 10 s from first character (SC-001) |
| 11 | Open the sign-in link inside WeChat | Message asks to open in a browser (research R1-2) |
| 12 | A person who has not seen the form self-registers on a phone, once in English and once in 中文 (timed) | Each completed in < 3 min (SC-002) |
| 13 | EC member registers a person on their behalf on a phone (timed) | Completed in < 3 min (SC-003) |

## 6. Production deploy (signed in as the Club account)

Production is owned by the Club Gmail account. Its password and 2-step verification stay with the Club Admin; they are
never stored in the repo, CI, or a developer's notes.

**First-time setup** (Admin and maintainer together, ~1 hour): repeat §3 steps 1–8 **signed in as the Club account**,
using `.clasp.prod.json`, a Google Cloud project `member-registry` under the Club account, a new spreadsheet
`Member Registry` (never shared), `ENVIRONMENT` = `prod`, and `BOOTSTRAP_ADMIN_EMAIL` = the Admin's sign-in email.
Set the project time zone to `America/Halifax` before running `setup`.
Do **not** run `seedSyntheticMembers` or `runAdapterChecks` in production (they refuse anyway).

**Each release**:

```bash
git checkout vX.Y.Z && npm ci && npm test && npm run build
npx clasp logout && npx clasp login        # sign in as the Club account (Admin enters the password)
npm run deploy:prod                         # push + update the EXISTING deployment (URL unchanged)
npx clasp logout                            # always log out afterwards
```

Never create a new production deployment: the URL is printed on QR codes and registered as the OAuth redirect URI.
**Rollback**: `npm run deploy:prod -- --version <previous>` or editor → Deploy → Manage deployments → Edit → choose
the previous version.

**Rotate secrets** (if a secret may have leaked): Google Cloud → OAuth client → reset secret → update
`OAUTH_CLIENT_SECRET`; change `FORM_TOKEN_SECRET` (open forms will ask to reload).

---

# Part 2 — For the Club Admin (plain language)

## Where the data lives

- Everything is in the **Club's Gmail account**. Nothing is on a paid service, and nothing costs money.
- The **member list** is a Google Sheet called **"Member Registry"** in the Club account's Google Drive.
  - Tab **Members**: one row per member.
  - Tab **ClubUsers**: who can sign in and what they can do.
  - Tabs **ChangeHistory** and **ChangeValues**: the record of every change (who, when, what).
  - Tab **Counters**: the next member number. Tab **README**: these notes.
- **Do not share this Sheet with anyone**, not even EC members or the treasurer. They use the registry app instead,
  which shows each person only what their role allows.
- **Use the app to make changes.** If you type directly in the Sheet, Google shows a warning: the change will not be
  in the change history and the duplicate check will not run. Only edit directly if a developer asks you to.
- The **app's address** (link / QR code) is the web-app URL saved in the Script properties under `WEB_APP_URL`.
  Keep it in a safe note.

## Backups and restore

- Google keeps older versions of the Sheet automatically (**version history**). Nothing extra is needed.
- **Once a month** (and before every release): open the Sheet → **File → Version history → Name current version** →
  type e.g. "Backup 2026-11-01". Named versions are easy to find later.
- **To restore**: File → Version history → See version history → pick a version → **Restore this version**.
  Before restoring, know that:
  - Every change made after that version is undone (including new registrations).
  - Records an Admin **deleted** after that version **come back**. Delete them again in the app.
  - Member numbers will not be reused, even after a restore.
  - Tell the EC members that recent changes may need to be re-entered.
- Old versions still contain the details of deleted test or spam records. Only the Club account can see version
  history, so keep the Club account password private and 2-step verification on.
- Do not download the Sheet to personal computers or email it around. If an export is ever needed, delete it after use.

## Adding an EC member or a treasurer

1. Ask the person for the email of their **Google account** (a Gmail address, or any email they have registered as a
   Google account at <https://accounts.google.com/signup>).
2. Open the registry app → **Sign in** → **Club users** → **Add Club user**.
3. Enter their email and name, tick **EC member** and/or **Treasurer** (or **Admin**), and save.
4. Send them the app link. They tap **Sign in**, choose that Google account, and are in. Google checks their
   password; the registry never asks for, sees, or stores a password. People who only register as members need no
   account at all.
5. **Changing or removing access**: Club users → choose the person → change the ticks → save. Removing all ticks
   removes their access the next time they use the app. Every change is recorded in the change history.
6. There must always be at least one Admin: the app will not let you remove the last one. It is wise to have **two**
   Admins.

## Other everyday answers

- **"How many members do we have?"** → app → Search screen shows the member count.
- **A spam or test registration?** → app → open the record → **Delete** → choose the reason (Test record, Spam, or Entered by mistake) → confirm.
  Deleting cannot be undone in the app and keeps only the member number and name in the change history.
- **Someone can't sign in from WeChat** → ask them to open the link in Chrome or Safari.
- **Changing the app's code** → only a developer does this, with you signing in to the Club account for the deploy
  step (Part 1 §6). Never give the Club password to anyone by email or chat.
