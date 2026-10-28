# Feature Specification: Member Registry

**Feature Branch**: `001-member-registry`

**Created**: 2026-10-22

**Status**: Draft

**Input**: User description: "Member Registry for the Calligraphy Art Club — a single trusted member register that replaces the scattered Google Sheet, Microsoft Excel sheet, and paper records. Supports self-registration, registration by an EC member on someone's behalf, membership type (individual / family), optional birthday (month and day), contact details (email, phone, WeChat), fast look-up, record maintenance without deletion, duplicate detection and resolution, English / Simplified Chinese on every screen, and role-based access to personal details. Fees, active/inactive status, events, check-in, reports, and importing existing records are out of scope."

## Context

The Club cannot currently say who its members are. Member records are split across the Google Form / Google Sheet (online registrations), a separate Microsoft Excel sheet maintained by EC members (including people who joined at events), and paper registration forms recorded by Alex. None of these sources is consistent or current (see `docs/brief/club-membership-brief.md`).

This feature creates the single trusted member register and its registration form. Once the existing records have been consolidated (a later feature), this registration form is the only channel for registering a new member: paper registration is no longer used as a first step. Every later feature — membership dues and payments, events and check-in, reports and birthday lists — builds on the member records defined here. Terms follow `docs/brief/glossary.md`.

## Clarifications

### Session 2026-10-22

- Q: Which personal fields are required versus optional? → A: Required: at least one name (English or Chinese), email, and phone. WeChat ID is optional, and birthday stays optional. The same rule applies to self-registration and to registration by an EC member.
- Q: Do self-registrations need EC approval before becoming members? → A: No. A self-registrant becomes a member as soon as they submit.
- Q: Is a separate "withdrawn" status needed, and how are test and junk records handled? → A: No withdrawn status. Test and junk records may be deleted at the deleting user's discretion (now an Admin capability — see 2026-10-23); members who stop taking part become inactive members through the membership fees feature.
- Q: Should a new member be allowed if their email or phone is already registered? → A: No. A new registration cannot use an email or a phone that already belongs to an existing member record; either match is a duplicate registration attempt and is refused.
- Q: Does self-registration replace the existing Google Form? → A: Not yet. Both run in parallel until the later import feature brings in the Google Sheet rows. Automatic feeding of Google Form submissions into the register is wanted, as a goal for that later feature.

### Session 2026-10-23

- Q: Is a registration channel (online / paper / at an event) needed? → A: No. Paper registration is no longer used as a first step; existing paper records are put into the Google Form or the Microsoft Excel sheet and transferred in the later import feature. After consolidation, this feature's registration form is the only trustworthy channel.
- Q: Which roles does this feature have? → A: Admin, EC member, and treasurer. There is no separate event volunteer role; EC members do look-ups at events. Admin can do everything, including managing Club roles; EC members cannot manage roles. In the later payments feature, the treasurer (and Admin) can check and mark payments; EC members cannot.
- Q: Does an EC member use a different registration form? → A: No. EC members registering someone use the same registration form as self-registration.
- Q: Does the system detect duplicates by name? → A: No. Duplicate detection and resolution is deferred to the later feature that transfers the Google Sheet and Microsoft Excel records. A new registration with the same name as an existing member but a different email and phone is allowed; only the email/phone rule applies.
- Q: Can members be found by member number? → A: Yes. Member number is added to search.
- Q: Is there a place for extra information on a member record? → A: Yes. A Note field that EC members and Admins can add to when updating a member record.
- Q: Can treasurers see birthday, Note, and change history? → A: Yes. Treasurers can view every field of a member record and its change history, but cannot register, edit, or delete members.
- Q: Should the registration record the event at which the member registered? → A: Yes. A registration event field on the registration form records the Club event; it defaults to "N/A" when the registration is not taken during an event.
- Q: What does the change history keep for a deleted record? → A: A deletion entry with the member number, member name, who deleted it, when, and the reason, but none of the person's other details.
- Q: What can a person who is not signed in see? → A: Only the self-registration screen (plus the sign-in page Club users need); no other functions.
- Q: Does a self-registrant see their member number? → A: Yes (owner decision). After a successful self-registration the confirmation shows the newly assigned member number and nothing else from the record; an accidental identical resubmission shows the same confirmation and number. The already-registered message is unchanged: no member number or other details of the existing record (FR-009).
- Q: How do Club users sign in? → A: With a Google account (any email address may be used to create one). Self-registrants need no account. The system stores no passwords and issues no sign-in credentials of its own (FR-029).
- Q: What is the Club's time zone? → A: America/Halifax (used for registration and privacy acknowledgment dates and change-history times).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Self-registration (Priority: P1)

