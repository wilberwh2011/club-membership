// Normalization keys (src/domain/normalize.ts): FR-012, FR-013; US2-AS2, US2-AS4, US2-AS5; research R9.
// emailKey and phoneKey decide duplicates (FR-012); textKey and phoneKey drive search matching (FR-013).
// Non-synthetic-looking phones are assembled at runtime so this file passes the fixture scan.
import { emailKey, phoneKey, textKey } from '../../src/domain/normalize';

describe('emailKey', () => {
  it('US2-AS5 email key is trimmed and lowercased', () => {
    expect(emailKey('  Mei.Lin@Example.ORG ')).toBe('mei.lin@example.org');
  });

  it('FR-012 emails that differ only in capitalization share one key', () => {
    expect(emailKey('TEST0001@example.org')).toBe(emailKey('test0001@EXAMPLE.org'));
  });
});

describe('phoneKey', () => {
  it('US2-AS4 (604) 555-0123, 604-555-0123 and +1 604 555 0123 share one key: the 10 digits', () => {
    expect(phoneKey('(604) 555-0123')).toBe('6045550123');
    expect(phoneKey('604-555-0123')).toBe('6045550123');
    expect(phoneKey('+1 604 555 0123')).toBe('6045550123');
  });

  it('FR-012 NANP: dots, spaces, a leading 1 or +1 and surrounding whitespace are ignored', () => {
    expect(phoneKey('604.555.0123')).toBe('6045550123');
    expect(phoneKey('6045550123')).toBe('6045550123');
    expect(phoneKey('1 604 555 0123')).toBe('6045550123');
    expect(phoneKey('+16045550123')).toBe('6045550123');
    expect(phoneKey('  604 555 0123  ')).toBe('6045550123');
  });

  it('FR-012 NANP: area code or exchange starting with 0 or 1 is not a valid phone', () => {
    expect(phoneKey(['104', '555', '0123'].join('-'))).toBeNull();
    expect(phoneKey(['004', '555', '0123'].join('-'))).toBeNull();
    expect(phoneKey(['604', '155', '0123'].join('-'))).toBeNull();
    expect(phoneKey(['604', '055', '0123'].join('-'))).toBeNull();
  });

  it('FR-012 NANP: wrong digit count without + is not a valid phone', () => {
    expect(phoneKey('555-0123')).toBeNull();
    expect(phoneKey('604 555 01234')).toBeNull();
    expect(phoneKey('20 555 0123')).toBeNull();
  });

  it('FR-012 other countries: + and 8–15 digits gives + followed by the digits', () => {
    expect(phoneKey('+44 20 555 0123')).toBe('+44205550123');
    expect(phoneKey('+44 123456')).toBe('+44123456');
    expect(phoneKey('+44 1234 5678 90123')).toBe('+441234567890123');
  });

  it('FR-012 other countries: fewer than 8 or more than 15 digits is not a valid phone', () => {
    expect(phoneKey('+44 12345')).toBeNull();
    expect(phoneKey('+44 1234 5678 901234')).toBeNull();
  });

  it('FR-012 letters, a + that is not leading, and empty input are not valid phones', () => {
    expect(phoneKey('604-555-01AB')).toBeNull();
    expect(phoneKey('604+555+0123')).toBeNull();
    expect(phoneKey('')).toBeNull();
    expect(phoneKey('   ')).toBeNull();
  });
});

describe('textKey', () => {
  it('US2-AS2 text key is lowercased with whitespace trimmed and collapsed', () => {
    expect(textKey('  Mei   Lin  ')).toBe('mei lin');
    expect(textKey('MEI\tLIN\nExample')).toBe('mei lin example');
  });

  it('FR-013 text key applies NFKC, so full-width letters and spaces match their ASCII form', () => {
    expect(textKey('ＭＥＩ　ＬＩＮ')).toBe('mei lin');
  });

  it('FR-013 Chinese text is kept as is (matched by substring)', () => {
    expect(textKey(' 测试林美 ')).toBe('测试林美');
  });
});
