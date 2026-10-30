// Member field validation (src/domain/validation.ts): FR-004, FR-006, FR-007; US1-AS3, US1-AS8, US3-AS1; research R9.
// validateRegistration checks a registration form (both channels use the same rules, US3-AS1);
// validateMemberFields checks the same fields plus the Note, without the privacy acknowledgment (used by edits).
// Errors are returned all at once as {field, code}; field names are the RegistrationInput keys, and the
// "at least one name" rule is reported on the pseudo-field `name`.
import { validateMemberFields, validateRegistration } from '../../src/domain/validation';

function form(overrides: Record<string, unknown> = {}) {
  return {
    nameEn: 'Test Person 0001',
    nameZh: '测试一',
    membershipType: 'individual',
    email: 'test0001@example.org',
    phone: '(604) 555-0101',
    privacyAcknowledged: true,
    ...overrides,
  } as Parameters<typeof validateRegistration>[0];
}

function errorsOf(result: ReturnType<typeof validateRegistration> | ReturnType<typeof validateMemberFields>) {
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.errors;
}

describe('validateRegistration', () => {
  it('US1-AS3 a complete form without WeChat ID and birthday is valid', () => {
    expect(validateRegistration(form()).ok).toBe(true);
  });

  it('US1-AS8 returns every error at once as {field, code}', () => {
    const errors = errorsOf(
      validateRegistration(
        form({ nameEn: '', nameZh: '', email: 'not-an-email', phone: '12', privacyAcknowledged: false }),
      ),
    );
    expect(errors).toHaveLength(4);
    expect(errors).toEqual(
      expect.arrayContaining([
        { field: 'name', code: 'name_required' },
        { field: 'email', code: 'email_invalid' },
        { field: 'phone', code: 'phone_invalid' },
        { field: 'privacyAcknowledged', code: 'privacy_ack_required' },
      ]),
    );
  });

  it('US1-AS8 name_required when both names are empty or blank', () => {
    expect(errorsOf(validateRegistration(form({ nameEn: '   ', nameZh: undefined })))).toEqual([
      { field: 'name', code: 'name_required' },
    ]);
  });

  it('FR-004 one name in either language is enough', () => {
    expect(validateRegistration(form({ nameZh: '' })).ok).toBe(true);
    expect(validateRegistration(form({ nameEn: '' })).ok).toBe(true);
  });

  it('US1-AS8 required for missing email, phone and membership type', () => {
    expect(errorsOf(validateRegistration(form({ email: '', phone: '  ', membershipType: undefined })))).toEqual(
      expect.arrayContaining([
        { field: 'email', code: 'required' },
        { field: 'phone', code: 'required' },
        { field: 'membershipType', code: 'required' },
      ]),
    );
  });

  it.each([
    ['no @', 'test0001example.org'],
    ['two @', 'test@0001@example.org'],
    ['empty local part', '@example.org'],
    ['domain without a dot', 'test0001@example'],
    ['space inside', 'test 0001@example.org'],
  ])('US1-AS8 email_invalid: %s', (_label, email) => {
    expect(errorsOf(validateRegistration(form({ email })))).toEqual([{ field: 'email', code: 'email_invalid' }]);
  });

  it('US1-AS8 phone_invalid for a value that is not a NANP or + international number', () => {
    expect(errorsOf(validateRegistration(form({ phone: '555-0123' })))).toEqual([
      { field: 'phone', code: 'phone_invalid' },
    ]);
  });

  it('FR-006 membership_type_invalid for anything but individual or family', () => {
    expect(validateRegistration(form({ membershipType: 'family' })).ok).toBe(true);
    expect(errorsOf(validateRegistration(form({ membershipType: 'student' })))).toEqual([
      { field: 'membershipType', code: 'membership_type_invalid' },
    ]);
  });

  it('US1-AS8 privacy_ack_required when the privacy statement is not acknowledged', () => {
    expect(errorsOf(validateRegistration(form({ privacyAcknowledged: false })))).toEqual([
      { field: 'privacyAcknowledged', code: 'privacy_ack_required' },
    ]);
    expect(errorsOf(validateRegistration(form({ privacyAcknowledged: undefined })))).toEqual([
      { field: 'privacyAcknowledged', code: 'privacy_ack_required' },
    ]);
  });

  it.each([
    ['nameEn', 100, 'Test ' + 'x'.repeat(95)],
    ['nameZh', 50, '测试' + '一'.repeat(48)],
    ['wechatId', 50, 'test_' + 'w'.repeat(45)],
    ['registrationEvent', 100, 'Test event ' + 'e'.repeat(89)],
  ])('FR-006 %s accepts %p characters and rejects one more as too_long', (field, max, atMax) => {
    expect(atMax).toHaveLength(max);
    expect(validateRegistration(form({ [field]: atMax })).ok).toBe(true);
    expect(errorsOf(validateRegistration(form({ [field]: atMax + 'z' })))).toEqual([{ field, code: 'too_long' }]);
  });

  it('FR-006 email accepts 254 characters and rejects 255 as too_long', () => {
    const local254 = 'x'.repeat(254 - '@example.org'.length);
    expect(validateRegistration(form({ email: `${local254}@example.org` })).ok).toBe(true);
    expect(errorsOf(validateRegistration(form({ email: `${local254}x@example.org` })))).toEqual([
      { field: 'email', code: 'too_long' },
    ]);
  });

  it('FR-006 phone longer than 30 characters is too_long', () => {
    const phone = '+1 (604) 555-0101'.padEnd(31, '.');
    expect(phone).toHaveLength(31);
    expect(errorsOf(validateRegistration(form({ phone })))).toEqual([{ field: 'phone', code: 'too_long' }]);
  });

  it('FR-006 wechat_invalid when the WeChat ID has an internal space', () => {
    expect(errorsOf(validateRegistration(form({ wechatId: 'test wechat' })))).toEqual([
      { field: 'wechatId', code: 'wechat_invalid' },
    ]);
  });

  it('US1-AS5 an impossible birthday is birthday_invalid on the birthday field', () => {
    expect(errorsOf(validateRegistration(form({ birthday: { month: 2, day: 30 } })))).toEqual([
      { field: 'birthday', code: 'birthday_invalid' },
    ]);
  });

  it('US1-AS3 empty WeChat ID and birthday are valid', () => {
    const result = validateRegistration(form({ wechatId: '', birthday: undefined }));
    expect(result).toMatchObject({ ok: true, value: { wechatId: '', birthday: null } });
  });

  it('FR-004 registration event defaults to N/A when empty', () => {
    expect(validateRegistration(form())).toMatchObject({ ok: true, value: { registrationEvent: 'N/A' } });
    expect(validateRegistration(form({ registrationEvent: '  ' }))).toMatchObject({
      ok: true,
      value: { registrationEvent: 'N/A' },
    });
    expect(validateRegistration(form({ registrationEvent: 'Test Spring Fair' }))).toMatchObject({
      ok: true,
      value: { registrationEvent: 'Test Spring Fair' },
    });
  });

  it('FR-004 values are trimmed and the English name has whitespace collapsed', () => {
    const result = validateRegistration(
      form({
        nameEn: '  Test   Person  0001 ',
        nameZh: ' 测试一 ',
        email: ' test0001@example.org ',
        phone: ' (604) 555-0101 ',
        wechatId: ' test_wechat_01 ',
        registrationEvent: ' Test Spring Fair ',
      }),
    );
    expect(result).toMatchObject({
      ok: true,
      value: {
        nameEn: 'Test Person 0001',
        nameZh: '测试一',
        email: 'test0001@example.org',
        phone: '(604) 555-0101',
        wechatId: 'test_wechat_01',
        registrationEvent: 'Test Spring Fair',
      },
    });
  });

  it('FR-004 length limits apply to trimmed values', () => {
    expect(validateRegistration(form({ nameZh: `  测试${'一'.repeat(48)}  ` })).ok).toBe(true);
  });
});

