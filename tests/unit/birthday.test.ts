// Birthday month/day rule (src/domain/birthday.ts): FR-005; US1-AS5; research R9.
// Month 1–12; day valid for the month using a fixed leap-year table (February has 29); no year is stored.
import { parseBirthday } from '../../src/domain/birthday';

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

describe('parseBirthday', () => {
  it('US1-AS5 accepts February 29', () => {
    expect(parseBirthday({ month: 2, day: 29 })).toEqual({ ok: true, birthday: { month: 2, day: 29 } });
  });

  it('US1-AS5 accepts the last day of every month', () => {
    DAYS_IN_MONTH.forEach((days, index) => {
      expect(parseBirthday({ month: index + 1, day: days })).toEqual({
        ok: true,
        birthday: { month: index + 1, day: days },
      });
    });
  });

  it.each([
    [2, 30],
    [4, 31],
    [6, 31],
    [9, 31],
    [11, 31],
    [13, 1],
    [0, 5],
    [1, 0],
    [1, 32],
    [-1, 5],
    [2.5, 5],
    [3, 1.5],
  ])('US1-AS5 rejects impossible date month=%p day=%p as birthday_invalid', (month, day) => {
    expect(parseBirthday({ month, day })).toEqual({ ok: false, code: 'birthday_invalid' });
  });

  it('US1-AS5 month and day both empty is valid and means no birthday', () => {
    expect(parseBirthday({})).toEqual({ ok: true, birthday: null });
    expect(parseBirthday({ month: null, day: null })).toEqual({ ok: true, birthday: null });
  });

  it('US1-AS5 month without day, or day without month, is birthday_invalid', () => {
    expect(parseBirthday({ month: 3 })).toEqual({ ok: false, code: 'birthday_invalid' });
    expect(parseBirthday({ day: 5 })).toEqual({ ok: false, code: 'birthday_invalid' });
    expect(parseBirthday({ month: 3, day: null })).toEqual({ ok: false, code: 'birthday_invalid' });
  });

  it('US1-AS5 no year is kept: the result holds only month and day', () => {
    const withYear = { month: 3, day: 5, year: 1990 } as unknown as Parameters<typeof parseBirthday>[0];
    const result = parseBirthday(withYear);
    expect(result).toEqual({ ok: true, birthday: { month: 3, day: 5 } });
    if (result.ok && result.birthday) expect(Object.keys(result.birthday).sort()).toEqual(['day', 'month']);
  });
});
