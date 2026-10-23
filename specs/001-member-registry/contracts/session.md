# Session functions

Require a valid session (contracts README §2). Any Club user with at least one role may call them.

## `whoAmI(sessionToken) → Result<SessionInfo>`

Returns the user's `userId`, sign-in `email`, `displayName`, current `roles`, derived `capabilities` (union over
roles, FR-024) and saved `language`. Refreshes the session's sliding TTL. The client builds navigation from
`capabilities` (FR-023, FR-025).
**Errors**: `NOT_SIGNED_IN`, `INTERNAL`. **FRs**: FR-020, FR-024, FR-025. **AC**: US6 AS2, AS4.

## `signOut(sessionToken) → Result<null>`

Deletes the session entry. Always returns `ok` (idempotent). The client clears `sessionStorage` and shows the
registration form. **FRs**: FR-023.

## `setLanguage(sessionToken, language) → Result<null>`

Saves `language` (`en` | `zh-Hans`) in the user's ClubUsers row so it persists across sign-ins (FR-020).
Not a change-history event (preference, not a role or member change). Takes the script lock.
**Errors**: `VALIDATION_FAILED`, `NOT_SIGNED_IN`, `BUSY`, `INTERNAL`. **AC**: US6 AS1–AS2.
