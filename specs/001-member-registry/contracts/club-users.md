# Club-user functions

All require `clubUser.manage` (Admin only, FR-015). EC member / treasurer → `FORBIDDEN` (US5 AS4).

## `listClubUsers(sessionToken) → Result<ClubUserView[]>`

All ClubUsers rows (including users with no roles, shown as "no access"), sorted by display name.
`hasSignedIn` = `google_sub` is bound. **Errors**: `NOT_SIGNED_IN`, `FORBIDDEN`, `INTERNAL`.

## `addClubUser(sessionToken, email, displayName, roles) → Result<ClubUserView>`

Adds a person who may sign in with the Google account `email`.
**Validation**: email format; `displayName` 1…100 chars; `roles` non-empty subset of `admin|ec_member|treasurer`
(`roles_invalid`). If an existing row has the same email, returns `VALIDATION_FAILED` (`field: 'email'`) — use
`setClubUserRoles` instead.
**Processing**: lock; assign `user_id`; append row (`language = en`, `version = 1`); ChangeHistory `club_user_added`
(subject = new `user_id`) and ChangeValues `email`, `display_name`, `roles`.
**Errors**: `VALIDATION_FAILED`, `NOT_SIGNED_IN`, `FORBIDDEN`, `BUSY`, `SAVE_FAILED`, `INTERNAL`.
**FRs**: FR-015, FR-018, FR-024. **AC**: US5 AS3.

## `setClubUserRoles(sessionToken, userId, expectedVersion, roles) → Result<ClubUserView>`

Assigns or removes roles; an empty list removes all access (the row is kept).
**Processing**: lock; re-read; `NOT_FOUND`; `VERSION_CONFLICT`; if the result leaves **no** user with `admin` →
`LAST_ADMIN` (applies to the caller removing their own Admin role too); write row; ChangeHistory `roles_changed`
with ChangeValues `roles` old/new.
**Effect timing**: the next API call by that user uses the new roles (roles are read on every call; US5 AS3).
Existing sessions of a user whose roles become empty are refused with `NOT_SIGNED_IN`.
**Errors**: `VALIDATION_FAILED`, `NOT_FOUND`, `VERSION_CONFLICT`, `LAST_ADMIN`, `NOT_SIGNED_IN`, `FORBIDDEN`,
`BUSY`, `SAVE_FAILED`, `INTERNAL`.
**FRs**: FR-015, FR-018, FR-024. **AC**: US5 AS3–AS4; edge case "Admin removes their own Admin role".