A prospective member opens the Club's registration form (from the Club website, a link, or a QR code at an event), chooses English or Simplified Chinese, enters their own details — name(s), membership type (individual or family), email, phone, optionally WeChat ID and birthday (month and day), and the registration event if they are registering at a Club event — acknowledges how the Club will use their information, and submits. They become a member immediately, receive a member number, and see a confirmation. They cannot see anyone else's information.

**Why this priority**: After consolidation, this form is the only way to register a new member. It creates the member record that every other story and later feature depends on.

**Independent Test**: As an anonymous visitor, complete the registration form in each language; confirm a member record is created with a member number and the submitted details, that it is recorded as a self-registration, and that nothing in the flow reveals other members' existence or details.

**Acceptance Scenarios**:

1. **Given** a visitor opens the registration form, **When** they complete all required fields, acknowledge the privacy statement, and submit, **Then** a member record is created immediately with a new member number, today's registration date, and the submitted details, and the visitor sees a confirmation in their chosen language that shows their new member number.
2. **Given** a visitor is registering a family, **When** they choose "family membership" and enter the primary contact's details, **Then** exactly one member record is created holding only the primary contact's information, and the form does not ask for details of other family members.
3. **Given** a visitor leaves the birthday and WeChat ID empty, **When** they submit, **Then** the registration succeeds.
4. **Given** a visitor is registering at a Club event, **When** they enter the event's name in the registration event field, **Then** the member record shows that event; **Given** the registration is not taken at an event, **When** the visitor leaves the field unchanged, **Then** the record shows "N/A".
5. **Given** a visitor enters a birthday, **When** they choose a month and a day, **Then** only the month and day are stored, no year is requested, and impossible dates (e.g., February 30) are rejected while February 29 is accepted.
6. **Given** a visitor enters an email or a phone number that already belongs to an existing member record, **When** they submit, **Then** no new record is created and the visitor sees a message, in their chosen language, that this email or phone is already registered and that they can contact an EC member to update their details; no details of the existing record are shown.
7. **Given** a visitor enters the same name as an existing member but a different email and phone, **When** they submit, **Then** the registration succeeds as a new member record.
8. **Given** a required field is missing, a value is invalid (e.g., malformed email), or the privacy statement is not acknowledged, **When** the visitor submits, **Then** nothing is saved and a clear message in the current language identifies each problem.
9. **Given** a visitor is filling in the form, **When** they switch between English and Simplified Chinese, **Then** every label, instruction, option, validation message, and the confirmation are shown in the chosen language and already-entered values are kept.
10. **Given** a visitor on a phone (360 CSS pixels wide), **When** they complete the form, **Then** the form is fully usable without horizontal scrolling or zooming.

---

### User Story 2 - Find a member quickly (Priority: P1)

An EC member at an event, the treasurer, or an Admin needs to find a person fast. They type a member number, part of an English name, a Chinese name, an email address, or a phone number, and see matching member records within moments, on a phone or a desktop.

**Why this priority**: Look-up is the daily use of the register — the treasurer looking up who is paying, an EC member checking whether someone is a member at an event. Without fast search, the register is no better than a spreadsheet.

**Independent Test**: With a set of synthetic member records loaded, search by each supported field (member number, English name, Chinese name, email, phone) on a phone-width screen, and confirm the right records appear with only the fields that role is allowed to see.

**Acceptance Scenarios**:

