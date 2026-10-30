// Change-history entries and the deletion plan (src/domain/history.ts): FR-016, FR-018; US3-AS2, US4-AS1…AS3,
// US5-AS2; research R3 (revised 2026-10-30).
// Entries name fields by their column keys (data-model.md). Creation stores every submitted field as new_value;
// an update lists the changed fields with old/new values; deletion = (a) append member_deleted with a reason code and
// no values or name, (b) purge every ChangeValues row of member N, (c) remove the Members row. Timestamps use the
// America/Halifax offset.
import {
  deletionPlan,
  type DeletionStep,
  type EntryMeta,
  formatTimestamp,
  type HistoryEntry,
  memberCreatedEntry,
  memberUpdatedEntry,
  rolesChangedEntry,
} from '../../src/domain/history';
import type { Member } from '../../src/domain/member';
import type { DeletionReasonCode } from '../../specs/001-member-registry/contracts/api-types';

const ISO_WITH_HALIFAX_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-0[34]:00$/;

// 2026-10-23 17:05:09 UTC = 14:05:09 ADT (-03:00).
const META: EntryMeta = {
  entryId: 'H00000001',
  at: new Date(Date.UTC(2026, 9, 23, 17, 5, 9)),
  actor: { kind: 'club_user', userId: 'U0001' },
  requestId: 'test-request-0001',
};

function testMember(overrides: Partial<Member> = {}): Member {
  return {
    memberNumber: 1042,
    nameEn: 'Test Person',
    nameZh: '测试人',
    membershipType: 'individual',
    email: 'test0042@example.org',
    phone: '(604) 555-0142',
    wechatId: 'test_wechat_42',
    birthday: { month: 3, day: 5 },
    registrationEvent: 'Test Spring Fair',
    registrationDate: '2026-10-23',
    privacyAckDate: '2026-10-23',
    note: '',
    createdAt: '2026-10-23T14:05:09-03:00',
    updatedAt: '2026-10-23T14:05:09-03:00',
    version: 1,
    ...overrides,
  };
}

describe('formatTimestamp', () => {
  it('FR-018 summer time is ISO 8601 with the -03:00 Halifax offset', () => {
    expect(formatTimestamp(new Date(Date.UTC(2026, 6, 1, 15, 30, 0)))).toBe('2026-07-01T12:30:00-03:00');
  });

  it('FR-018 winter time is ISO 8601 with the -04:00 Halifax offset', () => {
    expect(formatTimestamp(new Date(Date.UTC(2026, 0, 15, 16, 0, 59)))).toBe('2026-01-15T12:00:59-04:00');
  });

  it('FR-018 the local date is the Halifax date, not the UTC date', () => {
    expect(formatTimestamp(new Date(Date.UTC(2026, 10, 1, 2, 0, 0)))).toBe('2026-10-31T23:00:00-03:00');
  });
});

describe('memberCreatedEntry', () => {
  it('US3-AS2 FR-018 records who, when, the subject and the request', () => {
    const entry = memberCreatedEntry(META, testMember());
    expect(entry).toMatchObject({
      entryId: 'H00000001',
      recordedAt: '2026-10-23T14:05:09-03:00',
      actor: { kind: 'club_user', userId: 'U0001' },
      changeKind: 'member_created',
      subject: { kind: 'member', memberNumber: 1042 },
      requestId: 'test-request-0001',
    });
    expect(entry.recordedAt).toMatch(ISO_WITH_HALIFAX_OFFSET);
  });

  it('FR-018 self-registration is recorded as such', () => {
    const entry = memberCreatedEntry({ ...META, actor: { kind: 'self_registration' } }, testMember());
    expect(entry.actor).toEqual({ kind: 'self_registration' });
  });

  it('FR-018 every submitted field is stored as new_value with an empty old_value', () => {
    const entry = memberCreatedEntry(META, testMember());
    expect(entry.values).toEqual(
      expect.arrayContaining([
        { field: 'name_en', oldValue: '', newValue: 'Test Person' },
        { field: 'name_zh', oldValue: '', newValue: '测试人' },
        { field: 'membership_type', oldValue: '', newValue: 'individual' },
        { field: 'email', oldValue: '', newValue: 'test0042@example.org' },
        { field: 'phone', oldValue: '', newValue: '(604) 555-0142' },
        { field: 'wechat_id', oldValue: '', newValue: 'test_wechat_42' },
        { field: 'birthday_month', oldValue: '', newValue: '3' },
        { field: 'birthday_day', oldValue: '', newValue: '5' },
        { field: 'registration_event', oldValue: '', newValue: 'Test Spring Fair' },
        { field: 'privacy_ack_date', oldValue: '', newValue: '2026-10-23' },
      ]),
    );
    for (const value of entry.values) expect(value.oldValue).toBe('');
  });

  it('FR-018 fields_changed names exactly the fields that have values', () => {
    const entry = memberCreatedEntry(META, testMember());
    expect(entry.fieldsChanged.length).toBeGreaterThan(0);
    expect([...entry.fieldsChanged].sort()).toEqual(entry.values.map((v) => v.field).sort());
  });
});

