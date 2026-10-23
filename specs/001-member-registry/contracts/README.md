# Server Contracts: Member Registry

**Feature**: `001-member-registry` | **Plan**: [../plan.md](../plan.md) | **Data model**: [../data-model.md](../data-model.md)

The UI calls the server only through `google.script.run.<function>(...)` and through the `doGet` routes.
This folder defines every such function. Types are in [api-types.ts](api-types.ts).

| File | Functions |
|---|---|
| [routes.md](routes.md) | `doGet` routes (pages, sign-in callback) |
| [public.md](public.md) | `submitRegistration`, `beginSignIn` |
| [session.md](session.md) | `whoAmI`, `signOut`, `setLanguage` |
| [members.md](members.md) | `searchMembers`, `countMembers`, `getMember`, `updateMember`, `deleteMember` |
| [club-users.md](club-users.md) | `listClubUsers`, `addClubUser`, `setClubUserRoles` |

## Conventions

1. **Envelope**. Every function returns (never throws to the client):

   ```ts
   type Result<T> = { ok: true; data: T } | { ok: false; error: ApiError };
   type ApiError = { code: ErrorCode; fields?: FieldError[]; current?: unknown; matched?: 'email' | 'phone'; memberNumber?: number };
   ```

   Server responses contain **codes, never UI text**. The client maps `error.code` and `fields[].code` to
   translation keys (`error.<code>`), so every message exists in English and Simplified Chinese (FR-020, FR-026).

2. **Session**. Every non-public function takes `sessionToken: string` as its first argument. The API guard
   (`src/server/api.ts`) runs before the use case:
   1. resolve session → `NOT_SIGNED_IN` if missing/expired;
   2. load the Club user and **current roles** from ClubUsers → `NOT_SIGNED_IN` if the user has no roles;
   3. check the function's required capability → `FORBIDDEN`.
   Refusals carry no member data (FR-026).

3. **Registry**. Each function is declared once in `src/server/endpoints.ts` with `{ name, access: 'public' |
   Capability, handler }`. The build generates the top-level Apps Script stubs from this registry; a contract test
   fails if a stub has no entry, or if a public endpoint's response type contains member fields (SC-007).

4. **Writes** take the script lock (`BUSY` if not acquired within 15 s) and are atomic with their change-history
   entry (`SAVE_FAILED` otherwise; nothing is saved). See research R4.

5. **Logging**. Handlers log only `{endpoint, outcome code, memberNumber | userId, durationMs}` (FR-027).

## Error codes

| Code | Meaning | Typical UI |
|---|---|---|
| `VALIDATION_FAILED` | One or more fields invalid; `fields[]` lists `{field, code}` | Inline field messages |
| `ALREADY_REGISTERED` | (public caller) email or phone already belongs to a member; nothing else disclosed | FR-009 message + contact an EC member |
| `DUPLICATE_EMAIL` / `DUPLICATE_PHONE` | (signed-in caller) which value matched, plus `memberNumber` of the existing record | Offer "Open existing record" (FR-012) |
| `NOT_SIGNED_IN` | No valid session, or the account holds no Club role | Show only Register / Sign in (FR-023) |
| `NOT_A_CLUB_USER` | Google sign-in succeeded but the account is not an active Club user | Explain and offer Register |
| `SIGN_IN_FAILED` | Code exchange / claim check failed, or state mismatch | Retry sign-in |
| `FORBIDDEN` | Role lacks the capability | "You don't have permission" (FR-026) |
| `NOT_FOUND` | Member number / user id does not exist (or was deleted) | "Member not found" |
| `VERSION_CONFLICT` | Record changed since loaded; `current` holds the latest record | Review and re-apply (FR-019) |
| `LAST_ADMIN` | Change would leave no Admin | FR-015 message |
| `HAS_DEPENDENT_RECORDS` | Record has payments/attendance (later features) | FR-017 message |
| `FORM_EXPIRED` | Public form token too old or invalid | Reload form, values kept |
| `RATE_LIMITED` | Public form circuit breaker open | Try later / ask an EC member |
| `BUSY` | Lock not acquired | "Busy, please retry" |
| `SAVE_FAILED` | Write or history append failed; rolled back | "Not saved, please retry" |
| `INTERNAL` | Unexpected error (logged with code only) | Generic error |

## Access summary (FR-025)

| Function | Public | Treasurer | EC member | Admin | FRs |
|---|---|---|---|---|---|
| `doGet` | ✓ | ✓ | ✓ | ✓ | FR-007, FR-023 |
| `beginSignIn` | ✓ | ✓ | ✓ | ✓ | FR-023 |
| `submitRegistration` (no session) | ✓ | — | — | — | FR-004…FR-010, FR-012 |
| `submitRegistration` (with session) | — | ✗ `FORBIDDEN` | ✓ | ✓ | FR-011, FR-012 |
| `whoAmI`, `signOut`, `setLanguage` | — | ✓ | ✓ | ✓ | FR-020, FR-024 |
| `searchMembers`, `countMembers`, `getMember` | — | ✓ | ✓ | ✓ | FR-008, FR-013, FR-014, FR-025 |
| `updateMember` | — | ✗ | ✓ | ✓ | FR-012, FR-014, FR-018, FR-019 |
| `deleteMember` | — | ✗ | ✗ | ✓ | FR-016…FR-018 |
| `listClubUsers`, `addClubUser`, `setClubUserRoles` | — | ✗ | ✗ | ✓ | FR-015, FR-018, FR-024 |

Editor-only entry points `setup()` and `runAdapterChecks()` (dev only) are registered with `access: 'owner'`:
they are global (so the Apps Script editor can run them) and therefore reachable from `google.script.run`, so
they refuse to run unless `Session.getActiveUser().getEmail()` equals the script owner's email (empty for web
visitors). Internal helpers use a trailing underscore, which hides them from `google.script.run`.
