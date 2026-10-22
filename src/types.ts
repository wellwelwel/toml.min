export interface MetaNode {
  assigned: boolean;
  explicit: boolean;
  tableArray: boolean;
  children: Record<string, MetaNode>;
}

export type DigitRule = {
  radix: number;
  isAllowedDigit: (code: number) => boolean;
  digitName: string;
};

export type ParserState = {
  source: string;
  length: number;
  position: number;
  maxDepth: number;
  bigint: boolean;
  allowUnsafeKeys: boolean;
  root: Record<string, unknown>;
  metaRoot: MetaNode;
  context: Record<string, unknown>;
  contextKeys: string[];
  contextMeta: MetaNode;
  contextDepth: number;
  lastKeyOffset: number;
  dottedInlineTables: Set<unknown> | undefined;
};

export type ParseOptions = {
  maxDepth?: number;
  bigint?: boolean;
  allowUnsafeKeys?: boolean;
};

export type TomlErrorCode =
  | 'CONTROL_CHARACTER'
  | 'DUPLICATE_KEY'
  | 'EXPECTED_COMMA'
  | 'EXPECTED_EQUALS'
  | 'EXPECTED_NEWLINE'
  | 'EXPECTED_VALUE'
  | 'INTEGER_OUT_OF_RANGE'
  | 'INVALID_DATE'
  | 'INVALID_ESCAPE'
  | 'INVALID_KEY'
  | 'INVALID_NUMBER'
  | 'INVALID_TABLE_HEADER'
  | 'INVALID_TIME'
  | 'INVALID_VALUE'
  | 'LONE_SURROGATE'
  | 'NESTING_TOO_DEEP'
  | 'TOO_MANY_QUOTES'
  | 'UNTERMINATED_ARRAY'
  | 'UNTERMINATED_INLINE_TABLE'
  | 'UNTERMINATED_STRING';

export type LocalDateOrTimeKind = 'date-time' | 'date' | 'time';
