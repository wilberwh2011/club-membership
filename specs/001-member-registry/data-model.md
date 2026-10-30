# Data Model: Member Registry

**Feature**: `001-member-registry` | **Date**: 2026-10-23 | **Plan**: [plan.md](plan.md) | **Research**: [research.md](research.md)

Storage is one Google Spreadsheet owned by the Club account and **shared with nobody** (research R1, R7).
Each entity is a sheet (tab). Row 1 holds the column keys below (stable, English, snake_case: code depends on
them); row 2 holds a bilingual description of each column for the Admin. Data starts at row 3 and the top two rows are frozen.

Code accesses these sheets only through repository ports (`src/ports`), implemented by the Sheets adapter
(`src/adapters/gas`) and by in-memory adapters for tests (`src/adapters/memory`).

## Conventions

- **Text columns** are formatted as plain text (`@`). The adapter prefixes values that start with
  `= + - @` with `'` (prevents formula injection, research R9).
- **Timestamps** (`*_at`): ISO 8601 with offset, e.g. `2026-10-23T14:05:09-03:00`, in the Club time zone.
- **Dates** (`*_date`): `YYYY-MM-DD` in the Club time zone.
- **Protection**: the spreadsheet is editable only by its owner (the Club account), so protected ranges use
  **"Show a warning when editing this range"**. The warning reminds the Admin that direct edits bypass the
  change history and the duplicate rule. Protection blocks nobody but stops accidental edits.
- **Sheet order**: `README`, `Members`, `ClubUsers`, `ChangeHistory`, `ChangeValues`, `Counters`.

---

## Sheet `README`

Plain-language bilingual notes for the Admin: what each tab is, "do not edit directly, use the app", and a
link to the Admin guide (quickstart.md Part 2). Written by `setup()`. Whole sheet protected (warning).

---

## Sheet `Members` — entity **Member (会员)** (FR-001…FR-006, FR-014)

One row per member record. Deleted records are removed from this sheet (FR-016).

| Column | Type | Required | Validation / rule | Source FR |
|---|---|---|---|---|
| `member_number` | integer | yes | Unique, assigned by the system (≥ `MEMBER_NUMBER_START`, default 1001), never changed or reused | FR-001 |
| `name_en` | text ≤ 100 | one of the two names | Trimmed; whitespace collapsed | FR-002, FR-004 |
| `name_zh` | text ≤ 50 | one of the two names | Trimmed | FR-002, FR-004 |
| `membership_type` | enum | yes | `individual` \| `family` (sheet data validation: list) | FR-003 |
| `email` | text ≤ 254 | yes | Email pattern (research R9); stored as entered (trimmed) | FR-004, FR-006 |
| `phone` | text ≤ 30 | yes | NANP 10 digits (optional +1/1) or `+` and 8–15 digits | FR-004, FR-006 |
| `wechat_id` | text ≤ 50 | no | Trimmed; no internal spaces (kept lenient: older WeChat IDs and phone-number IDs vary) | FR-002 |
| `birthday_month` | integer | no (paired) | 1–12; empty iff `birthday_day` empty | FR-005 |
| `birthday_day` | integer | no (paired) | 1–31, valid for month; Feb allows 29 | FR-005 |
| `registration_event` | text ≤ 100 | yes | Default `N/A` | FR-004 |
| `registration_date` | date | yes | Set by system at creation; not editable | FR-002 |
| `privacy_ack_date` | date | yes | Set by system from the acknowledgment at creation; not editable | FR-007 |
| `note` | text ≤ 2,000 | no | Only set via `updateMember` (not on the registration form) | FR-007, FR-014 |
| `created_at` | timestamp | yes | System | FR-018 |
| `updated_at` | timestamp | yes | System | FR-018 |
| `version` | integer | yes | Starts at 1; +1 on every update (optimistic concurrency) | FR-019 |
| `email_key` | text | yes | `lowercase(email)`; **unique across rows** | FR-012 |
| `phone_key` | text | yes | Normalized phone (research R9); **unique across rows** | FR-012 |

Invariants (enforced by the domain layer inside the script lock, tested in `tests/application`):

- `name_en` or `name_zh` is non-empty.
- No two rows share `email_key`; no two rows share `phone_key` (FR-012). Deleted rows no longer exist, so their
  keys no longer count.
- There are no fields beyond those listed (FR-006; Principle II: no card or bank fields).

