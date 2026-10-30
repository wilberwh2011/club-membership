// Change-history entries and the deletion plan (FR-018; research R3; data-model.md ChangeHistory/ChangeValues).
// STUB: implemented in T034.
import type { DeletionReasonCode, HistoryValue, Role } from '../../specs/001-member-registry/contracts/api-types';
import type { Member } from './member';

export type Actor = { kind: 'club_user'; userId: string } | { kind: 'self_registration' } | { kind: 'system' };

export type ChangeKind = 'member_created' | 'member_updated' | 'member_deleted' | 'club_user_added' | 'roles_changed';

export type HistorySubject = { kind: 'member'; memberNumber: number } | { kind: 'club_user'; userId: string };

export interface HistoryEntry {
  entryId: string;
  recordedAt: string; // ISO 8601 with the America/Halifax offset
  actor: Actor;
  changeKind: ChangeKind;
  subject: HistorySubject;
  fieldsChanged: string[]; // column keys (snake_case), names only
  requestId: string;
  /** ChangeHistory.reason_code: set for member_deleted only, null for every other change kind (FR-016). */
  reasonCode: DeletionReasonCode | null;
  values: HistoryValue[]; // ChangeValues rows; field = column key; empty for member_deleted
}

/** What every entry builder needs besides the change itself; `at` is formatted with formatTimestamp. */
export interface EntryMeta {
  entryId: string;
  at: Date;
  actor: Actor;
  requestId: string;
}

export type DeletionStep =
  | { kind: 'append_history'; entry: HistoryEntry }
  | { kind: 'purge_member_values'; memberNumber: number }
  | { kind: 'remove_member'; memberNumber: number };

/** ISO 8601 with the America/Halifax offset, e.g. 2026-10-23T14:05:09-03:00. */
export const formatTimestamp: (instant: Date) => string = () => {
  throw new Error('not implemented');
};

export const memberCreatedEntry: (meta: EntryMeta, member: Member) => HistoryEntry = () => {
  throw new Error('not implemented');
};

export const memberUpdatedEntry: (meta: EntryMeta, old: Member, merged: Member) => HistoryEntry = () => {
  throw new Error('not implemented');
};

/**
 * Ordered steps, each safe to retry (research R3, revised 2026-10-30): (a) append the member_deleted entry (reason
 * code, no values, no name), (b) purge every ChangeValues row of the member, (c) remove the Members row.
 */
export const deletionPlan: (
  meta: EntryMeta,
  memberNumber: number,
  reasonCode: DeletionReasonCode,
) => DeletionStep[] = () => {
  throw new Error('not implemented');
};

export const rolesChangedEntry: (
  meta: EntryMeta,
  userId: string,
  oldRoles: readonly Role[],
  newRoles: readonly Role[],
) => HistoryEntry = () => {
  throw new Error('not implemented');
};
