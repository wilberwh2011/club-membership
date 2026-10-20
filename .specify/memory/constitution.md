# Calligraphy Art Club Membership Management System Constitution

## Core Principles

### I. Privacy First

Member personal data — names, contact details (email, phone, WeChat ID, address), birthdays,
and payment records — belongs to the members and the Club, not to the codebase.

- Real member data MUST NOT be committed to the repository in any form: source, fixtures, seed
  files, screenshots, documentation, exports, or commit messages.
- Real member data MUST NOT be written to application logs, error reports, or analytics. Logs
  MUST identify members only by opaque internal identifiers.
- Real member data MUST NOT be pasted into AI prompts, AI-assisted tools, issue trackers, or
  chat channels used for development.
- Development, testing, demos, and AI-assisted work MUST use synthetic data only. Synthetic data
  MUST be clearly fictitious (e.g., generated names, reserved example domains such as
  `example.org`).
- Imports of real data (e.g., from the existing Google Sheet or paper records) MUST happen only
  in the production environment, from files that are never placed inside the repository.
- Member personal data MUST be accessible only to authenticated users whose Club role requires
  it. The system SHOULD collect only the personal fields a specified feature actually uses.

**Review check**: repository scan finds no real personal data; log output in tests contains no
personal fields; every fixture is synthetic.

**Rationale**: The Club is a volunteer organization holding personal data on trust. A single
leak through a repo, log, or prompt cannot be undone.

### II. Record, Don't Process, Payments

The system is a ledger of payments, not a payment channel.

- The system MUST record payments: member, purpose (dues or event), amount, payment method
  (cash, e-Transfer, credit card, other), date, and an optional non-sensitive reference
  (e.g., an e-Transfer confirmation number).
- The system MUST record the treasurer's payment confirmation (到账确认) separately from the
  payment record itself, including who confirmed and when. A payment is unconfirmed until
  the treasurer confirms it.
- The system MUST NOT accept, store, transmit, or display card numbers (full or partial),
  card security codes, expiry dates, or bank account credentials. Input fields MUST NOT invite
  such data.
- The system MUST NOT integrate with payment processors, payment gateways, or banking APIs.

**Review check**: the data model contains no card or bank-credential fields; the dependency list
contains no payment-processor SDKs; confirmation state is distinct from payment state.

**Rationale**: Processing card payments brings regulatory and security obligations a volunteer
club cannot carry. Recording and confirming payments solves the actual problem in the brief:
knowing who has paid and whether the money arrived.

### III. Bilingual by Default

The system serves an English- and Chinese-speaking membership equally.

- Every user-facing string — labels, buttons, messages, validation errors, emails,
  notifications, and reports — MUST be available in English and Simplified Chinese.
- User-facing text MUST NOT be hard-coded in application logic or markup; it MUST be resolved
  from translation resources by key.
- Users MUST be able to switch language at any time, and the choice SHOULD persist for that user.
- A missing translation key in either language MUST fail an automated check before merge.
- Domain terms MUST follow `docs/brief/glossary.md`. New domain terms MUST be added to the
  glossary (both languages) before they appear in the UI.
- Dates, numbers, and currency MUST be formatted according to the selected language.

**Review check**: automated translation-completeness test passes; no literal UI strings in code
review; new terms appear in the glossary.

**Rationale**: Members communicate through both English email and Chinese WeChat groups. A
feature that works in only one language excludes part of the Club.

### IV. Auditable Money Trail

Anyone with the right role MUST be able to reconstruct how a payment or membership status
reached its current value.

- Every create, change, or confirmation of a payment, and every change to a member's
  membership status, MUST produce an audit record containing: who made the change (the
  authenticated user), when (timestamp with time zone), the entity affected, the old value,
  and the new value.
- Audit records MUST be append-only. They MUST NOT be edited or deleted through the
  application, and the application MUST NOT expose any path to do so.
- Corrections MUST be made by recording a new change (e.g., reversing or adjusting an entry),
  never by rewriting history.
- Payments and membership-status changes MUST NOT be hard-deleted; they MAY be voided, and the
  void itself is an audited change.
- The audit write MUST succeed or the underlying change MUST NOT be saved.

**Review check**: tests prove each money/status operation emits a matching audit record; tests
prove update and delete of audit records are rejected; no hard-delete path exists for payments.

**Rationale**: The brief's core failure is that no one can say who paid and who confirmed it.
An immutable trail protects both the treasurer and the members.

### V. Test-First (NON-NEGOTIABLE)

- Every acceptance criterion in a feature spec MUST be covered by at least one automated test,
  and each such test MUST reference the criterion it verifies.
- Tests MUST be written before the implementation they cover and MUST be observed failing
  before the implementation is written (Red → Green → Refactor).
- Principles I–IV and VII MUST have automated tests where the rule is mechanically checkable
  (synthetic-only fixtures, no card fields, translation completeness, audit immutability,
  phone-width layouts).