Editable via the app (`updateMember`): `name_en`, `name_zh`, `membership_type`, `email`, `phone`, `wechat_id`,
`birthday_month`/`birthday_day`, `registration_event`, `note`. Never editable: `member_number`,
`registration_date`, `privacy_ack_date`, system columns.

Protection: whole sheet (warning). Columns `email_key`…`phone_key` are grouped (collapsed) to keep the view tidy.

Lifecycle: `created` (registration) → `updated` (0..n edits) → `deleted` (row removed; deletion entry with member number and
reason code kept).
There is no status column; active / inactive is derived by the later membership-fees feature.

---

## Sheet `ClubUsers` — entity **Club user** (FR-015, FR-020, FR-024)

| Column | Type | Required | Validation / rule |
|---|---|---|---|
| `user_id` | text | yes | `U` + 4 digits (`U0001`), assigned by the system, never reused |
| `email` | text | yes | Lowercased Google account email used to sign in; unique among active users |
| `google_sub` | text | after first sign-in | Google's stable account id; bound at the first sign-in; unique |
| `display_name` | text ≤ 100 | yes | Shown in the app and in change history |
| `roles` | text | yes (may be empty) | Comma-separated subset of `admin`, `ec_member`, `treasurer`; empty = no access |
| `language` | enum | yes | `en` \| `zh-Hans`; default `en` |
| `created_at` | timestamp | yes | System |
| `updated_at` | timestamp | yes | System |
| `version` | integer | yes | Optimistic concurrency for role changes |

Rules:

- **No credentials are stored**: there is no password, PIN, code or token column. Sign-in is by Google account
  only, so `email` and `google_sub` are the only identity data (research R1; enforced by the no-password schema test, R8).
- At least one user has `admin` in `roles` at all times (FR-015, "last Admin" edge case).
- A user with empty `roles` cannot sign in (`NOT_A_CLUB_USER`); rows are never deleted, so history references stay
  valid. "Removing a Club user" means removing all their roles.
- Roles are read from this sheet on **every** API call (research R1, step 5).
- Club users are not members; one person may be both, but the records are not linked in this feature.

Protection: whole sheet (warning).

---

## Sheet `ChangeHistory` — entity **Change-history entry** (audit facts) (FR-018, Principle IV)

Append-only. **The application never updates or deletes a row in this sheet.** Holds no member personal values.

| Column | Type | Rule |
|---|---|---|
| `entry_id` | text | `H` + 8 digits, ascending, unique |
| `recorded_at` | timestamp | With time-zone offset |
| `actor_kind` | enum | `club_user` \| `self_registration` \| `system` (setup) |
| `actor_user_id` | text | `ClubUsers.user_id` when `actor_kind = club_user`; empty otherwise |
| `change_kind` | enum | `member_created` \| `member_updated` \| `member_deleted` \| `club_user_added` \| `roles_changed` |
| `subject_kind` | enum | `member` \| `club_user` |
| `subject_id` | text | Member number or `user_id` |
| `fields_changed` | text | Comma-separated field names (names only; no values); empty for `member_deleted` |
| `request_id` | text | Client request / submission id (support for retry diagnosis) |
| `reason_code` | enum | `member_deleted` only: `test_record` \| `spam` \| `entered_by_mistake` (FR-016; translation keys `reason.<code>`); empty for every other change kind. A fixed code, never free text, because this sheet is never purged (Principle I; owner decision 2026-10-30) |

Protection: whole sheet (warning). Display in the app: entries for a member sorted by `recorded_at` descending,
with the actor's `display_name` (from ClubUsers) or "Self-registration".

---

## Sheet `ChangeValues` — old/new values for each entry (FR-018)

| Column | Type | Rule |
|---|---|---|
| `entry_id` | text | → `ChangeHistory.entry_id` |
| `member_number` | integer | Set for member entries; empty for Club-user entries |
| `field` | text | Field name (`email`, `roles`, …) |
| `old_value` | text | Empty for creation |
| `new_value` | text | Empty for deletion |

Rows are appended with their entry. Exactly one removal path exists: `purgeMemberValues(memberNumber)`, called only
by the `deleteMember` use case; it removes **every** ChangeValues row of that member. The `member_deleted` entry has
**no** ChangeValues rows and keeps no member name (owner decision 2026-10-30). Deletion order (research R3): (a) append
the `member_deleted` ChangeHistory row; (b) `purgeMemberValues(N)`; (c) remove the Members row; each step is safe to
retry. Creation entries store every submitted field as `new_value` (including
`privacy_ack_date` and `registration_event`).

