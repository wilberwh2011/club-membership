// Member types, editable fields and diff (FR-002, FR-014; data-model.md "Domain types"). STUB: implemented in T033.
import type {
  Birthday,
  MemberChanges,
  MembershipType,
  MemberSummary,
  RegistrationInput,
} from '../../specs/001-member-registry/contracts/api-types';

export type { MembershipType, MemberSummary };

export type MemberInput = Omit<RegistrationInput, 'privacyAcknowledged'>;

export interface Member {
  memberNumber: number;
  nameEn: string;
  nameZh: string;
  membershipType: MembershipType;
  email: string;
  phone: string;
  wechatId: string;
  birthday: Birthday | null;
  registrationEvent: string;
  registrationDate: string; // YYYY-MM-DD
  privacyAckDate: string; // YYYY-MM-DD
  note: string;
  createdAt: string; // ISO 8601 with offset
  updatedAt: string; // ISO 8601 with offset
  version: number;
}

export type EditableField = keyof MemberChanges;

/** The only fields updateMember may change (data-model.md "Editable via the app"). STUB: empty until T033. */
export const EDITABLE_FIELDS: readonly EditableField[] = [];

export type ApplyChangesResult =
  | { ok: true; member: Member }
  | { ok: false; code: 'VALIDATION_FAILED'; rejectedKeys: string[] };

/** Merges a change set into a copy of the member; any non-editable or unknown key rejects the whole set. */
export const applyChanges: (member: Member, changes: MemberChanges) => ApplyChangesResult = () => {
  throw new Error('not implemented');
};

/** The editable fields whose values differ between the two records. */
export const diff: (old: Member, merged: Member) => EditableField[] = () => {
  throw new Error('not implemented');
};
