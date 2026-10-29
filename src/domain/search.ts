// Search matching and ranking (FR-013; contracts/members.md "searchMembers"). STUB: implemented in T031.
import type { MemberSummary } from '../../specs/001-member-registry/contracts/api-types';

export type SearchResult =
  | { ok: true; results: MemberSummary[]; truncated: boolean }
  | { ok: false; code: 'VALIDATION_FAILED' };

export const matchMembers: (members: readonly MemberSummary[], query: string) => SearchResult = () => {
  throw new Error('not implemented');
};
