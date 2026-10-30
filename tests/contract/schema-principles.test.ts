// Spreadsheet schema principles (src/adapters/gas/schema.ts): FR-002, FR-006, Principle II.
// The Members columns are exactly data-model.md's; no sheet column and no RegistrationInput field is named like
// card or bank credentials or a birth year (pattern set by the owner 2026-10-30); sheets are in data-model.md
// "Sheet order".
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SHEETS } from '../../src/adapters/gas/schema';

const MEMBERS_COLUMNS = [
  'member_number',
  'name_en',
  'name_zh',
  'membership_type',
  'email',
  'phone',
  'wechat_id',
  'birthday_month',
  'birthday_day',
  'registration_event',
  'registration_date',
  'privacy_ack_date',
  'note',
  'created_at',
  'updated_at',
  'version',
  'email_key',
  'phone_key',
];

// Owner decision 2026-10-30: card/bank credentials and birth year only (payment_method, fiscal_year are allowed).
const FORBIDDEN_NAME =
  /card_number|\bcard\b|cvv|cvc|expiry|bank_account|account_number|routing|iban|birth_?year/i;

/** camelCase → snake_case, so `cardNumber` is checked as `card_number` (RegistrationInput fields are camelCase). */
function snakeCase(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

/** The names that look like card or bank credentials or a birth year. */
function forbiddenNames(names: readonly string[]): string[] {
  return names.filter((name) => FORBIDDEN_NAME.test(snakeCase(name)));
}

/** Field names of `interface RegistrationInput` in the contract, read from source (types do not exist at runtime). */
function registrationInputFields(): string[] {
  const source = readFileSync(join(__dirname, '../../specs/001-member-registry/contracts/api-types.ts'), 'utf8');
  const body = /export interface RegistrationInput \{([\s\S]*?)\n\}/.exec(source)?.[1] ?? '';
  return [...body.matchAll(/^\s*(\w+)\??:/gm)].map((match) => match[1]);
}

describe('schema', () => {
  it('Principle II sheets are in the order README, Members, ClubUsers, ChangeHistory, ChangeValues, Counters', () => {
    expect(SHEETS.map((sheet) => sheet.name)).toEqual([
      'README',
      'Members',
      'ClubUsers',
      'ChangeHistory',
      'ChangeValues',
      'Counters',
    ]);
  });

  it('FR-002 Members columns are exactly those in data-model.md, in order', () => {
    expect(SHEETS.find((sheet) => sheet.name === 'Members')?.columns.map((column) => column.key)).toEqual(
      MEMBERS_COLUMNS,
    );
  });

  it('FR-006 Principle II no column of any sheet is named like card or bank credentials or a birth year', () => {
    const keys = SHEETS.flatMap((sheet) => sheet.columns.map((column) => `${sheet.name}.${column.key}`));
    expect(keys).toEqual(expect.arrayContaining(['Members.member_number', 'Members.email']));
    expect(forbiddenNames(keys)).toEqual([]);
  });

  it('FR-006 Principle II no RegistrationInput field is named like card or bank credentials or a birth year', () => {
    const fields = registrationInputFields();
    expect(fields).toEqual(expect.arrayContaining(['email', 'phone', 'privacyAcknowledged']));
    expect(forbiddenNames(fields)).toEqual([]);
  });

  it('Principle II the field-name check reports cardNumber and birthYear in a sample', () => {
    const sample = ['nameEn', 'email', 'cardNumber', 'birthday', 'birthYear', 'phone'];
    expect(forbiddenNames(sample)).toEqual(['cardNumber', 'birthYear']);
  });

  it('Principle II payment_method and fiscal_year are allowed names', () => {
    expect(forbiddenNames(['payment_method', 'fiscal_year', 'paymentMethod', 'fiscalYear'])).toEqual([]);
  });
});
