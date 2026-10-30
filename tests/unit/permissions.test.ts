// Permission matrix (src/domain/permissions.ts): FR-024, FR-025, SC-007; US2-AS6, US3-AS4, US4-AS6, US5-AS4, US6-AS4.
// The expected matrix below is copied from data-model.md "Permission matrix"; a user's capabilities are the union
// over their roles (FR-024) and no roles means no capabilities.
import { capabilitiesFor, hasCapability } from '../../src/domain/permissions';
import type { Capability, Role } from '../../specs/001-member-registry/contracts/api-types';

const ROLES: Role[] = ['admin', 'ec_member', 'treasurer'];

const MATRIX: Record<Capability, Role[]> = {
  'member.search': ['admin', 'ec_member', 'treasurer'],
  'member.viewContact': ['admin', 'ec_member', 'treasurer'],
  'member.viewDetails': ['admin', 'ec_member', 'treasurer'],
  'member.register': ['admin', 'ec_member'],
  'member.edit': ['admin', 'ec_member'],
  'member.delete': ['admin'],
  'clubUser.manage': ['admin'],
};

const CAPABILITIES = Object.keys(MATRIX) as Capability[];

function expectedFor(roles: Role[]): Capability[] {
  return CAPABILITIES.filter((capability) => MATRIX[capability].some((role) => roles.includes(role))).sort();
}

const CELLS = ROLES.flatMap((role) =>
  CAPABILITIES.map((capability) => [role, capability, MATRIX[capability].includes(role)] as const),
);

describe('hasCapability', () => {
  it.each(CELLS)('US6-AS4 SC-007 role %s, capability %s → allowed=%p', (role, capability, allowed) => {
    expect(hasCapability([role], capability)).toBe(allowed);
  });

  it.each(CAPABILITIES)('US6-AS4 SC-007 no roles → %s refused', (capability) => {
    expect(hasCapability([], capability)).toBe(false);
  });
});

describe('capabilitiesFor', () => {
  it.each(ROLES)('FR-025 role %s has exactly the capabilities in the matrix', (role) => {
    expect([...capabilitiesFor([role])].sort()).toEqual(expectedFor([role]));
  });

  it('US6-AS4 empty roles give no capabilities', () => {
    expect(capabilitiesFor([])).toEqual([]);
  });

  it('US2-AS6 a treasurer can search and view all details', () => {
    expect(capabilitiesFor(['treasurer'])).toEqual(
      expect.arrayContaining(['member.search', 'member.viewContact', 'member.viewDetails']),
    );
  });

  it('US3-AS4 US4-AS6 US5-AS4 a treasurer cannot register, edit, delete or manage Club users', () => {
    const capabilities = capabilitiesFor(['treasurer']);
    for (const capability of ['member.register', 'member.edit', 'member.delete', 'clubUser.manage']) {
      expect(capabilities).not.toContain(capability);
    }
  });

  it('US5-AS4 an EC member cannot delete or manage Club users', () => {
    const capabilities = capabilitiesFor(['ec_member']);
    expect(capabilities).not.toContain('member.delete');
    expect(capabilities).not.toContain('clubUser.manage');
  });

  it.each([
    [['treasurer', 'ec_member']],
    [['admin', 'treasurer']],
    [['ec_member', 'admin']],
    [['admin', 'ec_member', 'treasurer']],
  ] as Role[][][])('FR-024 combined roles %p get the union of their capabilities', (roles) => {
    expect([...capabilitiesFor(roles)].sort()).toEqual(expectedFor(roles));
  });

  it('FR-024 treasurer + EC member equals EC member alone', () => {
    expect([...capabilitiesFor(['treasurer', 'ec_member'])].sort()).toEqual([...capabilitiesFor(['ec_member'])].sort());
  });

  it('FR-024 a role listed twice gives each capability once', () => {
    const capabilities = capabilitiesFor(['ec_member', 'ec_member']);
    expect(new Set(capabilities).size).toBe(capabilities.length);
    expect([...capabilities].sort()).toEqual(expectedFor(['ec_member']));
  });
});
