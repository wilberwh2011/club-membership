// Normalization keys (FR-012, FR-013; research R9). STUB: implemented in T027.

/** Trimmed, lowercase email; decides email duplicates (FR-012). */
export const emailKey: (email: string) => string = () => {
  throw new Error('not implemented');
};

/** NANP → the 10 digits; otherwise `+` followed by 8–15 digits; null when not a valid phone (FR-012). */
export const phoneKey: (phone: string) => string | null = () => {
  throw new Error('not implemented');
};

/** NFKC, lowercase, whitespace trimmed and collapsed; used for search matching (FR-013). */
export const textKey: (text: string) => string = () => {
  throw new Error('not implemented');
};