1. **Given** a member record with member number 1024, **When** a user searches "1024", **Then** that record appears in the results.
2. **Given** a member record with English name "Mei Lin Example", **When** a user searches "mei lin" (any capitalization, extra spaces), **Then** that record appears in the results.
3. **Given** a member record with Chinese name "林美", **When** a user searches "林美" or "林", **Then** that record appears in the results.
4. **Given** a member record with phone "(604) 555-0123", **When** a user searches "6045550123" or "555-0123", **Then** that record appears in the results (phone matching ignores spaces, dashes, brackets, and a leading country code).
5. **Given** a member record with email "Mei.Lin@example.org", **When** a user searches "mei.lin@example.org", **Then** that record appears (email matching ignores capitalization).
6. **Given** a treasurer is signed in, **When** they search and open a result, **Then** they see all of the member's details — member number, name(s), membership type, email, phone, WeChat ID, birthday, registration and privacy acknowledgment dates, Note, and change history — but cannot edit any of them.
7. **Given** a search with no matches, **When** results are shown, **Then** the user sees a clear "no members found" message in the current language.
8. **Given** a user is on a phone (360 CSS pixel wide screen), **When** they search and view results, **Then** the screen is fully usable without horizontal scrolling or zooming.

---

### User Story 3 - EC member registers a new member on someone's behalf (Priority: P2)

At an event, or when a person asks for help, a signed-in EC member (or Admin) opens the same registration form used for self-registration and fills it in with the person, including the person's acknowledgment of the privacy statement. The member record is created immediately, exactly as for a self-registration, and records which EC member entered it.

**Why this priority**: Helps people who cannot or prefer not to register themselves, without creating a second channel: the form, fields, and rules are identical to self-registration (Story 1).

**Independent Test**: Sign in as an EC member, register a synthetic person through the registration form, and confirm the record is identical in content to a self-registration except that the change history shows the EC member as the person who created it.

**Acceptance Scenarios**:

1. **Given** an EC member is signed in, **When** they open the registration form, **Then** they see the same fields, options, privacy statement, and validation rules as the self-registration form.
2. **Given** an EC member completes and submits the form for someone, **Then** a member record is created with a new member number, and the change history records the EC member as its creator.
3. **Given** an EC member enters an email or phone that already belongs to an existing member record, **When** they submit, **Then** the registration is refused as a duplicate registration attempt, the EC member is told which of the two is already registered, and they are offered the existing record.
4. **Given** a treasurer is signed in, **When** they look for the registration form for someone else, **Then** it is not available to them.

---

### User Story 4 - View and update a member's details and Note (Priority: P2)

An EC member or Admin opens a member record, sees all of its details and its change history, and corrects or updates details (for example, a new phone number or a change from individual to family membership). They can also add additional information to the member's Note (for example, "prefers WeChat contact").

Members who stop taking part are not removed: they keep their record and become inactive members once the membership fees feature determines active / inactive status.

**Why this priority**: Keeping records current is what makes the register trustworthy over time.

**Independent Test**: As an EC member, edit several fields and the Note of a synthetic member, and confirm each change is visible and the change history shows who changed what and when (old and new values).

**Acceptance Scenarios**:

1. **Given** an EC member opens a member record, **When** they change the phone number and save, **Then** the new phone number is shown and the change history records the EC member, the date and time, the old value, and the new value.
2. **Given** an EC member changes the membership type from individual to family, **When** they save, **Then** the record shows family membership and the change appears in the change history.
3. **Given** an EC member adds text to the Note and saves, **Then** the Note shows the new text and the change appears in the change history.
4. **Given** an EC member changes a record's email or phone to one that already belongs to another member record, **When** they save, **Then** the change is refused and nothing is saved.
5. **Given** any signed-in user, **When** they look for a way to edit or remove change-history entries or to change a member number, **Then** no such option exists.
6. **Given** a treasurer is signed in, **When** they open a member record, **Then** they cannot edit it.

---

### User Story 5 - Admin: delete test and junk records and manage Club roles (Priority: P2)

An Admin can do everything an EC member can. In addition, when a record should never have existed — a test entry, a prank or spam self-registration, or a record entered by mistake — the Admin deletes it at their discretion; and the Admin decides which Club users hold which Club role (Admin, EC member, treasurer).

**Why this priority**: Because registrations become members immediately (FR-008), someone must be able to keep junk entries out of the register and member counts; and someone must control who can see members' personal details.

**Independent Test**: As an Admin, delete a synthetic test record and confirm it no longer appears anywhere while a deletion entry with only the member number and name (no other personal details) remains in the change history; give a Club user the treasurer role and confirm their access changes accordingly; confirm EC members and treasurers can do neither.