describe('validateMemberFields', () => {
  it('US3-AS1 applies the same field rules as registration', () => {
    const fields = { ...form({ email: 'test0001example.org' }) } as Record<string, unknown>;
    delete fields.privacyAcknowledged;
    expect(errorsOf(validateMemberFields(fields as Parameters<typeof validateMemberFields>[0]))).toEqual([
      { field: 'email', code: 'email_invalid' },
    ]);
  });

  it('FR-007 does not require the privacy acknowledgment (edits of existing records)', () => {
    const fields = { ...form() } as Record<string, unknown>;
    delete fields.privacyAcknowledged;
    expect(validateMemberFields(fields as Parameters<typeof validateMemberFields>[0]).ok).toBe(true);
  });

  it('FR-006 note accepts 2,000 characters and rejects 2,001 as too_long', () => {
    const fields = { ...form() } as Record<string, unknown>;
    delete fields.privacyAcknowledged;
    const valid = { ...fields, note: 'n'.repeat(2000) } as Parameters<typeof validateMemberFields>[0];
    const tooLong = { ...fields, note: 'n'.repeat(2001) } as Parameters<typeof validateMemberFields>[0];
    expect(validateMemberFields(valid).ok).toBe(true);
    expect(errorsOf(validateMemberFields(tooLong))).toEqual([{ field: 'note', code: 'too_long' }]);
  });
});