describe('memberUpdatedEntry', () => {
  it('US4-AS1 a phone change records the field name and its old and new values', () => {
    const entry = memberUpdatedEntry(META, testMember(), testMember({ phone: '902-555-0142' }));
    expect(entry).toMatchObject({
      changeKind: 'member_updated',
      subject: { kind: 'member', memberNumber: 1042 },
      recordedAt: '2026-10-23T14:05:09-03:00',
      actor: { kind: 'club_user', userId: 'U0001' },
      fieldsChanged: ['phone'],
      values: [{ field: 'phone', oldValue: '(604) 555-0142', newValue: '902-555-0142' }],
    });
  });

  it('US4-AS2 a membership-type change is recorded', () => {
    const entry = memberUpdatedEntry(META, testMember(), testMember({ membershipType: 'family' }));
    expect(entry.fieldsChanged).toEqual(['membership_type']);
    expect(entry.values).toEqual([{ field: 'membership_type', oldValue: 'individual', newValue: 'family' }]);
  });

  it('US4-AS3 a Note change is recorded', () => {
    const entry = memberUpdatedEntry(META, testMember(), testMember({ note: 'Test note' }));
    expect(entry.fieldsChanged).toEqual(['note']);
    expect(entry.values).toEqual([{ field: 'note', oldValue: '', newValue: 'Test note' }]);
  });

  it('FR-018 several changed fields are all listed; unchanged and system fields are not', () => {
    const after = testMember({ email: 'test0043@example.org', note: 'Test note', version: 2 });
    const entry = memberUpdatedEntry(META, testMember(), after);
    expect([...entry.fieldsChanged].sort()).toEqual(['email', 'note']);
    expect(entry.values.map((v) => v.field).sort()).toEqual(['email', 'note']);
  });

  it('FR-018 clearing the birthday records both birthday columns with empty new values', () => {
    const entry = memberUpdatedEntry(META, testMember(), testMember({ birthday: null }));
    expect(entry.values).toEqual(
      expect.arrayContaining([
        { field: 'birthday_month', oldValue: '3', newValue: '' },
        { field: 'birthday_day', oldValue: '5', newValue: '' },
      ]),
    );
  });
});