- A feature is not done while any of its acceptance-criterion tests is failing or missing.

**Review check**: the tasks list places test tasks before implementation tasks; every
acceptance criterion maps to a named test; commit history shows tests landing first or together
with a failing state recorded.

**Rationale**: Volunteers maintaining the system later need tests as the living specification
of what the Club agreed the system does.

### VI. Simplicity

- The system MUST be a single deployable application. Microservices, separately deployed
  backends per feature, and message buses MUST NOT be introduced.
- Every runtime dependency MUST be justified in the plan; dependencies SHOULD be mature, widely
  used, and actively maintained. Prefer the platform's standard capabilities over a new library.
- The system MUST be hostable on a free or low-cost hosting tier and MUST NOT require a paid
  third-party service to function.
- A volunteer with general web-development skills MUST be able to set up, run, test, and deploy
  the system by following the repository's documentation alone.
- Features not required by an approved spec MUST NOT be built (YAGNI).

**Review check**: plan's Complexity Tracking table justifies any added component or dependency;
quickstart documentation is verified on a clean environment.

**Rationale**: The Club has no paid IT staff. Whatever is built must outlive the people who
built it.

### VII. Mobile-Friendly Operations

- Treasurer workflows (recording and confirming payments, viewing who has paid) and event
  check-in workflows (finding a person, determining member vs. non-member price, recording
  attendance and payment) MUST be fully usable on a phone.
- These workflows MUST work at a viewport width of 360 CSS pixels without horizontal scrolling,
  with touch targets large enough for reliable tapping and text readable without zooming.
- Event check-in SHOULD let a volunteer find a person and record attendance in a small number
  of taps, and SHOULD tolerate slow or intermittent connectivity at venues.
- Other workflows (e.g., administration, reporting) SHOULD be usable on a phone and MUST be
  usable on a desktop browser.

**Review check**: automated layout tests at 360px width for treasurer and check-in screens;
manual walkthrough on a real phone before release of those workflows.

**Rationale**: Check-in happens at the door of an event, and cash is handed to the treasurer in
person. The tool must be in the hand of the person doing the work.

## Data & Security Constraints

- Technology choices (languages, frameworks, databases, hosting) are decided in each feature's
  plan, not in this constitution, and MUST satisfy every principle above.
- All traffic to the deployed system MUST be encrypted in transit. Production data and backups
  MUST be protected by access control, and backups MUST NOT be stored in the repository.
- Secrets (credentials, API keys, connection strings) MUST NOT be committed; they MUST be
  supplied through environment configuration, and an example configuration with placeholder
  values MUST be kept in the repository.
- Exports containing member personal data (e.g., CSV for mass email) MUST be restricted to
  authorized roles and SHOULD include only the fields needed for the stated purpose.
- The membership year, the definition of "active member", and pricing rules are business rules
  set by the Club and MUST be specified in feature specs, not assumed in code.

## Development Workflow & Quality Gates

- Work follows the Spec Kit flow: specify → clarify → plan → tasks → implement. Unclear
  requirements MUST be resolved in clarify, not guessed during implementation.
- Every plan MUST include a Constitution Check that evaluates the feature against Principles
  I–VII and the constraints above, both before research and again after design. Any violation
  MUST be either removed or recorded with justification in the plan's Complexity Tracking
  table; unjustified violations block the plan.
- Every change MUST be reviewed before merge. Reviewers MUST verify: tests precede and cover
  the change (V); no real personal data or secrets (I); no hard-coded UI text and complete
  translations (III); audit coverage for money and status changes (IV); no card data or
  processor integration (II).
- The automated test suite, including translation-completeness and audit-immutability checks,
  MUST pass before merge.

## Governance

- This constitution supersedes all other project practices, conventions, and documents. Where
  a spec, plan, or task conflicts with it, the constitution wins until it is amended.
- **Amendments**: proposed as a change to `.specify/memory/constitution.md` that states the
  reason, the affected principles, and the impact on existing specs, plans, and code. An
  amendment MUST be approved by the project owner (on behalf of the Club) before merge, and
  MUST include any needed migration steps for work already in progress.
- **Versioning** (semantic versioning, `MAJOR.MINOR.PATCH`):
  - MAJOR — a principle or governance rule is removed or redefined in a backward-incompatible
    way.
  - MINOR — a new principle or section is added, or guidance is materially expanded.
  - PATCH — clarifications, wording, or typo fixes with no change in meaning.
- **Compliance**: every plan MUST pass the Constitution Check described above; every review
  MUST confirm compliance with the principles. Added complexity MUST be justified in writing.
- The constitution SHOULD be reviewed at least once per membership year, or whenever the Club
  changes its privacy, payment, or language requirements.

**Version**: 1.0.0 | **Ratified**: 2026-10-20 | **Last Amended**: 2026-10-20