**Acceptance Scenarios**:

1. **Given** an Admin chooses to delete a member record, **When** they are asked to confirm and to give a reason (e.g., "test record", "spam"), **Then** the record is deleted only after they confirm and give a reason.
2. **Given** a member record has been deleted, **When** any user searches for it or counts members, **Then** it does not appear and is not counted, and the change history keeps a deletion entry showing the member number, member name, who deleted it, when, and the reason, but none of the person's other details.
3. **Given** an Admin assigns or removes a Club role for a Club user, **When** that user next uses the registry, **Then** they have exactly the permissions of their current roles, and the role change is in the change history.
4. **Given** an EC member or treasurer is signed in, **When** they look for delete or role-management functions, **Then** neither is available.

---

### User Story 6 - Bilingual use and role-based access across the registry (Priority: P1)

Every user — Admin, EC member, treasurer, and self-registrant — can use every screen in English or Simplified Chinese and switch at any time. Each signed-in user sees and changes only what their Club role allows. A person who is not signed in sees only the self-registration screen.

**Why this priority**: These are cross-cutting rules required by the constitution (Principles I and III); they apply to every other story and must hold from the first release.

**Independent Test**: For each role, sign in, switch language on every registry screen, and confirm all text appears in the selected language; attempt each restricted action and confirm it is refused; as a visitor who is not signed in, confirm that nothing except self-registration (and sign-in) is visible or reachable.

**Acceptance Scenarios**:

1. **Given** any user on any registry screen, **When** they switch language, **Then** all text on the screen — labels, buttons, messages, validation errors, and glossary terms — appears in the selected language, using the glossary's terms.
2. **Given** a signed-in user has chosen a language, **When** they sign in again later, **Then** their chosen language is used.
3. **Given** a person who is not signed in, **When** they visit the registry, **Then** they see only the self-registration screen and a way for Club users to sign in — no menus, links, or other functions — and any attempt to reach another screen shows no member information and offers only self-registration or sign-in.
4. **Given** a user without the required role, **When** they try a restricted action (see FR-025), **Then** the action is refused.

---

### Edge Cases

- **Family membership with several people**: only the primary contact's information is recorded; no fields exist for other family members. Changing the primary contact of a family is an ordinary edit of the record.
- **Name in only one language**: some members have only an English name or only a Chinese name; the record allows this as long as the required-field rule (FR-004) is met.
- **Same name, different people**: allowed. Two records may have the same name as long as their emails and phones are different; the member number tells them apart.
- **Same contact details shared by two people**: two genuinely different people (e.g., spouses each wanting an individual membership) who share an email or a phone cannot both register with it (FR-012). They either take a family membership or the second person gives their own email and phone.
- **Birthday February 29**: accepted, since no year is stored.
- **Self-registrant submits twice** (e.g., double tap): an accidental immediate double submission of the identical form is recognized as the same submission; it creates only one record and the visitor sees the normal confirmation. A later resubmission with the same email or phone is refused as already registered (FR-012).
- **Automated or abusive submissions to the public form**: the form must resist bulk automated submissions without blocking genuine people.
- **Phone numbers in different formats** (with or without country code, spaces, dashes, brackets): treated as the same number for search and for the email/phone rule.
- **Chinese characters in search and names**: search works for Simplified Chinese characters; partial Chinese name matches are found.
- **Former member registers again**: if either the email or the phone is unchanged, the registration is refused as already registered and the existing record (with its history) remains the member's record; an EC member updates it if needed. If both have changed, a new record is created; finding such duplicates is left to the later consolidation feature.
- **Deleted records**: a deleted record's email and phone no longer count, so the same person can register again; member numbers of deleted records are never reused.
- **Deleting a real member by mistake**: deletion requires a confirmation and a reason and cannot be undone through the application; the deletion entry in the change history shows which member (number and name) was deleted and who did it.
- **Registration event not known or misspelled**: the registration event is free text, so a visitor may leave "N/A" or type the event name differently from others; EC members and Admins can correct it when updating the record. Linking it to a recorded event is left to the later events feature.
- **Admin removes their own Admin role**: the system must not allow the last remaining Admin to lose the Admin role.
- **Two users editing the same record at the same time**: the second save must not silently overwrite the first; the second user is told the record changed and can review before saving.
- **Connection drops during save** (venue Wi-Fi): the user is told the save did not complete; no partial record is created.

