// Birthday month/day rule (FR-005; research R9). STUB: implemented in T028.
import type { Birthday } from '../../specs/001-member-registry/contracts/api-types';

/** Raw month/day as submitted; both empty means no birthday. */
export interface BirthdayInput {
  month?: number | null;
  day?: number | null;
}

export type BirthdayResult = { ok: true; birthday: Birthday | null } | { ok: false; code: 'birthday_invalid' };

export const parseBirthday: (input: BirthdayInput) => BirthdayResult = () => {
  throw new Error('not implemented');
};
