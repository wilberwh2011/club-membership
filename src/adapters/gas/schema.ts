// Spreadsheet schema (data-model.md): pure data, no Apps Script globals. STUB: filled in by T035.
import type { Language } from '../../../specs/001-member-registry/contracts/api-types';

export type SheetName = 'README' | 'Members' | 'ClubUsers' | 'ChangeHistory' | 'ChangeValues' | 'Counters';

export type ColumnType = 'integer' | 'text' | 'enum' | 'date' | 'timestamp';

export interface ColumnSchema {
  key: string; // row 1
  description: Record<Language, string>; // row 2
  type: ColumnType;
  maxLength?: number;
}

export interface SheetSchema {
  name: SheetName;
  columns: readonly ColumnSchema[];
}

/** Every sheet, in spreadsheet tab order. STUB: empty until T035. */
export const SHEETS: readonly SheetSchema[] = [];