## Requirements *(mandatory)*

### Functional Requirements

**Member records**

- **FR-001**: The system MUST maintain one member record per member, each with a unique, system-assigned member number that never changes and is never reused, including after deletion.
- **FR-002**: Each member record MUST hold: member number, English name, Chinese name, membership type (individual membership or family membership), email, phone, WeChat ID, birthday (month and day only), registration event, registration date, privacy acknowledgment date, and a Note.
- **FR-003**: Membership type MUST be exactly one of individual membership or family membership. A family membership MUST be a single member record holding only the primary contact's information; the system MUST NOT collect or store information about other family members.
- **FR-004**: Every member record MUST have at least one name (English name or Chinese name; both are allowed), an email, and a phone, and MUST have a membership type. WeChat ID, birthday, and the Note MUST be optional. The registration event MUST default to "N/A" (meaning the registration was not taken at a Club event) and MAY be changed to the name of the Club event at which the person registered.
- **FR-005**: Birthday MUST be recorded as month and day only, MUST NOT ask for or store a year, MUST reject impossible month/day combinations, and MUST accept February 29.
- **FR-006**: The system MUST validate the format of email addresses and phone numbers and show a clear, field-specific message in the current language for each invalid or missing value. The system MUST NOT collect fields beyond those listed in FR-002 (e.g., no home address, no birth year, no payment or card details).

**Registration**

- **FR-007**: The system MUST provide one registration form. Anyone, without signing in, MUST be able to use it to self-register. The form MUST show a short privacy statement (in the selected language) explaining what the Club collects and why, and MUST require acknowledgment before submitting; the acknowledgment date MUST be recorded. The form MUST NOT include the Note.
- **FR-008**: A registration MUST become a member record immediately on submission, with no approval step, and MUST appear in searches and member counts straight away. Unwanted registrations are handled by Admin deletion (FR-016).
- **FR-009**: After a successful self-registration, the registrant MUST see a confirmation that includes their newly assigned member number and nothing else from the record. An accidental identical resubmission collapsed into the same record (FR-010) MUST show the same confirmation with the same member number. In the already-registered case of FR-012, the registrant MUST see only that the email or phone is already registered and how to contact an EC member, with no member number or other details of the existing record. The self-registration flow MUST NOT otherwise reveal whether the person or their contact details already exist in the register, MUST NOT show any details of an existing record, and MUST NOT give access to any member information, including their own record after submission (beyond the member number on the confirmation).
- **FR-010**: The public registration form MUST resist bulk automated submissions and MUST collapse an accidental identical resubmission within a short interval into a single record.
- **FR-011**: EC members and Admins MUST be able to register a new member on someone's behalf using the same registration form, with the same fields, privacy statement, and rules as self-registration. The change history MUST record whether a record was self-registered or, if not, which Club user created it.
- **FR-012**: Each email (ignoring capitalization) and each phone number (ignoring spaces, dashes, brackets, and a leading country code) MUST belong to at most one member record. A registration whose email or phone already belongs to an existing record is a duplicate registration attempt and MUST be refused, and so MUST an edit that would give a record an email or phone that belongs to another record. EC members and Admins MUST be told which of the two matched and be offered the existing record; self-registrants MUST be told as described in FR-009. Deleted records do not count. A matching name alone MUST NOT block or flag a registration; no other duplicate detection is part of this feature.

**Look-up**

- **FR-013**: Signed-in Admins, EC members, and treasurers MUST be able to search member records by member number, English name, Chinese name, email, or phone from a single search box. Member number MUST match exactly; the other fields MUST allow partial matches. Matching MUST ignore capitalization and extra spaces; phone matching MUST ignore spaces, dashes, brackets, and a leading country code.

**Maintenance and history**