Protection: whole sheet (warning).

**State after deleting member 1042** (example with synthetic data):

| Sheet | Before | After |
|---|---|---|
| Members | row 1042 | — (removed) |
| ChangeHistory | H…01 created, H…07 updated (`phone`) | H…01, H…07 unchanged + H…12 `member_deleted` (`subject_id` = 1042, actor, `recorded_at`, `reason_code` = `test_record`), appended first |
| ChangeValues | values for H…01, H…07 | — (none for member 1042; H…12 has no values) |

---

## Sheet `Counters` — sequences (FR-001)

| `key` | `value` | Rule |
|---|---|---|
| `next_member_number` | integer | Only increases; committed after a successful registration |
| `next_user_id` | integer | Only increases |
| `next_history_entry` | integer | Only increases |
| `schema_version` | integer | `1` for this feature; used by later migrations |

A Script Property `MEMBER_NUMBER_HIGH_WATER` mirrors the last assigned member number, so restoring an older
spreadsheet version cannot cause reuse (research R4). Protection: whole sheet (warning).

---

## Non-sheet state

| Store | Key | Value | TTL | Purpose |
|---|---|---|---|---|
| CacheService (script) | `session:<sha256(token)>` | `{userId, createdAt}` | 6 h sliding, 12 h absolute | Sign-in session (R1) |
| CacheService | `oauthstate:<state>` | `{clientNonce}` | 10 min, single use | Sign-in CSRF (R1) |
| CacheService | `submission:<submissionId>` | result envelope | 10 min | Idempotent registration (R5) |
| CacheService | `content:<sha256(normalized form)>` | result envelope | 10 min | Identical resubmission collapse (R5) |
| CacheService | `ratelimit:<10-min window>` | count | 10 min | Public form circuit breaker (R5) |
| Script Properties | see research R7 | config and secrets | — | Never in repo |
| Browser `sessionStorage` | `sessionToken`, `clientNonce`, `lang`, `submissionId` | — | tab lifetime | Client state |

No member personal data is stored in CacheService except inside the 10-minute registration result envelopes,
which contain only the member number and outcome code (no personal fields).

---

## Domain types (pure TypeScript, `src/domain`)

```text
MembershipType = 'individual' | 'family'
Role           = 'admin' | 'ec_member' | 'treasurer'
Language       = 'en' | 'zh-Hans'
Birthday       = { month: 1..12, day: 1..31 }      // validated pair
MemberInput    = { nameEn?, nameZh?, membershipType, email, phone, wechatId?, birthday?, registrationEvent? }
Member         = MemberInput + { memberNumber, registrationDate, privacyAckDate, note, createdAt, updatedAt, version }
MemberSummary  = { memberNumber, nameEn, nameZh, membershipType, email, phone }
ClubUser       = { userId, email, googleSub?, displayName, roles: Role[], language, version }
HistoryEntry   = { entryId, recordedAt, actor, changeKind, subject, fieldsChanged[], reasonCode, values?: {field, old, new}[] }
DeletionReasonCode = 'test_record' | 'spam' | 'entered_by_mistake'   // reasonCode is set only for member_deleted
Capability     = 'member.search' | 'member.viewContact' | 'member.viewDetails' | 'member.register'
               | 'member.edit' | 'member.delete' | 'clubUser.manage'
```

Permission matrix (`src/domain/permissions.ts`, mirrors FR-025; payments row added by the later feature):

| Capability | admin | ec_member | treasurer |
|---|---|---|---|
| member.search, member.viewContact, member.viewDetails | ✓ | ✓ | ✓ |
| member.register (on someone's behalf), member.edit | ✓ | ✓ | — |
| member.delete, clubUser.manage | ✓ | — | — |

A user's capabilities are the union over their roles (FR-024).

## Validation messages

Validation returns `{field, code}` pairs; codes map to translation keys `error.<code>`:
`required`, `name_required` (neither name), `email_invalid`, `phone_invalid`, `birthday_invalid`,
`too_long`, `privacy_ack_required`, `membership_type_invalid`, `wechat_invalid`, `reason_required`,
`confirmation_required`.
