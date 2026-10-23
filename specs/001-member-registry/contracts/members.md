# Member functions

All require a valid session. Types: [api-types.ts](api-types.ts). Capabilities: [README](README.md#access-summary-fr-025).

## `searchMembers(sessionToken, query) → Result<{results: MemberSummary[], truncated}>`

**Who**: `member.search` (Admin, EC member, treasurer).
**Input**: `query` — 1…100 chars after trimming.
**Matching** (pure domain, `src/domain/search.ts`; FR-013):

| Query shape | Match |
|---|---|
| Only digits, length ≤ 6 | Exact `member_number` **or** phone digit substring (≥ 4 digits) |
| Contains `@` | Case-insensitive substring of `email` |
| Digits with phone punctuation `()-. +` | Phone: digits-only substring of `phone_key` (leading `1` / `+1` removed) |
| Otherwise | NFKC, lowercase, whitespace-collapsed substring of `name_en`, `name_zh`, or `email` |

Results: exact member-number match first, then by `member_number` ascending; at most 25 (`truncated = true` if more).
Deleted records are not present (FR-016).
**Errors**: `VALIDATION_FAILED` (empty/too long), `NOT_SIGNED_IN`, `FORBIDDEN`, `INTERNAL`.
**Performance**: one sheet read per call; target ≤ 4 s warm at 3,000 rows (SC-001, research R6).
**AC**: US2 AS1–AS5, AS7–AS8.

## `countMembers(sessionToken) → Result<{count}>`

**Who**: `member.search`. Number of rows in Members (deleted records excluded by construction).
**FRs**: FR-008, FR-016, SC-008. **AC**: US5 AS2.

## `getMember(sessionToken, memberNumber) → Result<MemberDetail>`

**Who**: `member.viewDetails` (all three roles see every field, FR-025, US2 AS6).
**Output**: all FR-002 fields, `version`, and `history` (entries for this member, newest first, with values; actor
display names resolved from ClubUsers).
**Errors**: `NOT_FOUND`, `NOT_SIGNED_IN`, `FORBIDDEN`, `INTERNAL`.
**AC**: US2 AS6, US4 AS1–AS3 (history visible), US4 AS5 (no edit/remove-history operation exists in this API).

## `updateMember(sessionToken, memberNumber, expectedVersion, changes) → Result<MemberDetail>`

**Who**: `member.edit` (Admin, EC member). Treasurer → `FORBIDDEN` (US4 AS6).
**Input**: `MemberChanges` (only editable fields; `member_number`, dates and system columns cannot be sent — unknown
keys → `VALIDATION_FAILED`).
**Processing**:

1. Validate the merged record with the same rules as registration (FR-004…FR-006); `note` ≤ 2,000 chars.
2. Lock. Re-read row; `NOT_FOUND` if gone; `VERSION_CONFLICT` with `current` if `version ≠ expectedVersion` (FR-019).
3. Duplicate rule against **other** rows (FR-012) → `DUPLICATE_EMAIL` / `DUPLICATE_PHONE` with `memberNumber`.
4. Compute changed fields; if none, return the current record without a history entry.
5. Write row (`version + 1`, `updated_at`), append ChangeHistory (`member_updated`, `fields_changed`) and ChangeValues
   (old/new per field); flush; on failure roll back → `SAVE_FAILED` (FR-018).

**Output**: the updated `MemberDetail`.
**Errors**: `VALIDATION_FAILED`, `DUPLICATE_EMAIL`, `DUPLICATE_PHONE`, `VERSION_CONFLICT`, `NOT_FOUND`, `NOT_SIGNED_IN`,
`FORBIDDEN`, `BUSY`, `SAVE_FAILED`, `INTERNAL`.
**AC**: US4 AS1–AS4, AS6; edge case "two users editing"; "connection drops" (retry with same `expectedVersion`
returns `VERSION_CONFLICT` if the first save landed, letting the user review).

## `deleteMember(sessionToken, memberNumber, expectedVersion, reason, confirmed) → Result<null>`

**Who**: `member.delete` (Admin only). EC member / treasurer → `FORBIDDEN` (US5 AS4).
**Input**: `reason` 1…200 chars (`reason_required`), `confirmed = true` (`confirmation_required`).
**Processing** (research R3), inside one lock:

1. Re-read row; `NOT_FOUND`; `VERSION_CONFLICT`.
2. `MemberReferences.hasDependents(memberNumber)` → `HAS_DEPENDENT_RECORDS` (FR-017; always false in this feature).
3. Snapshot row and the member's ChangeValues rows (in memory, for rollback only; never logged).
4. Remove Members row; `purgeMemberValues(memberNumber)`; append ChangeHistory `member_deleted` and ChangeValues
   `name_en`, `name_zh`, `reason`; flush. On failure restore snapshot → `SAVE_FAILED`.

The member number is not reused (counter untouched). The email and phone become free for a new registration.
**Errors**: `VALIDATION_FAILED`, `NOT_FOUND`, `VERSION_CONFLICT`, `HAS_DEPENDENT_RECORDS`, `NOT_SIGNED_IN`,
`FORBIDDEN`, `BUSY`, `SAVE_FAILED`, `INTERNAL`.
**AC**: US5 AS1, AS2, AS4; SC-006; edge cases "deleted records", "deleting a real member by mistake".
