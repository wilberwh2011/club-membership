// Duplicate rule (src/domain/duplicates.ts): FR-012; US1-AS6, US1-AS7, US3-AS3, US4-AS4, SC-005.
// An email (ignoring case) or a phone (ignoring formatting and a leading country code) may belong to at most one
// member record. findDuplicate reports which value matched (email before phone) and the existing member number.
// Deleted records are simply absent from `existing`; a matching name alone never matches.
import { findDuplicate } from '../../src/domain/duplicates';

const EXISTING = [
  { memberNumber: 1001, nameEn: 'Test Person 0001', email: 'Test0001@Example.org', phone: '(604) 555-0101' },
  { memberNumber: 1002, nameEn: 'Test Person 0002', email: 'test0002@example.org', phone: '+1 902 555 0102' },
];

describe('findDuplicate', () => {
  it('US1-AS6 email match ignores capitalization', () => {
    expect(findDuplicate({ email: 'TEST0001@example.ORG', phone: '604-555-0199' }, EXISTING)).toEqual({
      matched: 'email',
      memberNumber: 1001,
    });
  });

  it('US1-AS6 phone match ignores spaces, dashes, brackets and a leading country code', () => {
    for (const phone of ['902-555-0102', '(902) 555-0102', '9025550102', '1 902 555 0102']) {
      expect(findDuplicate({ email: 'test0099@example.org', phone }, EXISTING)).toEqual({
        matched: 'phone',
        memberNumber: 1002,
      });
    }
  });

  it('US3-AS3 email is reported before phone when both match the same record', () => {
    expect(findDuplicate({ email: 'test0002@example.org', phone: '902-555-0102' }, EXISTING)).toEqual({
      matched: 'email',
      memberNumber: 1002,
    });
  });

  it('US3-AS3 email is reported before phone when they match different records', () => {
    expect(findDuplicate({ email: 'test0002@example.org', phone: '604-555-0101' }, EXISTING)).toEqual({
      matched: 'email',
      memberNumber: 1002,
    });
  });

  it('US4-AS4 the record being edited is excluded, so keeping its own email and phone is not a duplicate', () => {
    expect(
      findDuplicate({ email: 'test0001@example.org', phone: '604-555-0101' }, EXISTING, { excludeMemberNumber: 1001 }),
    ).toBeNull();
  });

  it('US4-AS4 an edit to another record’s phone is still a duplicate', () => {
    expect(
      findDuplicate({ email: 'test0001@example.org', phone: '902-555-0102' }, EXISTING, { excludeMemberNumber: 1001 }),
    ).toEqual({ matched: 'phone', memberNumber: 1002 });
  });

  it('US1-AS7 a matching name with a different email and phone is not a duplicate', () => {
    const candidate = { nameEn: 'Test Person 0001', email: 'test0098@example.org', phone: '604-555-0198' };
    expect(findDuplicate(candidate, EXISTING)).toBeNull();
  });

  it('SC-005 no existing records means no duplicate', () => {
    expect(findDuplicate({ email: 'test0001@example.org', phone: '604-555-0101' }, [])).toBeNull();
  });

  it('FR-012 a phone or email whose key is null or empty never matches a record whose key is also null or empty', () => {
    const keyless = [
      { memberNumber: 1003, nameEn: 'Test Person 0003', email: '', phone: '' },
      { memberNumber: 1004, nameEn: 'Test Person 0004', email: '   ', phone: 'not a phone' },
    ];
    for (const phone of ['', '   ', 'not a phone', '12']) {
      expect(findDuplicate({ email: 'test0097@example.org', phone }, keyless)).toBeNull();
    }
    for (const email of ['', '   ']) {
      expect(findDuplicate({ email, phone: '604-555-0197' }, keyless)).toBeNull();
    }
    expect(findDuplicate({ email: '', phone: '' }, keyless)).toBeNull();
  });
});
