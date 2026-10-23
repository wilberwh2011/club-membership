// Contract types for the server functions called via google.script.run.
// Normative for feature 001-member-registry; implementation lives in src/server and src/domain.

export type Language = 'en' | 'zh-Hans';
export type Role = 'admin' | 'ec_member' | 'treasurer';
export type MembershipType = 'individual' | 'family';

export type Capability =
  | 'member.search'
  | 'member.viewContact'
  | 'member.viewDetails'
  | 'member.register'
  | 'member.edit'
  | 'member.delete'
  | 'clubUser.manage';

export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'ALREADY_REGISTERED'
  | 'DUPLICATE_EMAIL'
  | 'DUPLICATE_PHONE'
  | 'NOT_SIGNED_IN'
  | 'NOT_A_CLUB_USER'
  | 'SIGN_IN_FAILED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VERSION_CONFLICT'
  | 'LAST_ADMIN'
  | 'HAS_DEPENDENT_RECORDS'
  | 'FORM_EXPIRED'
  | 'RATE_LIMITED'
  | 'BUSY'
  | 'SAVE_FAILED'
  | 'INTERNAL';

export type FieldErrorCode =
  | 'required'
  | 'name_required'
  | 'email_invalid'
  | 'phone_invalid'
  | 'birthday_invalid'
  | 'too_long'
  | 'privacy_ack_required'
  | 'membership_type_invalid'
  | 'wechat_invalid'
  | 'reason_required'
  | 'confirmation_required'
  | 'roles_invalid';

export interface FieldError {
  field: string;
  code: FieldErrorCode;
}

export interface ApiError {
  code: ErrorCode;
  fields?: FieldError[];
  /** VERSION_CONFLICT: the latest record, for review. */
  current?: MemberDetail | ClubUserView;
  /** DUPLICATE_*: which value matched and the existing record (signed-in callers only). */
  matched?: 'email' | 'phone';
  memberNumber?: number;
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export interface Birthday {
  month: number; // 1..12
  day: number; // 1..31, valid for month; Feb 29 allowed
}

/** Fields on the registration form (FR-002 minus system fields and Note). */
export interface RegistrationInput {
  nameEn?: string;
  nameZh?: string;
  membershipType: MembershipType;
  email: string;
  phone: string;
  wechatId?: string;
  birthday?: Birthday;
  registrationEvent?: string; // default 'N/A'
  privacyAcknowledged: boolean;
}

export interface RegistrationRequest {
  input: RegistrationInput;
  submissionId: string; // UUID generated when the form is rendered; reused on retry
  formToken: string; // signed issued-at from doGet (public callers)
  honeypot: string; // must be empty
  language: Language;
}

export type RegistrationOutcome =
  /**
   * Success for both channels: the newly assigned member number and nothing else from the record (FR-009).
   * An identical resubmission (FR-010) returns the same memberNumber. The duplicate-registration response
   * (ALREADY_REGISTERED) is an error and carries no member data.
   */
  | { kind: 'created'; memberNumber: number }
  /** Honeypot hit only (R5): nothing stored, so no member number. */
  | { kind: 'received' };

export interface SessionInfo {
  userId: string;
  email: string;
  displayName: string;
  roles: Role[];
  capabilities: Capability[];
  language: Language;
}

export interface MemberSummary {
  memberNumber: number;
  nameEn: string;
  nameZh: string;
  membershipType: MembershipType;
  email: string;
  phone: string;
}

export interface HistoryValue {
  field: string;
  oldValue: string;
  newValue: string;
}

export interface HistoryEntryView {
  entryId: string;
  recordedAt: string; // ISO 8601 with offset
  actor: { kind: 'club_user'; userId: string; displayName: string } | { kind: 'self_registration' } | { kind: 'system' };
  changeKind: 'member_created' | 'member_updated' | 'member_deleted' | 'club_user_added' | 'roles_changed';
  fieldsChanged: string[];
  values: HistoryValue[]; // empty when redacted
}

export interface MemberDetail extends MemberSummary {
  wechatId: string;
  birthday: Birthday | null;
  registrationEvent: string;
  registrationDate: string; // YYYY-MM-DD
  privacyAckDate: string; // YYYY-MM-DD
  note: string;
  version: number;
  history: HistoryEntryView[];
}

/** Editable fields; omitted fields are unchanged. `birthday: null` clears it. */
export interface MemberChanges {
  nameEn?: string;
  nameZh?: string;
  membershipType?: MembershipType;
  email?: string;
  phone?: string;
  wechatId?: string;
  birthday?: Birthday | null;
  registrationEvent?: string;
  note?: string;
}

export interface ClubUserView {
  userId: string;
  email: string;
  displayName: string;
  roles: Role[];
  hasSignedIn: boolean;
  version: number;
}

/** Signatures of every function callable via google.script.run. */
export interface ServerApi {
  // public
  beginSignIn(clientNonce: string): Result<{ authUrl: string }>;
  submitRegistration(sessionToken: string | null, request: RegistrationRequest): Result<RegistrationOutcome>;
  // session
  whoAmI(sessionToken: string): Result<SessionInfo>;
  signOut(sessionToken: string): Result<null>;
  setLanguage(sessionToken: string, language: Language): Result<null>;
  // members
  searchMembers(sessionToken: string, query: string): Result<{ results: MemberSummary[]; truncated: boolean }>;
  countMembers(sessionToken: string): Result<{ count: number }>;
  getMember(sessionToken: string, memberNumber: number): Result<MemberDetail>;
  updateMember(
    sessionToken: string,
    memberNumber: number,
    expectedVersion: number,
    changes: MemberChanges,
  ): Result<MemberDetail>;
  deleteMember(
    sessionToken: string,
    memberNumber: number,
    expectedVersion: number,
    reason: string,
    confirmed: boolean,
  ): Result<null>;
  // club users
  listClubUsers(sessionToken: string): Result<ClubUserView[]>;
  addClubUser(sessionToken: string, email: string, displayName: string, roles: Role[]): Result<ClubUserView>;
  setClubUserRoles(
    sessionToken: string,
    userId: string,
    expectedVersion: number,
    roles: Role[],
  ): Result<ClubUserView>;
}
