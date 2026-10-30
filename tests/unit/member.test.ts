// Member editable fields, applyChanges and diff (src/domain/member.ts): FR-002, FR-014; US4-AS5.
// Editable fields are data-model.md "Editable via the app" in camelCase (birthday_month/birthday_day = `birthday`).
// A change set with any non-editable or unknown key is rejected as a whole (contracts/members.md updateMember).
import { applyChanges, diff, EDITABLE_FIELDS, type Member } from '../../src/domain/member';
import type { MemberChanges } from '../../specs/001-member-registry/contracts/api-types';

function testMember(overrides: Partial<Member> = {}): Member {
  return {
    memberNumber: 1001,
    nameEn: 'Test Person 0001',
    nameZh: '测试一',
    membershipType: 'individual',
    email: 'test0001@example.org',
    phone: '(604) 555-0101',
    wechatId: 'test_wechat_01',
    birthday: { month: 3, day: 5 },
    registrationEvent: 'N/A',
    registrationDate: '2026-10-01',
    privacyAckDate: '2026-10-01',
    note: '',
    createdAt: '2026-10-01T10:00:00-03:00',
    updatedAt: '2026-10-01T10:00:00-03:00',
    version: 1,
    ...overrides,
  };
}

describe('EDITABLE_FIELDS', () => {
  it('FR-014 editable fields are exactly the nine in data-model.md', () => {
    expect([...EDITABLE_FIELDS].sort()).toEqual(
      [
        'nameEn',
        'nameZh',
        'membershipType',
        'email',
        'phone',
        'wechatId',
        'birthday',
        'registrationEvent',
        'note',
      ].sort(),
    );
  });

  it('US4-AS5 the member number, dates and system fields are not editable', () => {
    expect(EDITABLE_FIELDS.length).toBeGreaterThan(0);
    for (const field of ['memberNumber', 'registrationDate', 'privacyAckDate', 'createdAt', 'updatedAt', 'version']) {
      expect(EDITABLE_FIELDS).not.toContain(field);
    }
  });
});

describe('applyChanges', () => {
  it('FR-014 applies the given editable fields and leaves every other field unchanged', () => {
    const before = testMember();
    const result = applyChanges(before, { phone: '902-555-0102', membershipType: 'family', note: 'Test note' });
    expect(result).toEqual({
      ok: true,
      member: { ...before, phone: '902-555-0102', membershipType: 'family', note: 'Test note' },
    });
  });

  it('FR-014 does not modify the record it was given', () => {
    const before = testMember();
    const snapshot = structuredClone(before);
    applyChanges(before, { email: 'test0002@example.org' });
    expect(before).toEqual(snapshot);
  });

  it('FR-014 an empty change set returns the record unchanged', () => {
    expect(applyChanges(testMember(), {})).toEqual({ ok: true, member: testMember() });
  });

  it('FR-014 birthday: null clears the birthday', () => {
    expect(applyChanges(testMember(), { birthday: null })).toEqual({
      ok: true,
      member: testMember({ birthday: null }),
    });
  });

  it.each(['memberNumber', 'registrationDate', 'privacyAckDate'])(
    'US4-AS5 a change set containing %s is rejected',
    (key) => {
      const changes = { phone: '902-555-0102', [key]: key === 'memberNumber' ? 1002 : '2026-10-02' } as MemberChanges;
      const result = applyChanges(testMember(), changes);
      expect(result).toEqual({ ok: false, code: 'VALIDATION_FAILED', rejectedKeys: [key] });
    },
  );

  it.each(['version', 'createdAt', 'updatedAt', 'birthYear', 'address', 'unknownField'])(
    'FR-002 a change set with the non-editable or unknown key %s is rejected',
    (key) => {
      const result = applyChanges(testMember(), { [key]: 'x' } as MemberChanges);
      expect(result).toEqual({ ok: false, code: 'VALIDATION_FAILED', rejectedKeys: [key] });
    },
  );
});

describe('diff', () => {
  it('FR-014 lists only the fields that changed', () => {
    const before = testMember();
    const after = testMember({ phone: '902-555-0102', note: 'Test note' });
    expect([...diff(before, after)].sort()).toEqual(['note', 'phone']);
  });

  it('FR-014 identical records have no changes', () => {
    expect(diff(testMember(), testMember())).toEqual([]);
  });

  it('FR-014 a birthday with the same month and day is unchanged; a different or cleared birthday is a change', () => {
    expect(diff(testMember(), testMember({ birthday: { month: 3, day: 5 } }))).toEqual([]);
    expect(diff(testMember(), testMember({ birthday: { month: 3, day: 6 } }))).toEqual(['birthday']);
    expect(diff(testMember(), testMember({ birthday: null }))).toEqual(['birthday']);
  });

  it('FR-014 non-editable fields such as version and updatedAt are never listed', () => {
    const after = testMember({ version: 2, updatedAt: '2026-10-02T10:00:00-03:00' });
    expect(diff(testMember(), after)).toEqual([]);
  });
});
