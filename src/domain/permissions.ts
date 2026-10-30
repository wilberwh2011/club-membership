// Role → capability matrix (FR-024, FR-025; data-model.md "Permission matrix"). STUB: implemented in T032.
import type { Capability, Role } from '../../specs/001-member-registry/contracts/api-types';

/** The union of the capabilities of every role held (FR-024); no roles → none. */
export const capabilitiesFor: (roles: readonly Role[]) => Capability[] = () => {
  throw new Error('not implemented');
};

export const hasCapability: (roles: readonly Role[], capability: Capability) => boolean = () => {
  throw new Error('not implemented');
};
