// Duplicate rule (FR-012). STUB: implemented in T030.
import type { MemberSummary } from '../../specs/001-member-registry/contracts/api-types';

export type DuplicateCandidate = Pick<MemberSummary, 'email' | 'phone'>;
export type ExistingContact = Pick<MemberSummary, 'memberNumber' | 'email' | 'phone'>;

export interface DuplicateMatch {
  matched: 'email' | 'phone';
  memberNumber: number;
}

export interface DuplicateOptions {
  /** The record being edited; never a duplicate of itself. */
  excludeMemberNumber?: number;
}

export const findDuplicate: (
  candidate: DuplicateCandidate,
  existing: readonly ExistingContact[],
  options?: DuplicateOptions,
) => DuplicateMatch | null = () => {
  throw new Error('not implemented');
};