- **FR-014**: EC members and Admins MUST be able to view and edit all fields of a member record except the member number, including membership type and the Note. The Note is for additional information added when updating a member record; Admins, EC members, and treasurers can see it, and only Admins and EC members can change it.
- **FR-015**: Only Admins MUST be able to assign and remove Club roles for Club users. The system MUST NOT allow the last remaining Admin to lose the Admin role.
- **FR-016**: Admins MUST be able to permanently delete a member record at their discretion (intended for test, junk, spam, or mistaken records). Deletion MUST require an explicit confirmation and a reason. A deleted record MUST no longer appear in searches or member counts, and the person's personal details MUST be removed from the register, except the member number and member name kept in the deletion entry (FR-018).
- **FR-017**: Only Admins MUST be able to delete member records. Once later features attach payments or event attendance to a member record, that record MUST NOT be deletable (payments are never hard-deleted under the constitution's Auditable Money Trail principle). The system MUST NOT offer any other way to remove member records.
- **FR-018**: Every creation, edit, and deletion of a member record, and every Club role change, MUST produce a change-history entry recording who made the change, when (date and time with time zone), the record affected (by member number, or the Club user for role changes), and the old and new values. Change history MUST be append-only and MUST NOT be editable or deletable through the application. If the change-history entry cannot be saved, the change itself MUST NOT be saved. Exception for deletion: the deletion entry MUST record the member number, the member name (English and/or Chinese), who deleted it, when, and the reason, but none of the person's other details, and the personal values held in that record's earlier change-history entries MUST be removed, leaving who, when, and the kind of change.
- **FR-019**: When two users edit the same record concurrently, the system MUST NOT silently overwrite one user's changes; the later user MUST be told the record changed and be able to review before saving.

**Language**

- **FR-020**: Every screen of this feature, including self-registration, MUST be available in English and Simplified Chinese, and users MUST be able to switch language at any time without losing entered data. A signed-in user's language choice MUST persist across sign-ins; the self-registration form MUST remember the visitor's choice for the visit.
- **FR-021**: Domain terms MUST use the exact wording in `docs/brief/glossary.md`. Terms introduced by this feature that are not yet in the glossary (member number, Admin, Note, registration event, delete, duplicate registration attempt, change history, Club user, Club role) MUST be added to the glossary in both languages before they appear on screen.
- **FR-022**: Dates (including birthday month and day) MUST be displayed in the format conventional for the selected language.

**Access by Club role**

- **FR-023**: A person who is not signed in MUST be able to reach only the self-registration screen and the sign-in page; no other screen, menu, link, or function MUST be shown or reachable, and no member information MUST be revealed.
- **FR-024**: The Club roles for this feature are Admin, EC member, and treasurer. A Club user MAY hold more than one role and receives the combined permissions.
- **FR-025**: Permissions MUST be:

  | Capability | Admin | EC member | Treasurer |
  |---|---|---|---|
  | Search and view member number, names, membership type | Yes | Yes | Yes |
  | View email, phone, WeChat ID | Yes | Yes | Yes |
  | View birthday, registration and privacy acknowledgment dates, Note, change history | Yes | Yes | Yes |
  | Register a member on someone's behalf | Yes | Yes | No |
  | Edit a member, including the Note | Yes | Yes | No |
  | Delete a member record | Yes | No | No |
  | Manage which Club users hold which Club role | Yes | No | No |
  | Check and mark payments (later payments feature) | Yes | No | Yes |

- **FR-026**: Every refused action MUST show a clear message in the current language and MUST NOT reveal the restricted information.
- **FR-027**: Member personal details MUST NOT appear in application logs or error reports; logs MUST identify members only by their member number or an internal identifier.

**Usability**

- **FR-028**: The registration form and member search/look-up MUST be fully usable on a phone at 360 CSS pixels wide without horizontal scrolling, with touch targets easy to tap and text readable without zooming. All other screens of this feature MUST be usable on a desktop browser and SHOULD be usable on a phone.

**Sign-in**

- **FR-029**: Club users (Admins, EC members, treasurers) MUST sign in with a Google account (any email address may be used to create one). Self-registrants need no account. The system MUST NOT store passwords or issue its own sign-in credentials.

### Key Entities

- **Member (会员)**: A person registered with the Club, or for a family membership, the family's primary contact. Holds the member number, names (English, Chinese), membership type, contact details (email, phone, WeChat ID), optional birthday (month and day), registration event ("N/A" if not registered at a Club event), registration date, privacy acknowledgment date, and an optional Note. Later features attach payments, membership dues, and event attendance to this record.
- **Change-history entry**: An append-only record of one change — who, when, which member record or Club user, old values, new values, and the kind of change (create, edit, delete, role change). For a deleted member record, personal values are removed from its entries; the deletion entry keeps only the member number and member name.
- **Club user**: A person who signs in to use the registry, holding one or more Club roles (Admin, EC member, treasurer) and a preferred language. A Club user is not the same thing as a member record, although one person may be both.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An EC member can find a member by name or member number on a phone in under 10 seconds from typing the first character, with a register of at least 2,000 member records.
- **SC-002**: A first-time prospective member can complete self-registration on a phone in under 3 minutes, in either language.
- **SC-003**: An EC member can register a person on their behalf in under 3 minutes.
- **SC-004**: 100% of text on every screen of this feature is available in both English and Simplified Chinese, verified by an automated completeness check.
- **SC-005**: In tests with synthetic records, 100% of attempts to register or edit a record with an email or phone that belongs to another record are refused, and 100% of registrations that share only a name with an existing member succeed.
- **SC-006**: Every change to a member record or Club role, including every deletion, can be traced to who made it, when, and (for deletions) why, and 0 deleted records leave personal details other than the member number and name (in the deletion entry) behind in the register.
- **SC-007**: In role-based access tests, 0 restricted fields or actions are available to a role that is not permitted them (FR-025), and a visitor who is not signed in can reach 0 screens other than self-registration and sign-in.
- **SC-008**: After this feature is in use, the Club can answer "how many members are in the register?" from the system alone for every member registered through it.

## Assumptions

- **Single registration channel**: Paper registration is no longer used as a first step. Existing paper records are put into the Google Form / Google Sheet or the Microsoft Excel sheet, and those sources are transferred into the register by a later consolidation feature. Once consolidation is complete, this feature's registration form is the only channel for registering a new member.
- **Google Form until consolidation**: The Google Form keeps running alongside the new registration form until the later consolidation feature exists. That feature will transfer existing and new Google Sheet and Microsoft Excel rows, will detect and resolve duplicates among them, and must decide how to handle rows whose email or phone already belongs to a member record (FR-012). Automatically feeding Google Form submissions into the register is a goal for that later feature, not built here.
- Self-registrants do not get an account: submitting the form gives them no sign-in and no access to member information, including their own record (the confirmation shows only their new member number, FR-009). Members viewing or updating their own details is out of scope for this feature.
- Club users (Admins, EC members, treasurers) sign in with individual Google accounts as required by FR-029; shared logins are not used. The first Admin account is set up during deployment; after that, Admins assign Club roles.
- EC members, not a separate volunteer role, do member look-ups at events. Showing whether someone is an active member is a later feature.
- In the later payments feature, the treasurer and Admins check and mark payments; EC members do not. This feature only fixes the role names so that feature can rely on them.
- Member numbers are assigned in sequence as members register; their exact format is decided in planning.
- There is no separate "no longer participating" status. A member who stops taking part keeps their record and becomes an inactive member, which the membership fees feature derives from dues per fiscal year. Deletion is only for records that should not be in the register at all.
- The register is expected to hold a few thousand member records at most, used by a small number of Club users at a time.
- Reasonable phone formats are North American; numbers from other countries are accepted with a country code.
- **Where history of deleted records and Club roles is read**: change-history entries for an open member record are shown in the app (FR-025). Deletion entries and Club-role changes are kept in the change history and are read in the register's private spreadsheet by someone signed in as the Club account. No screen for them is part of this feature.
- **Out of scope**: membership dues, payments and payment confirmation; determining active / inactive member status; events and check-in; reports and birthday lists; exports for mass email; transferring the existing Google Sheet, Microsoft Excel sheet, or paper records, and detecting or merging duplicates among them; automatically feeding Google Form submissions into the register; any payment processing; recording individual family members; members managing their own records.
- **Dependencies**: The new terms listed in FR-021 were added to the glossary (both languages) on 2026-10-23; "Club user" and "Club role" were added on 2026-10-27. The Club confirmed the Chinese wording of all glossary terms on 2026-10-28. The technology stack is chosen in this feature's plan, as the first feature, per the constitution.
