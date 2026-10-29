// Search matching and ranking (src/domain/search.ts): FR-013; US2-AS1…AS5, US2-AS7; contracts/members.md
// "searchMembers" query-shape table:
//   only digits, length ≤ 6        → exact member number, or phone-key digit substring (≥ 4 digits)
//   contains @                     → case-insensitive email substring
//   digits with ()-. + punctuation → digits-only substring of the phone key (leading 1 / +1 removed);
//                                    a digits-only query longer than 6 is treated the same way
//   otherwise                      → NFKC, lowercase, whitespace-collapsed substring of name_en, name_zh or email
// Ranking: exact member-number match first, then member number ascending; at most 25 results with `truncated`.
// The spec's example names are prefixed "Test"/测试 so the file passes the synthetic-fixture scan.
import { matchMembers } from '../../src/domain/search';

type Summary = {
  memberNumber: number;
  nameEn: string;
  nameZh: string;
  membershipType: 'individual' | 'family';
  email: string;
  phone: string;
};

function member(memberNumber: number, overrides: Partial<Summary> = {}): Summary {
  const n = String(memberNumber % 100).padStart(2, '0');
  return {
    memberNumber,
    nameEn: `Test Person ${memberNumber}`,
    nameZh: '',
    membershipType: 'individual',
    email: `test${memberNumber}@example.org`,
    phone: `902-555-01${n}`,
    ...overrides,
  };
}

const MEI_LIN = member(1024, {
  nameEn: 'Test Mei Lin Example',
  nameZh: '测试林美',
  email: 'Mei.Lin@example.org',
  phone: '(604) 555-0123',
});
const MEMBERS = [member(1001), member(1002), MEI_LIN, member(1030, { nameZh: '测试王' })];

function numbersFor(query: string, members: Summary[] = MEMBERS): number[] {
  const result = matchMembers(members, query);
  expect(result.ok).toBe(true);
  return result.ok ? result.results.map((m: Summary) => m.memberNumber) : [];
}

describe('matchMembers', () => {
  it('US2-AS1 "1024" finds member 1024 by exact member number', () => {
    expect(numbersFor('1024')).toEqual([1024]);
  });

  it('US2-AS1 member number must match exactly, not as a prefix or substring', () => {
    expect(numbersFor('102')).toEqual([]);
    expect(numbersFor('10')).toEqual([]);
  });

  it('US2-AS1 a 4–6 digit query also matches phone digit substrings; the exact number comes first', () => {
    const members = [member(1001), member(1002), member(5550, { phone: '604-555-0199' })];
    expect(numbersFor('5550', members)).toEqual([5550, 1001, 1002]);
  });

  it('US2-AS4 fewer than 4 digits never match by phone', () => {
    expect(numbersFor('555')).toEqual([]);
  });

  it('US2-AS2 "mei lin" finds "Test Mei Lin Example" ignoring capitalization and extra spaces', () => {
    expect(numbersFor('mei lin')).toEqual([1024]);
    expect(numbersFor('  MEI   Lin ')).toEqual([1024]);
    expect(numbersFor('ＭＥＩ ＬＩＮ')).toEqual([1024]);
  });

  it('US2-AS3 "林" and "林美" find "测试林美" by Chinese substring', () => {
    expect(numbersFor('林')).toEqual([1024]);
    expect(numbersFor('林美')).toEqual([1024]);
  });

  it('US2-AS3 a Chinese query matches only records whose Chinese name contains it', () => {
    expect(numbersFor('测试')).toEqual([1024, 1030]);
  });

  it('US2-AS4 "555-0123" and "6045550123" find "(604) 555-0123"', () => {
    expect(numbersFor('555-0123')).toEqual([1024]);
    expect(numbersFor('6045550123')).toEqual([1024]);
  });

  it('US2-AS4 phone matching ignores brackets, spaces and a leading country code', () => {
    expect(numbersFor('(604) 555-0123')).toEqual([1024]);
    expect(numbersFor('+1 604 555 0123')).toEqual([1024]);
    expect(numbersFor('1-604-555-0123')).toEqual([1024]);
  });

  it('US2-AS5 "mei.lin@example.org" finds "Mei.Lin@example.org" ignoring capitalization', () => {
    expect(numbersFor('mei.lin@example.org')).toEqual([1024]);
    expect(numbersFor('MEI.LIN@EXAMPLE.ORG')).toEqual([1024]);
  });

  it('US2-AS5 an @ query is an email substring match', () => {
    expect(numbersFor('@example.org')).toEqual([1001, 1002, 1024, 1030]);
  });

  it('FR-013 a text query without @ also matches the email', () => {
    expect(numbersFor('mei.lin')).toEqual([1024]);
  });

  it('FR-013 results are sorted by member number ascending', () => {
    const shuffled = [member(1030), member(1002), MEI_LIN, member(1001)];
    expect(numbersFor('test person', shuffled)).toEqual([1001, 1002, 1030]);
  });

  it('FR-013 returns at most 25 results and sets truncated when there are more', () => {
    const many = Array.from({ length: 30 }, (_, i) => member(1001 + i));
    const result = matchMembers(many, 'test person');
    expect(result).toMatchObject({ ok: true, truncated: true });
    if (result.ok) {
      expect(result.results).toHaveLength(25);
      expect(result.results[0].memberNumber).toBe(1001);
      expect(result.results[24].memberNumber).toBe(1025);
    }
  });

  it('FR-013 exactly 25 matches is not truncated', () => {
    const exact = Array.from({ length: 25 }, (_, i) => member(1001 + i));
    expect(matchMembers(exact, 'test person')).toMatchObject({ ok: true, truncated: false });
  });

  it('US2-AS7 no matches gives an empty list, not an error', () => {
    expect(matchMembers(MEMBERS, 'nobody here')).toEqual({ ok: true, results: [], truncated: false });
  });

  it.each([
    ['empty', ''],
    ['blank', '   '],
    ['longer than 100 characters', 'x'.repeat(101)],
  ])('FR-013 %s query is VALIDATION_FAILED', (_label, query) => {
    expect(matchMembers(MEMBERS, query)).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
  });

  it('FR-013 a 100-character query is accepted (length counted after trimming)', () => {
    expect(matchMembers(MEMBERS, `  ${'x'.repeat(100)}  `)).toEqual({ ok: true, results: [], truncated: false });
  });
});
