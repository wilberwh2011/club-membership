// Synthetic member fixtures (constitution Principle I): test names, example.org emails, 555-01xx phones.
// Pure and deterministic: the same options always produce the same members.

export type SyntheticMember = {
  nameEn: string;
  nameZh: string;
  membershipType: 'individual' | 'family';
  email: string;
  phone: string;
  wechatId?: string;
  birthday?: { month: number; day: number };
  registrationEvent: string;
};

export type SyntheticOptions = { n?: number; seed?: number };

// Every Chinese test name contains 测试 ("test") so the fixture scan can recognise it.
export const CHINESE_TEST_NAMES: readonly string[] = [
  '测试甲', '测试乙', '测试丙', '测试丁', '测试戊', '测试己',
  '测试庚', '测试辛', '测试壬', '测试癸', '测试会员', '测试人员',
];

// NANP area codes; member i gets AREA_CODES[i % length] and line 555-01xx with xx = floor(i / length),
// so every phone (and phone_key) is unique up to 100 × AREA_CODES.length members.
export const AREA_CODES: readonly string[] = [
  '204', '226', '236', '249', '250', '263', '289', '306', '343', '354', '365', '367', '368', '382',
  '403', '416', '418', '428', '431', '437', '438', '450', '468', '474', '506', '514', '519', '548',
  '579', '581', '584', '587', '604', '613', '639', '647', '672', '683', '705', '709', '742', '753',
  '778', '780', '782', '807', '819', '825', '867', '873', '879', '902', '905',
];

export const MAX_MEMBERS = 100 * AREA_CODES.length;

const REGISTRATION_EVENTS: readonly string[] = ['N/A', 'N/A', 'N/A', 'Test Spring Event', 'Test AGM'];
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// mulberry32: small seeded PRNG returning floats in [0, 1).
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function syntheticPhone(index: number): string {
  const area = AREA_CODES[index % AREA_CODES.length];
  const line = 100 + Math.floor(index / AREA_CODES.length);
  return `${area}-555-0${line}`;
}

export function generateSyntheticMembers(options: SyntheticOptions = {}): SyntheticMember[] {
  const n = options.n ?? 3000;
  if (!Number.isInteger(n) || n < 0 || n > MAX_MEMBERS) {
    throw new RangeError(`n must be an integer from 0 to ${MAX_MEMBERS}`);
  }
  const random = prng(options.seed ?? 1);
  const width = Math.max(4, String(n).length);
  const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)];

  return Array.from({ length: n }, (_, i) => {
    const id = String(i + 1).padStart(width, '0');
    const member: SyntheticMember = {
      nameEn: `Test Person ${id}`,
      nameZh: pick(CHINESE_TEST_NAMES),
      membershipType: random() < 0.1 ? 'family' : 'individual',
      email: `test${id}@example.org`,
      phone: syntheticPhone(i),
      registrationEvent: pick(REGISTRATION_EVENTS),
    };
    if (random() >= 0.3) member.wechatId = `test_wechat_${id}`;
    if (random() >= 0.3) {
      const month = 1 + Math.floor(random() * 12);
      member.birthday = { month, day: 1 + Math.floor(random() * DAYS_IN_MONTH[month - 1]) };
    }
    return member;
  });
}