describe('deletionPlan', () => {
  // A minimal model of the three sheets, used to check the effect of carrying out the plan step by step.
  interface Sheets {
    history: HistoryEntry[];
    values: { entryId: string; memberNumber: number | null; field: string }[];
    members: number[];
  }

  function earlierEntry(entryId: string, memberNumber: number, fields: string[]): HistoryEntry {
    return {
      entryId,
      recordedAt: '2026-10-01T10:00:00-03:00',
      actor: { kind: 'self_registration' },
      changeKind: 'member_created',
      subject: { kind: 'member', memberNumber },
      fieldsChanged: fields,
      requestId: `test-request-${entryId}`,
      reasonCode: null,
      values: fields.map((field) => ({ field, oldValue: '', newValue: `test value ${field}` })),
    };
  }

  function memberOf(entry: HistoryEntry): number | null {
    return entry.subject.kind === 'member' ? entry.subject.memberNumber : null;
  }

  function sheetsBefore(): Sheets {
    const history: HistoryEntry[] = [
      earlierEntry('H00000001', 1042, ['name_en', 'email', 'phone']),
      earlierEntry('H00000002', 1043, ['name_en', 'email']),
      { ...earlierEntry('H00000007', 1042, ['phone']), changeKind: 'member_updated' },
    ];
    const values = history.flatMap((entry) =>
      entry.values.map((v) => ({ entryId: entry.entryId, memberNumber: memberOf(entry), field: v.field })),
    );
    return { history, values, members: [1042, 1043] };
  }

  function carryOut(
    plan: DeletionStep[],
    sheets: Sheets,
    beforeStep: (step: DeletionStep, current: Sheets) => void = () => undefined,
  ): Sheets {
    for (const step of plan) {
      beforeStep(step, sheets);
      if (step.kind === 'append_history') {
        sheets.history.push(step.entry);
        const memberNumber = memberOf(step.entry);
        sheets.values.push(...step.entry.values.map((v) => ({ entryId: step.entry.entryId, memberNumber, field: v.field })));
      } else if (step.kind === 'purge_member_values') {
        sheets.values = sheets.values.filter((row) => row.memberNumber !== step.memberNumber);
      } else {
        sheets.members = sheets.members.filter((n) => n !== step.memberNumber);
      }
    }
    return sheets;
  }

  function hasDeletionEntry(sheets: Sheets, memberNumber: number): boolean {
    return sheets.history.some((e) => e.changeKind === 'member_deleted' && memberOf(e) === memberNumber);
  }

  it('US5-AS2 FR-018 order: append the deletion entry, then purge the member’s values, then remove the row', () => {
    const plan = deletionPlan(META, 1042, 'test_record');
    expect(plan.map((step) => step.kind)).toEqual(['append_history', 'purge_member_values', 'remove_member']);
    expect(plan.slice(1)).toEqual([
      { kind: 'purge_member_values', memberNumber: 1042 },
      { kind: 'remove_member', memberNumber: 1042 },
    ]);
  });

  it('FR-018 the deletion entry exists before any purge or removal', () => {
    const checked: string[] = [];
    carryOut(deletionPlan(META, 1042, 'spam'), sheetsBefore(), (step, current) => {
      if (step.kind !== 'append_history') {
        expect(hasDeletionEntry(current, 1042)).toBe(true);
        checked.push(step.kind);
      }
    });
    expect(checked).toEqual(['purge_member_values', 'remove_member']);
  });

  it('US5-AS2 afterwards no ChangeValues rows remain for the member; other members and earlier entries are untouched', () => {
    const before = sheetsBefore();
    const after = carryOut(deletionPlan(META, 1042, 'entered_by_mistake'), sheetsBefore());
    expect(after.values.filter((row) => row.memberNumber === 1042)).toEqual([]);
    expect(after.values).toEqual(before.values.filter((row) => row.memberNumber === 1043));
    expect(after.history.slice(0, before.history.length)).toEqual(before.history);
    expect(after.history).toHaveLength(before.history.length + 1);
    expect(hasDeletionEntry(after, 1042)).toBe(true);
    expect(after.members).toEqual([1043]);
  });

  it.each<DeletionReasonCode>(['test_record', 'spam', 'entered_by_mistake'])(
    'US5-AS2 FR-016 the deletion entry records member number, who, when and reason code %s, with no values',
    (reasonCode) => {
      expect(deletionPlan(META, 1042, reasonCode)[0]).toEqual({
        kind: 'append_history',
        entry: expect.objectContaining({
          entryId: 'H00000001',
          changeKind: 'member_deleted',
          subject: { kind: 'member', memberNumber: 1042 },
          actor: { kind: 'club_user', userId: 'U0001' },
          recordedAt: '2026-10-23T14:05:09-03:00',
          requestId: 'test-request-0001',
          reasonCode,
          values: [],
        }),
      });
    },
  );

  it('FR-016 reasonCode is null for every other change kind', () => {
    expect(memberCreatedEntry(META, testMember()).reasonCode).toBeNull();
    expect(memberUpdatedEntry(META, testMember(), testMember({ note: 'Test note' })).reasonCode).toBeNull();
    expect(rolesChangedEntry(META, 'U0002', ['ec_member'], ['treasurer']).reasonCode).toBeNull();
  });
});

describe('rolesChangedEntry', () => {
  it('FR-018 a role change records the Club user and keeps the old and new roles as values', () => {
    const entry = rolesChangedEntry(META, 'U0002', ['ec_member'], ['ec_member', 'treasurer']);
    expect(entry).toMatchObject({
      changeKind: 'roles_changed',
      subject: { kind: 'club_user', userId: 'U0002' },
      recordedAt: '2026-10-23T14:05:09-03:00',
      fieldsChanged: ['roles'],
      values: [{ field: 'roles', oldValue: 'ec_member', newValue: 'ec_member,treasurer' }],
    });
  });

  it('FR-018 removing every role records an empty new value', () => {
    const entry = rolesChangedEntry(META, 'U0002', ['treasurer'], []);
    expect(entry.values).toEqual([{ field: 'roles', oldValue: 'treasurer', newValue: '' }]);
  });
});
