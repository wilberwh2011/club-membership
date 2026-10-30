// Member field validation (FR-004, FR-006, FR-007; research R9). STUB: implemented in T029.
import type {
  Birthday,
  FieldError,
  MembershipType,
  RegistrationInput,
} from '../../specs/001-member-registry/contracts/api-types';

/** Member fields as edited by Club users: the registration fields plus the Note, without the privacy acknowledgment. */
export type MemberFieldsInput = Omit<RegistrationInput, 'privacyAcknowledged'> & { note?: string };

/** Trimmed, defaulted values ready to store. */
export interface ValidMemberFields {
  nameEn: string;
  nameZh: string;
  membershipType: MembershipType;
  email: string;
  phone: string;
  wechatId: string;
  birthday: Birthday | null;
  registrationEvent: string;
  note: string;
}

export type ValidationResult = { ok: true; value: ValidMemberFields } | { ok: false; errors: FieldError[] };

export const validateRegistration: (input: RegistrationInput) => ValidationResult = () => {
  throw new Error('not implemented');
};

export const validateMemberFields: (input: MemberFieldsInput) => ValidationResult = () => {
  throw new Error('not implemented');
};
