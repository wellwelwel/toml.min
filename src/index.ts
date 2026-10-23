import type {
  DigitRule,
  LocalDateOrTimeKind,
  MetaNode,
  ParseOptions,
  ParserState,
  TomlErrorCode,
} from './types.js';

export type {
  LocalDateOrTimeKind,
  ParseOptions,
  TomlErrorCode,
} from './types.js';

const TAB = 0x09;
const LF = 0x0a;
const CR = 0x0d;
const SPACE = 0x20;
const DOUBLE_QUOTE = 0x22;
const HASH = 0x23;
const SINGLE_QUOTE = 0x27;
const PLUS = 0x2b;
const COMMA = 0x2c;
const DASH = 0x2d;
const DOT = 0x2e;
const ZERO = 0x30;
const ONE = 0x31;
const SEVEN = 0x37;
const NINE = 0x39;
const COLON = 0x3a;
const EQUALS = 0x3d;
const CHAR_A = 0x41;
const CHAR_E = 0x45;
const CHAR_F = 0x46;
const CHAR_T = 0x54;
const CHAR_U = 0x55;
const CHAR_Z = 0x5a;
const LEFT_BRACKET = 0x5b;
const BACKSLASH = 0x5c;
const RIGHT_BRACKET = 0x5d;
const UNDERSCORE = 0x5f;
const CHAR_a = 0x61;
const CHAR_b = 0x62;
const CHAR_e = 0x65;
const CHAR_f = 0x66;
const CHAR_i = 0x69;
const CHAR_l = 0x6c;
const CHAR_n = 0x6e;
const CHAR_o = 0x6f;
const CHAR_r = 0x72;
const CHAR_s = 0x73;
const CHAR_t = 0x74;
const CHAR_u = 0x75;
const CHAR_x = 0x78;
const CHAR_z = 0x7a;
const LEFT_BRACE = 0x7b;
const RIGHT_BRACE = 0x7d;
const DEL = 0x7f;
const HIGH_SURROGATE_START = 0xd800;
const LOW_SURROGATE_START = 0xdc00;
const LOW_SURROGATE_END = 0xdfff;
const BOM = 0xfeff;
const MAX_CODE_POINT = 0x10ffff;

const DEFAULT_MAX_DEPTH = 100;
const MAX_DEPTH_CEILING = 1000;
const ECHO_LIMIT = 40;
const MAX_INTEGER_DIGITS = 64;
const MAX_EXACT_DIGITS = 15;
const DATE_LENGTH = 10;
const SHORT_TIME_LENGTH = 5;
const FULL_TIME_LENGTH = 8;
const NUMERIC_OFFSET_LENGTH = 6;
const MIN_INT64 = -9223372036854775808n;
const MAX_INT64 = 9223372036854775807n;
const RADIX_PREFIXES: Record<number, string> = {
  2: '0b',
  8: '0o',
  10: '',
  16: '0x',
};

const DECIMAL_DIGIT = 'a digit (0-9)';
const HEX_DIGIT = 'a hexadecimal digit (0-9, A-F)';
const OCTAL_DIGIT = 'an octal digit (0-7)';
const BINARY_DIGIT = 'a binary digit (0 or 1)';

const MAX_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const HIDDEN_CHARACTER =
  /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/u;

export class TomlError extends Error {
  readonly code: TomlErrorCode;
  readonly line: number;
  readonly column: number;

  constructor(
    code: TomlErrorCode,
    message: string,
    line: number,
    column: number
  ) {
    super(message);
    this.name = 'TomlError';
    this.code = code;
    this.line = line;
    this.column = column;
  }
}

export class LocalDateOrTime {
  readonly kind: LocalDateOrTimeKind;
  readonly text: string;

  constructor(kind: LocalDateOrTimeKind, text: string) {
    this.kind = kind;
    this.text = text;
  }

  toString(): string {
    return this.text;
  }

  toJSON(): string {
    return this.text;
  }
}

export class OffsetDateTime extends Date {
  readonly text: string;

  constructor(instant: string, text: string) {
    super(instant);
    this.text = text;
  }
}

// V8 pretenures object-literal allocation sites, and this one would flip on every parse.
class TableMeta implements MetaNode {
  assigned = false;
  explicit = false;
  tableArray = false;
  children: Record<string, MetaNode> = Object.create(null);
}

const isDigit = (code: number): boolean => code >= ZERO && code <= NINE;

const isHexDigit = (code: number): boolean =>
  isDigit(code) ||
  (code >= CHAR_A && code <= CHAR_F) ||
  (code >= CHAR_a && code <= CHAR_f);

const hexValue = (code: number): number => {
  if (code <= NINE) return code - ZERO;
  if (code <= CHAR_F) return code - CHAR_A + 10;

  return code - CHAR_a + 10;
};

const isOctalDigit = (code: number): boolean => code >= ZERO && code <= SEVEN;

const isBinaryDigit = (code: number): boolean => code === ZERO || code === ONE;

const HEXADECIMAL: DigitRule = {
  radix: 16,
  isAllowedDigit: isHexDigit,
  digitName: HEX_DIGIT,
};

const OCTAL: DigitRule = {
  radix: 8,
  isAllowedDigit: isOctalDigit,
  digitName: OCTAL_DIGIT,
};

const BINARY: DigitRule = {
  radix: 2,
  isAllowedDigit: isBinaryDigit,
  digitName: BINARY_DIGIT,
};

const isBareKeyCharacter = (code: number): boolean =>
  (code >= CHAR_A && code <= CHAR_Z) ||
  (code >= CHAR_a && code <= CHAR_z) ||
  (code >= ZERO && code <= NINE) ||
  code === DASH ||
  code === UNDERSCORE;

const isForbiddenControlCharacter = (code: number): boolean =>
  (code < SPACE && code !== TAB) || code === DEL;

const isHighSurrogate = (code: number): boolean =>
  code >= HIGH_SURROGATE_START && code < LOW_SURROGATE_START;

const isLowSurrogate = (code: number): boolean =>
  code >= LOW_SURROGATE_START && code <= LOW_SURROGATE_END;

const isSurrogate = (code: number): boolean =>
  isHighSurrogate(code) || isLowSurrogate(code);

const isLoneSurrogate = (
  source: string,
  position: number,
  current: number
): boolean => {
  if (isHighSurrogate(current))
    return !isLowSurrogate(source.charCodeAt(position + 1));

  return (
    isLowSurrogate(current) && !isHighSurrogate(source.charCodeAt(position - 1))
  );
};

const isForbiddenCharacter = (
  source: string,
  position: number,
  current: number
): boolean =>
  current < HIGH_SURROGATE_START
    ? isForbiddenControlCharacter(current)
    : isLoneSurrogate(source, position, current);

const isLineBreak = (
  source: string,
  position: number,
  current: number
): boolean =>
  current === LF || (current === CR && source.charCodeAt(position + 1) === LF);

const isExponentMarker = (code: number): boolean =>
  code === CHAR_e || code === CHAR_E;

const stripUnderscores = (digits: string): string =>
  digits.includes('_') ? digits.replace(/_/g, '') : digits;

const hexCode = (codePoint: number): string =>
  codePoint.toString(16).toUpperCase().padStart(4, '0');

const codePointName = (codePoint: number): string => `U+${hexCode(codePoint)}`;

const echoCharacter = (character: string): string => {
  if (HIDDEN_CHARACTER.test(character))
    return `[${codePointName(character.codePointAt(0)!)}]`;
  if (character === '"' || character === '\\') return `\\${character}`;

  return character;
};

const quoteInput = (text: string): string => {
  let shown = '';

  for (const character of text) {
    const visible = echoCharacter(character);

    if (shown.length + visible.length > ECHO_LIMIT) return `"${shown}…"`;

    shown += visible;
  }

  return `"${shown}"`;
};

const formatPath = (keys: string[]): string =>
  keys.map((key) => (key.indexOf('.') > -1 ? `'${key}'` : key)).join('.');

const ensureChildMeta = (meta: MetaNode, key: string): MetaNode => {
  const known = meta.children[key];

  if (known) return known;

  const child = new TableMeta();

  meta.children[key] = child;

  return child;
};

const fail = (
  state: ParserState,
  code: TomlErrorCode,
  message: string,
  offset = state.position
): never => {
  const { source } = state;
  let line = 1;
  let column = 1;

  for (let cursor = 0; cursor < offset; cursor++) {
    if (source.charCodeAt(cursor) === LF) {
      line++;
      column = 1;
    } else {
      column++;
    }
  }

  throw new TomlError(code, message, line, column);
};

const describeFound = (state: ParserState): string => {
  const { source, position } = state;

  if (position >= state.length) return 'the end of the file';

  const current = source.charCodeAt(position);

  if (isLineBreak(source, position, current)) return 'the end of the line';
  if (current === HASH) return 'a comment';

  return quoteInput(String.fromCodePoint(source.codePointAt(position)!));
};

const failTooDeep = (state: ParserState, offset = state.position): never =>
  fail(
    state,
    'NESTING_TOO_DEEP',
    `Tables and arrays are nested more than ${state.maxDepth} levels deep here, which is over the limit.`,
    offset
  );

const failForbiddenCharacter = (
  state: ParserState,
  current: number,
  container: 'string' | 'comment',
  offset: number
): never => {
  if (isSurrogate(current))
    return fail(
      state,
      'LONE_SURROGATE',
      `This ${container} contains ${codePointName(current)}, which is not a valid Unicode character on its own. Remove it.`,
      offset
    );

  const alternative =
    container === 'string'
      ? `, or write it as \\u${hexCode(current)} inside "double quotes"`
      : '';

  return fail(
    state,
    'CONTROL_CHARACTER',
    `This ${container} contains the invisible control character ${codePointName(current)}. Remove it${alternative}.`,
    offset
  );
};

const failAlreadySet = (
  state: ParserState,
  path: string[],
  offset: number
): never =>
  fail(
    state,
    'DUPLICATE_KEY',
    `${quoteInput(formatPath(path))} is already set to a value, so no keys can be added under it.`,
    offset
  );

const failDefinedTwice = (
  state: ParserState,
  path: string[],
  offset: number
): never =>
  fail(
    state,
    'DUPLICATE_KEY',
    `The key ${quoteInput(formatPath(path))} is defined more than once. Each key can only be set once.`,
    offset
  );

const failInvalidValue = (state: ParserState): never => {
  const { source, length, position } = state;
  let end = position;

  while (end < length && isBareKeyCharacter(source.charCodeAt(end))) end++;

  return fail(
    state,
    'INVALID_VALUE',
    `${quoteInput(source.substring(position, end))} is not a valid value. Put text inside "quotes", and write true and false in lowercase.`
  );
};

const failIntegerRange = (
  state: ParserState,
  start: number,
  min: number | bigint,
  max: number | bigint
): never =>
  fail(
    state,
    'INTEGER_OUT_OF_RANGE',
    `The integer ${quoteInput(state.source.substring(start, state.position))} is outside the range that can be read exactly. Whole numbers must be between ${min} and ${max}.`,
    start
  );

const failMissingValue = (state: ParserState): never =>
  fail(
    state,
    'EXPECTED_VALUE',
    `Expected a value here, but found ${describeFound(state)}. Values look like "text", 42, true, [1, 2] or { key = 1 }.`
  );

const failUnterminatedArray = (state: ParserState, start: number): never =>
  fail(
    state,
    'UNTERMINATED_ARRAY',
    'This array is never closed. Add ] after its last item.',
    start
  );

const failUnterminatedInlineTable = (
  state: ParserState,
  start: number
): never =>
  fail(
    state,
    'UNTERMINATED_INLINE_TABLE',
    'This inline table is never closed. Add } after its last entry.',
    start
  );

const failConstructorTable = (state: ParserState): never =>
  fail(
    state,
    'INVALID_KEY',
    `"constructor" can't hold a table, because merging the result into another object could change the built-in Object shared by the whole program. Give it a plain value, or rename it.`,
    state.lastKeyOffset
  );

const skipWhitespace = (state: ParserState): void => {
  const { source, length } = state;
  let position = state.position;

  while (position < length) {
    const current = source.charCodeAt(position);

    if (current !== SPACE && current !== TAB) break;

    position++;
  }

  state.position = position;
};

const skipNewline = (state: ParserState): boolean => {
  const { source, position } = state;
  const current = source.charCodeAt(position);

  if (current === LF) {
    state.position = position + 1;

    return true;
  }
  if (current !== CR || source.charCodeAt(position + 1) !== LF) return false;

  state.position = position + 2;

  return true;
};

const skipComment = (state: ParserState): void => {
  const { source, length } = state;
  let position = state.position;

  if (position >= length || source.charCodeAt(position) !== HASH) return;

  position++;

  while (position < length) {
    const current = source.charCodeAt(position);

    if (isForbiddenCharacter(source, position, current)) {
      if (isLineBreak(source, position, current)) break;

      failForbiddenCharacter(state, current, 'comment', position);
    }

    position++;
  }

  state.position = position;
};

const skipBlanks = (state: ParserState): void => {
  do {
    skipWhitespace(state);
    skipComment(state);
  } while (skipNewline(state));
};

const endsLine = (state: ParserState): boolean => {
  skipWhitespace(state);
  skipComment(state);

  return state.position >= state.length || skipNewline(state);
};

const joinParts = (parts: string[] | undefined, last: string): string => {
  if (parts === undefined) return last;

  parts.push(last);

  return parts.join('');
};

const readBareKey = (state: ParserState): string => {
  const { source, length } = state;
  const start = state.position;
  let position = start;

  while (position < length && isBareKeyCharacter(source.charCodeAt(position)))
    position++;

  if (position === start)
    fail(
      state,
      'INVALID_KEY',
      `Expected a key here, but found ${describeFound(state)}. Keys without quotes can only use A-Z, a-z, 0-9, - and _.`
    );

  state.position = position;

  return source.substring(start, position);
};

const readUnicodeEscape = (
  state: ParserState,
  digits: number,
  letter: string
): string => {
  const { source } = state;
  const start = state.position;
  const end = start + digits;
  let codePoint = 0;

  for (let position = start; position < end; position++) {
    const current = source.charCodeAt(position);

    if (!isHexDigit(current))
      fail(
        state,
        'INVALID_ESCAPE',
        `\\${letter} must be followed by exactly ${digits} hexadecimal digits (0-9, A-F).`,
        start - 2
      );

    codePoint = codePoint * 16 + hexValue(current);
  }

  state.position = end;

  if (codePoint > MAX_CODE_POINT || isSurrogate(codePoint))
    fail(
      state,
      'INVALID_ESCAPE',
      `${quoteInput(source.substring(start - 2, end))} is not a valid Unicode character.`,
      start - 2
    );

  return String.fromCodePoint(codePoint);
};

const readEscape = (state: ParserState): string => {
  const { source } = state;
  const position = state.position + 1;

  if (position >= state.length) {
    state.position = position;

    return '';
  }

  state.position = position + 1;

  switch (source.charCodeAt(position)) {
    case CHAR_b:
      return '\b';
    case CHAR_t:
      return '\t';
    case CHAR_n:
      return '\n';
    case CHAR_f:
      return '\f';
    case CHAR_r:
      return '\r';
    case DOUBLE_QUOTE:
      return '"';
    case BACKSLASH:
      return '\\';
    case CHAR_e:
      return '\x1B';
    case CHAR_u:
      return readUnicodeEscape(state, 4, 'u');
    case CHAR_U:
      return readUnicodeEscape(state, 8, 'U');
    case CHAR_x:
      return readUnicodeEscape(state, 2, 'x');
    default:
      return fail(
        state,
        'INVALID_ESCAPE',
        `${quoteInput(`\\${String.fromCodePoint(source.codePointAt(position)!)}`)} is not a valid escape. Write \\\\ for a backslash, or use 'single quotes' to keep backslashes as typed.`,
        position - 1
      );
  }
};

const readBasicString = (state: ParserState): string => {
  const { source, length } = state;
  const start = state.position;
  let position = start + 1;
  let segment = position;
  let parts: string[] | undefined;

  while (position < length) {
    const current = source.charCodeAt(position);

    if (current === DOUBLE_QUOTE) {
      state.position = position + 1;

      return joinParts(parts, source.substring(segment, position));
    }
    if (current === BACKSLASH) {
      parts ??= [];
      parts.push(source.substring(segment, position));
      state.position = position;
      parts.push(readEscape(state));
      position = state.position;
      segment = position;

      continue;
    }
    if (isForbiddenCharacter(source, position, current)) {
      if (isLineBreak(source, position, current)) break;

      failForbiddenCharacter(state, current, 'string', position);
    }

    position++;
  }

  return fail(
    state,
    'UNTERMINATED_STRING',
    'This string is never closed. End it with " on the same line, or use """ for text that spans several lines.',
    start
  );
};

const readLiteralString = (state: ParserState): string => {
  const { source, length } = state;
  const start = state.position;
  let position = start + 1;

  while (position < length) {
    const current = source.charCodeAt(position);

    if (current === SINGLE_QUOTE) {
      state.position = position + 1;

      return source.substring(start + 1, position);
    }
    if (isForbiddenCharacter(source, position, current)) {
      if (isLineBreak(source, position, current)) break;

      failForbiddenCharacter(state, current, 'string', position);
    }

    position++;
  }

  return fail(
    state,
    'UNTERMINATED_STRING',
    "This string is never closed. End it with ' on the same line, or use ''' for text that spans several lines.",
    start
  );
};

const readMultilineString = (state: ParserState, quote: number): string => {
  const { source, length } = state;
  const start = state.position;

  state.position = start + 3;
  skipNewline(state);

  let position = state.position;
  let segment = position;
  let parts: string[] | undefined;

  while (position < length) {
    const current = source.charCodeAt(position);

    if (current === quote) {
      let quoteEnd = position;

      while (quoteEnd < length && source.charCodeAt(quoteEnd) === quote)
        quoteEnd++;

      const quoteCount = quoteEnd - position;

      if (quoteCount > 5)
        fail(
          state,
          'TOO_MANY_QUOTES',
          'This string ends with too many quotes in a row. At most five can end it: three that close the string and two that belong to the text.',
          position
        );

      position = quoteEnd;

      if (quoteCount < 3) continue;

      state.position = position;

      return joinParts(parts, source.substring(segment, position - 3));
    }
    if (current === BACKSLASH && quote === DOUBLE_QUOTE) {
      const next = source.charCodeAt(position + 1);

      parts ??= [];
      parts.push(source.substring(segment, position));
      state.position = position;

      if (next === LF || next === CR || next === SPACE || next === TAB) {
        state.position++;

        do skipWhitespace(state);
        while (skipNewline(state));
      } else {
        parts.push(readEscape(state));
      }

      position = state.position;
      segment = position;

      continue;
    }
    if (current === CR && source.charCodeAt(position + 1) === LF) {
      parts ??= [];
      parts.push(source.substring(segment, position), '\n');
      state.position = position;
      skipNewline(state);
      position = state.position;
      segment = position;

      continue;
    }
    if (current !== LF && isForbiddenCharacter(source, position, current))
      failForbiddenCharacter(state, current, 'string', position);

    position++;
  }

  return fail(
    state,
    'UNTERMINATED_STRING',
    `This string is never closed. End it with ${quote === DOUBLE_QUOTE ? '"""' : "'''"}.`,
    start
  );
};

const isTripleQuote = (state: ParserState, quote: number): boolean => {
  const { source, position } = state;

  return (
    source.charCodeAt(position + 1) === quote &&
    source.charCodeAt(position + 2) === quote
  );
};

const readSingleLineString = (state: ParserState, quote: number): string =>
  quote === DOUBLE_QUOTE ? readBasicString(state) : readLiteralString(state);

const readString = (state: ParserState, quote: number): string =>
  isTripleQuote(state, quote)
    ? readMultilineString(state, quote)
    : readSingleLineString(state, quote);

const readSimpleKey = (state: ParserState): string => {
  const current = state.source.charCodeAt(state.position);

  if (current !== DOUBLE_QUOTE && current !== SINGLE_QUOTE)
    return readBareKey(state);
  if (isTripleQuote(state, current))
    fail(
      state,
      'INVALID_KEY',
      `A key can't use triple quotes. Use "double" or 'single' quotes instead.`
    );

  return readSingleLineString(state, current);
};

const refuseConstructorTable = (state: ParserState, keys: string[]): void => {
  if (!state.allowUnsafeKeys && keys[keys.length - 1] === 'constructor')
    failConstructorTable(state);
};

const readKeyPart = (
  state: ParserState,
  partsRead: number,
  maxParts: number
): string => {
  if (partsRead >= maxParts) failTooDeep(state);

  state.lastKeyOffset = state.position;

  const key = readSimpleKey(state);

  if (key === '__proto__' && !state.allowUnsafeKeys)
    fail(
      state,
      'INVALID_KEY',
      `"__proto__" can't be used as a key, because copying the result into an ordinary object would replace that object's prototype. Rename it.`,
      state.lastKeyOffset
    );

  skipWhitespace(state);

  return key;
};

const readDottedKey = (state: ParserState, maxParts: number): string[] => {
  const keys = [readKeyPart(state, 0, maxParts)];

  while (
    state.position < state.length &&
    state.source.charCodeAt(state.position) === DOT
  ) {
    refuseConstructorTable(state, keys);
    state.position++;
    skipWhitespace(state);
    keys.push(readKeyPart(state, keys.length, maxParts));
  }

  return keys;
};

const readEqualsSign = (state: ParserState): void => {
  skipWhitespace(state);

  if (
    state.position >= state.length ||
    state.source.charCodeAt(state.position) !== EQUALS
  )
    fail(
      state,
      'EXPECTED_EQUALS',
      `Expected = after this key, but found ${describeFound(state)}. Put keys with spaces or symbols inside "quotes".`
    );

  state.position++;
  skipWhitespace(state);
};

const readAssignedKey = (state: ParserState, maxParts: number): string[] => {
  const keys = readDottedKey(state, maxParts);

  readEqualsSign(state);

  if (state.source.charCodeAt(state.position) === LEFT_BRACE)
    refuseConstructorTable(state, keys);

  return keys;
};

const skipDigits = (
  state: ParserState,
  isAllowedDigit: (code: number) => boolean,
  digitName: string
): void => {
  const { source, length } = state;

  if (!isAllowedDigit(source.charCodeAt(state.position)))
    fail(
      state,
      'INVALID_NUMBER',
      `Expected ${digitName} here, but found ${describeFound(state)}.`
    );

  let position = state.position + 1;

  while (position < length) {
    const current = source.charCodeAt(position);

    if (
      current === UNDERSCORE &&
      !isAllowedDigit(source.charCodeAt(position + 1))
    )
      fail(
        state,
        'INVALID_NUMBER',
        'An underscore in a number must sit between two digits.',
        position
      );
    if (current !== UNDERSCORE && !isAllowedDigit(current)) break;

    position++;
  }

  state.position = position;
};

const readTwoDigits = (source: string, position: number): number =>
  (source.charCodeAt(position) - ZERO) * 10 +
  source.charCodeAt(position + 1) -
  ZERO;

const validateDate = (state: ParserState, offset: number): void => {
  const { source } = state;
  const year =
    readTwoDigits(source, offset) * 100 + readTwoDigits(source, offset + 2);
  const month = readTwoDigits(source, offset + 5);
  const day = readTwoDigits(source, offset + 8);

  if (month < 1 || month > 12)
    fail(
      state,
      'INVALID_DATE',
      `This date doesn't exist: month ${month} is not between 1 and 12.`,
      offset
    );

  let maxDay = MAX_DAYS[month - 1];

  if (month === 2 && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0))
    maxDay = 29;
  if (day < 1 || day > maxDay)
    fail(
      state,
      'INVALID_DATE',
      `This date doesn't exist: month ${month} of ${year} has no day ${day}.`,
      offset
    );
};

const validateTime = (
  state: ParserState,
  timeStart: number,
  clockLength: number,
  offset: number
): void => {
  const { source } = state;
  const hour = readTwoDigits(source, timeStart);
  const minute = readTwoDigits(source, timeStart + 3);
  const second =
    clockLength === FULL_TIME_LENGTH ? readTwoDigits(source, timeStart + 6) : 0;

  if (hour > 23)
    fail(
      state,
      'INVALID_TIME',
      `This time doesn't exist: hour ${hour} is not between 0 and 23.`,
      offset
    );
  if (minute > 59)
    fail(
      state,
      'INVALID_TIME',
      `This time doesn't exist: minute ${minute} is not between 0 and 59.`,
      offset
    );
  if (second > 59)
    fail(
      state,
      'INVALID_TIME',
      `This time doesn't exist: second ${second} is not between 0 and 59.`,
      offset
    );
};

const validateTimeOffset = (state: ParserState, offset: number): void => {
  const { source } = state;
  const sign = source.charCodeAt(offset);

  if (sign !== PLUS && sign !== DASH) return;

  const hour = readTwoDigits(source, offset + 1);
  const minute = readTwoDigits(source, offset + 4);

  if (hour > 23)
    fail(
      state,
      'INVALID_TIME',
      `This time zone offset doesn't exist: hour ${hour} is not between 0 and 23.`,
      offset
    );
  if (minute > 59)
    fail(
      state,
      'INVALID_TIME',
      `This time zone offset doesn't exist: minute ${minute} is not between 0 and 59.`,
      offset
    );
};

const startsDate = (state: ParserState): boolean => {
  const { source, position } = state;

  return (
    isDigit(source.charCodeAt(position)) &&
    isDigit(source.charCodeAt(position + 1)) &&
    isDigit(source.charCodeAt(position + 2)) &&
    isDigit(source.charCodeAt(position + 3)) &&
    source.charCodeAt(position + 4) === DASH &&
    isDigit(source.charCodeAt(position + 5)) &&
    isDigit(source.charCodeAt(position + 6)) &&
    source.charCodeAt(position + 7) === DASH &&
    isDigit(source.charCodeAt(position + 8)) &&
    isDigit(source.charCodeAt(position + 9))
  );
};

const startsTime = (state: ParserState): boolean => {
  const { source, position } = state;

  return (
    isDigit(source.charCodeAt(position)) &&
    isDigit(source.charCodeAt(position + 1)) &&
    source.charCodeAt(position + 2) === COLON &&
    isDigit(source.charCodeAt(position + 3)) &&
    isDigit(source.charCodeAt(position + 4))
  );
};

const scanTime = (state: ParserState): number => {
  if (!startsTime(state)) return 0;

  const { source } = state;
  const start = state.position;
  const clockLength =
    source.charCodeAt(start + 5) === COLON &&
    isDigit(source.charCodeAt(start + 6)) &&
    isDigit(source.charCodeAt(start + 7))
      ? FULL_TIME_LENGTH
      : SHORT_TIME_LENGTH;
  let position = start + clockLength;

  if (
    source.charCodeAt(position) === DOT &&
    isDigit(source.charCodeAt(position + 1))
  ) {
    if (clockLength === SHORT_TIME_LENGTH)
      fail(
        state,
        'INVALID_TIME',
        'This time has a fraction of a second but no seconds. Add the seconds, as in 07:32:00.5.',
        position
      );

    position += 2;

    while (isDigit(source.charCodeAt(position))) position++;
  }

  state.position = position;

  return clockLength;
};

const scanTimeOffset = (state: ParserState): boolean => {
  const { source, position } = state;
  const current = source.charCodeAt(position);

  if (current === CHAR_Z || current === CHAR_z) {
    state.position = position + 1;

    return true;
  }
  if (
    (current !== PLUS && current !== DASH) ||
    !isDigit(source.charCodeAt(position + 1)) ||
    !isDigit(source.charCodeAt(position + 2)) ||
    source.charCodeAt(position + 3) !== COLON ||
    !isDigit(source.charCodeAt(position + 4)) ||
    !isDigit(source.charCodeAt(position + 5))
  )
    return false;

  state.position = position + NUMERIC_OFFSET_LENGTH;

  return true;
};

const toInstant = (
  source: string,
  text: string,
  start: number,
  clockLength: number,
  offsetStart: number
): string => {
  const timeStart = start + DATE_LENGTH + 1;
  const zone = source.charCodeAt(offsetStart);

  if (
    source.charCodeAt(timeStart - 1) === CHAR_T &&
    clockLength === FULL_TIME_LENGTH &&
    zone !== CHAR_z
  )
    return text;

  const clock =
    clockLength === FULL_TIME_LENGTH
      ? source.substring(timeStart, offsetStart)
      : `${source.substring(timeStart, timeStart + SHORT_TIME_LENGTH)}:00${source.substring(timeStart + SHORT_TIME_LENGTH, offsetStart)}`;
  const timeOffset =
    zone === CHAR_Z || zone === CHAR_z
      ? 'Z'
      : source.substring(offsetStart, offsetStart + NUMERIC_OFFSET_LENGTH);

  return `${source.substring(start, start + DATE_LENGTH)}T${clock}${timeOffset}`;
};

const tryReadDateOrTime = (
  state: ParserState
): OffsetDateTime | LocalDateOrTime | undefined => {
  const { source } = state;
  const start = state.position;

  if (!startsDate(state)) {
    const clockLength = scanTime(state);

    if (clockLength === 0) return undefined;

    validateTime(state, start, clockLength, start);

    return new LocalDateOrTime('time', source.substring(start, state.position));
  }

  const afterDate = start + DATE_LENGTH;
  const delimiter = source.charCodeAt(afterDate);
  const hasTime =
    delimiter === CHAR_T ||
    delimiter === CHAR_t ||
    (delimiter === SPACE && isDigit(source.charCodeAt(afterDate + 1)));

  if (!hasTime) {
    state.position = afterDate;
    validateDate(state, start);

    return new LocalDateOrTime('date', source.substring(start, afterDate));
  }

  const timeStart = afterDate + 1;

  state.position = timeStart;

  const clockLength = scanTime(state);

  if (clockLength === 0) {
    state.position = start;

    return undefined;
  }

  validateDate(state, start);
  validateTime(state, timeStart, clockLength, start);

  const offsetStart = state.position;

  if (!scanTimeOffset(state))
    return new LocalDateOrTime(
      'date-time',
      source.substring(start, offsetStart)
    );

  validateTimeOffset(state, offsetStart);

  const text = source.substring(start, state.position);

  return new OffsetDateTime(
    toInstant(source, text, start, clockLength, offsetStart),
    text
  );
};

const tryReadSpecialFloat = (state: ParserState): number | undefined => {
  const { source, position } = state;
  const sign = source.charCodeAt(position);
  const start = sign === PLUS || sign === DASH ? position + 1 : position;
  const first = source.charCodeAt(start);

  if (
    first === CHAR_i &&
    source.charCodeAt(start + 1) === CHAR_n &&
    source.charCodeAt(start + 2) === CHAR_f
  ) {
    state.position = start + 3;

    return sign === DASH ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  }
  if (
    first === CHAR_n &&
    source.charCodeAt(start + 1) === CHAR_a &&
    source.charCodeAt(start + 2) === CHAR_n
  ) {
    state.position = start + 3;

    return Number.NaN;
  }

  return undefined;
};

const toBigInt = (
  state: ParserState,
  digits: string,
  radix: number,
  sign: number,
  start: number
): bigint => {
  const plain = stripUnderscores(digits);
  let firstSignificant = 0;

  while (
    firstSignificant < plain.length - 1 &&
    plain.charCodeAt(firstSignificant) === ZERO
  )
    firstSignificant++;

  if (plain.length - firstSignificant > MAX_INTEGER_DIGITS)
    failIntegerRange(state, start, MIN_INT64, MAX_INT64);

  const magnitude = BigInt(
    `${RADIX_PREFIXES[radix]}${plain.slice(firstSignificant)}`
  );
  const value = sign < 0 ? -magnitude : magnitude;

  if (value < MIN_INT64 || value > MAX_INT64)
    failIntegerRange(state, start, MIN_INT64, MAX_INT64);

  return value;
};

const toInteger = (
  state: ParserState,
  digits: string,
  radix: number,
  sign: number,
  start: number
): number | bigint => {
  if (state.bigint) return toBigInt(state, digits, radix, sign, start);

  const value = sign * Number.parseInt(stripUnderscores(digits), radix);

  if (!Number.isSafeInteger(value))
    failIntegerRange(
      state,
      start,
      Number.MIN_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER
    );

  return value;
};

const readFloat = (state: ParserState, start: number): number => {
  const { source } = state;

  if (source.charCodeAt(state.position) === DOT) {
    state.position++;
    skipDigits(state, isDigit, DECIMAL_DIGIT);
  }
  if (isExponentMarker(source.charCodeAt(state.position))) {
    state.position++;

    const exponentSign = source.charCodeAt(state.position);

    if (exponentSign === PLUS || exponentSign === DASH) state.position++;

    skipDigits(state, isDigit, DECIMAL_DIGIT);
  }

  return Number.parseFloat(
    stripUnderscores(source.substring(start, state.position))
  );
};

const readDecimalInteger = (
  state: ParserState,
  sign: number,
  start: number,
  digitsStart: number
): number | bigint => {
  const { source } = state;
  const end = state.position;

  if (end - digitsStart > MAX_EXACT_DIGITS)
    return toInteger(
      state,
      source.substring(digitsStart, end),
      10,
      sign,
      start
    );

  let magnitude = 0;

  for (let index = digitsStart; index < end; index++) {
    const code = source.charCodeAt(index);

    if (code !== UNDERSCORE) magnitude = magnitude * 10 + code - ZERO;
  }

  const value = sign * magnitude;

  return state.bigint ? BigInt(value) : value;
};

const prefixedIntegerRule = (prefix: number): DigitRule | undefined => {
  if (prefix === CHAR_x) return HEXADECIMAL;
  if (prefix === CHAR_o) return OCTAL;
  if (prefix === CHAR_b) return BINARY;

  return undefined;
};

const readPrefixedInteger = (
  state: ParserState,
  rule: DigitRule,
  start: number
): number | bigint => {
  const digitsStart = state.position + 2;

  state.position = digitsStart;
  skipDigits(state, rule.isAllowedDigit, rule.digitName);

  return toInteger(
    state,
    state.source.substring(digitsStart, state.position),
    rule.radix,
    1,
    start
  );
};

const readNumberFromZero = (
  state: ParserState,
  start: number
): number | bigint => {
  const { source } = state;
  const zero = state.position;
  const rule = prefixedIntegerRule(source.charCodeAt(zero + 1));

  if (rule) {
    if (zero > start)
      fail(
        state,
        'INVALID_NUMBER',
        `Hexadecimal, octal and binary numbers can't start with + or -. Remove the sign, or write the number in decimal.`,
        start
      );

    return readPrefixedInteger(state, rule, start);
  }

  state.position = zero + 1;

  const afterZero = source.charCodeAt(state.position);

  if (isDigit(afterZero) || afterZero === UNDERSCORE)
    fail(
      state,
      'INVALID_NUMBER',
      'A number can only start with 0 when it is exactly 0. Remove the leading zeros.',
      start
    );
  if (afterZero === DOT || isExponentMarker(afterZero))
    return readFloat(state, start);

  return state.bigint ? 0n : 0;
};

const readNumber = (state: ParserState): number | bigint => {
  const { source } = state;
  const start = state.position;
  const signCode = source.charCodeAt(start);
  const sign = signCode === DASH ? -1 : 1;

  if (signCode === PLUS || signCode === DASH) state.position++;

  const digitsStart = state.position;
  const firstDigit = source.charCodeAt(digitsStart);

  if (firstDigit === ZERO) return readNumberFromZero(state, start);
  if (!isDigit(firstDigit)) {
    if (digitsStart > start)
      fail(
        state,
        'INVALID_NUMBER',
        `Expected a digit after the sign, but found ${describeFound(state)}.`
      );

    failInvalidValue(state);
  }

  skipDigits(state, isDigit, DECIMAL_DIGIT);

  const afterInteger = source.charCodeAt(state.position);

  if (afterInteger === DOT || isExponentMarker(afterInteger))
    return readFloat(state, start);

  return readDecimalInteger(state, sign, start, digitsStart);
};

const readNumberOrDate = (
  state: ParserState
): number | bigint | OffsetDateTime | LocalDateOrTime => {
  const { source, position } = state;

  if (!isDigit(source.charCodeAt(position)))
    return tryReadSpecialFloat(state) ?? readNumber(state);
  if (
    source.charCodeAt(position + 2) === COLON ||
    source.charCodeAt(position + 4) === DASH
  )
    return tryReadDateOrTime(state) ?? readNumber(state);

  return readNumber(state);
};

const readTrue = (state: ParserState): boolean => {
  const { source, position } = state;

  if (
    source.charCodeAt(position + 1) !== CHAR_r ||
    source.charCodeAt(position + 2) !== CHAR_u ||
    source.charCodeAt(position + 3) !== CHAR_e
  )
    failInvalidValue(state);

  state.position = position + 4;

  return true;
};

const readFalse = (state: ParserState): boolean => {
  const { source, position } = state;

  if (
    source.charCodeAt(position + 1) !== CHAR_a ||
    source.charCodeAt(position + 2) !== CHAR_l ||
    source.charCodeAt(position + 3) !== CHAR_s ||
    source.charCodeAt(position + 4) !== CHAR_e
  )
    failInvalidValue(state);

  state.position = position + 5;

  return false;
};

const readValue = (state: ParserState, depth: number): unknown => {
  if (state.position >= state.length) return failMissingValue(state);

  const current = state.source.charCodeAt(state.position);

  if (current === DOUBLE_QUOTE || current === SINGLE_QUOTE)
    return readString(state, current);
  if (current === CHAR_t) return readTrue(state);
  if (current === CHAR_f) return readFalse(state);
  if (current === LEFT_BRACKET) return readArray(state, depth);
  if (current === LEFT_BRACE) return readInlineTable(state, depth);
  if (
    isDigit(current) ||
    current === PLUS ||
    current === DASH ||
    current === CHAR_i ||
    current === CHAR_n
  )
    return readNumberOrDate(state);
  if (isBareKeyCharacter(current)) failInvalidValue(state);

  return failMissingValue(state);
};

const readArray = (state: ParserState, depth: number): unknown[] => {
  const { source } = state;
  const start = state.position;

  if (depth > state.maxDepth) failTooDeep(state);

  state.position++;

  const result: unknown[] = [];

  while (true) {
    skipBlanks(state);

    if (state.position >= state.length) failUnterminatedArray(state, start);
    if (source.charCodeAt(state.position) === RIGHT_BRACKET) {
      state.position++;

      return result;
    }

    result.push(readValue(state, depth + 1));
    skipBlanks(state);

    if (state.position >= state.length) failUnterminatedArray(state, start);

    const separator = source.charCodeAt(state.position);

    if (separator === RIGHT_BRACKET) {
      state.position++;

      return result;
    }
    if (separator !== COMMA)
      fail(
        state,
        'EXPECTED_COMMA',
        `Expected a comma or ] here, but found ${describeFound(state)}. Separate items with commas and close the array with ].`
      );

    state.position++;
  }
};

const createDottedInlineTable = (
  state: ParserState
): Record<string, unknown> => {
  const table: Record<string, unknown> = Object.create(null);

  state.dottedInlineTables ??= new Set();
  state.dottedInlineTables.add(table);

  return table;
};

const assignInlineKeyValue = (
  state: ParserState,
  table: Record<string, unknown>,
  keys: string[],
  value: unknown,
  offset: number
): void => {
  const lastIndex = keys.length - 1;
  let target = table;

  for (let index = 0; index < lastIndex; index++) {
    const key = keys[index];
    const existing = target[key];

    if (existing === undefined) {
      const child = createDottedInlineTable(state);

      target[key] = child;
      target = child;

      continue;
    }
    if (!state.dottedInlineTables?.has(existing))
      failAlreadySet(state, keys.slice(0, index + 1), offset);

    target = existing as Record<string, unknown>;
  }

  const lastKey = keys[lastIndex];

  if (target[lastKey] !== undefined) failDefinedTwice(state, keys, offset);

  target[lastKey] = value;
};

const readInlineTableEntry = (
  state: ParserState,
  table: Record<string, unknown>,
  depth: number
): void => {
  const offset = state.position;
  const keys = readAssignedKey(state, state.maxDepth - depth + 1);
  const value = readValue(state, depth + keys.length);

  assignInlineKeyValue(state, table, keys, value, offset);
};

const readInlineTable = (
  state: ParserState,
  depth: number
): Record<string, unknown> => {
  const { source } = state;
  const start = state.position;

  if (depth > state.maxDepth) failTooDeep(state);

  state.position++;

  const table: Record<string, unknown> = Object.create(null);

  while (true) {
    skipBlanks(state);

    if (state.position >= state.length)
      failUnterminatedInlineTable(state, start);
    if (source.charCodeAt(state.position) === RIGHT_BRACE) {
      state.position++;

      return table;
    }

    readInlineTableEntry(state, table, depth);
    skipBlanks(state);

    if (state.position >= state.length)
      failUnterminatedInlineTable(state, start);

    const separator = source.charCodeAt(state.position);

    if (separator === RIGHT_BRACE) {
      state.position++;

      return table;
    }
    if (separator !== COMMA)
      fail(
        state,
        'EXPECTED_COMMA',
        `Expected a comma or } here, but found ${describeFound(state)}. Separate entries with commas and close the table with }.`
      );

    state.position++;
  }
};

const ensureDottedParent = (
  state: ParserState,
  keys: string[],
  offset: number
): Record<string, unknown> => {
  const { contextKeys } = state;
  const lastIndex = keys.length - 1;
  let target = state.context;
  let meta = state.contextMeta;

  for (let index = 0; index < lastIndex; index++) {
    const key = keys[index];
    const existing = target[key];
    const known = meta.children[key];

    if (existing === undefined) {
      const created: Record<string, unknown> = Object.create(null);

      target[key] = created;
      target = created;
      meta = ensureChildMeta(meta, key);
      meta.assigned = true;

      continue;
    }
    if (known === undefined || Array.isArray(existing))
      return failAlreadySet(
        state,
        contextKeys.concat(keys.slice(0, index + 1)),
        offset
      );
    if (known.explicit)
      fail(
        state,
        'DUPLICATE_KEY',
        `${quoteInput(formatPath(contextKeys.concat(keys.slice(0, index + 1))))} already has its own [section], so add this key under that section instead.`,
        offset
      );

    target = existing as Record<string, unknown>;
    meta = known;
  }

  return target;
};

const assignKeyValue = (
  state: ParserState,
  keys: string[],
  value: unknown,
  offset: number
): void => {
  const target = ensureDottedParent(state, keys, offset);
  const lastKey = keys[keys.length - 1];

  if (target[lastKey] !== undefined)
    failDefinedTwice(state, state.contextKeys.concat(keys), offset);

  target[lastKey] = value;
};

const measureHeaderDepth = (
  state: ParserState,
  keys: string[],
  levelsBelow: number,
  offset: number
): void => {
  let meta: MetaNode | undefined = state.metaRoot;
  let depth = levelsBelow;

  for (const key of keys) {
    depth += meta?.tableArray ? 2 : 1;
    meta = meta?.children[key];
  }

  if (depth > state.maxDepth) failTooDeep(state, offset);

  state.contextDepth = depth;
};

const enterParentTable = (
  state: ParserState,
  keys: string[],
  offset: number
): MetaNode => {
  const lastIndex = keys.length - 1;
  let table = state.root;
  let meta = state.metaRoot;

  for (let index = 0; index < lastIndex; index++) {
    const key = keys[index];
    const child = table[key];

    if (child === undefined) {
      const created: Record<string, unknown> = Object.create(null);

      table[key] = created;
      table = created;
      meta = ensureChildMeta(meta, key);

      continue;
    }

    const known = meta.children[key];

    if (known === undefined)
      return failAlreadySet(state, keys.slice(0, index + 1), offset);

    const latestTable = Array.isArray(child) ? child[child.length - 1] : child;

    table = latestTable as Record<string, unknown>;
    meta = known;
  }

  state.context = table;

  return meta;
};

const setTablePath = (
  state: ParserState,
  keys: string[],
  offset: number
): void => {
  measureHeaderDepth(state, keys, 0, offset);

  const parentMeta = enterParentTable(state, keys, offset);
  const parent = state.context;
  const lastKey = keys[keys.length - 1];
  const existing = parent[lastKey];
  const known = parentMeta.children[lastKey];

  if (existing !== undefined && (known === undefined || known.assigned))
    fail(
      state,
      'DUPLICATE_KEY',
      `${quoteInput(formatPath(keys))} is already defined earlier in the file, so it can't start a new [section] here.`,
      offset
    );

  const meta = ensureChildMeta(parentMeta, lastKey);

  meta.assigned = true;
  meta.explicit = true;

  if (existing === undefined) {
    const table: Record<string, unknown> = Object.create(null);

    parent[lastKey] = table;
    state.context = table;
  } else {
    state.context = existing as Record<string, unknown>;
  }

  state.contextKeys = keys;
  state.contextMeta = meta;
};

const addTableArray = (
  state: ParserState,
  keys: string[],
  offset: number
): void => {
  measureHeaderDepth(state, keys, 1, offset);

  const parentMeta = enterParentTable(state, keys, offset);
  const parent = state.context;
  const lastKey = keys[keys.length - 1];
  const existing = parent[lastKey];

  if (existing !== undefined && parentMeta.children[lastKey] === undefined)
    fail(
      state,
      'DUPLICATE_KEY',
      `${quoteInput(formatPath(keys))} is already set to a value, so [[ ]] can't add tables to it.`,
      offset
    );
  if (existing !== undefined && !Array.isArray(existing))
    fail(
      state,
      'DUPLICATE_KEY',
      `${quoteInput(formatPath(keys))} is already defined as a single table, so [[ ]] can't add tables to it.`,
      offset
    );

  const meta = ensureChildMeta(parentMeta, lastKey);

  meta.children = Object.create(null);
  meta.assigned = true;
  meta.tableArray = true;

  const table: Record<string, unknown> = Object.create(null);

  if (existing === undefined) parent[lastKey] = [table];
  else (existing as unknown[]).push(table);

  state.context = table;
  state.contextKeys = keys;
  state.contextMeta = meta;
};

const readTableHeader = (state: ParserState): void => {
  const { source } = state;
  const offset = state.position;

  state.position++;

  const isArrayTable =
    state.position < state.length &&
    source.charCodeAt(state.position) === LEFT_BRACKET;

  if (isArrayTable) state.position++;

  skipWhitespace(state);

  const keys = readDottedKey(
    state,
    isArrayTable ? state.maxDepth - 1 : state.maxDepth
  );

  if (!isArrayTable) refuseConstructorTable(state, keys);

  skipWhitespace(state);

  if (
    state.position >= state.length ||
    source.charCodeAt(state.position) !== RIGHT_BRACKET
  )
    fail(
      state,
      'INVALID_TABLE_HEADER',
      `Expected ] to close this table name, but found ${describeFound(state)}. Put names with spaces or symbols inside "quotes".`
    );

  state.position++;

  if (isArrayTable) {
    if (
      state.position >= state.length ||
      source.charCodeAt(state.position) !== RIGHT_BRACKET
    )
      fail(
        state,
        'INVALID_TABLE_HEADER',
        `Expected ]] to close this table name, but found ${describeFound(state)}.`
      );

    state.position++;
  }
  if (!endsLine(state))
    fail(
      state,
      'EXPECTED_NEWLINE',
      `Expected the end of the line after this table name, but found ${describeFound(state)}. Put the next key on its own line.`
    );
  if (isArrayTable) addTableArray(state, keys, offset);
  else setTablePath(state, keys, offset);
};

const readKeyValue = (state: ParserState): void => {
  const offset = state.position;
  const keys = readAssignedKey(state, state.maxDepth - state.contextDepth + 1);
  const value = readValue(state, state.contextDepth + keys.length);

  assignKeyValue(state, keys, value, offset);

  if (!endsLine(state))
    fail(
      state,
      'EXPECTED_NEWLINE',
      `Expected the end of the line after this value, but found ${describeFound(state)}. Put each key = value on its own line, and start comments with #.`
    );
};

const readDocument = (state: ParserState): void => {
  const { source, length } = state;

  while (state.position < length) {
    skipWhitespace(state);

    if (state.position >= length) break;
    if (skipNewline(state)) continue;

    const current = source.charCodeAt(state.position);

    if (current === HASH) {
      skipComment(state);

      if (state.position < length) skipNewline(state);

      continue;
    }
    if (current === LEFT_BRACKET) readTableHeader(state);
    else readKeyValue(state);
  }
};

export const parse = <T = unknown>(
  input: string,
  options?: ParseOptions
): T => {
  if (typeof input !== 'string') throw new TypeError('source is not a string');

  const maxDepth = options?.maxDepth ?? DEFAULT_MAX_DEPTH;

  if (
    !Number.isSafeInteger(maxDepth) ||
    maxDepth < 0 ||
    maxDepth > MAX_DEPTH_CEILING
  )
    throw new TypeError(
      `maxDepth must be an integer from 0 to ${MAX_DEPTH_CEILING}`
    );

  const source = input.charCodeAt(0) === BOM ? input.slice(1) : input;
  const root: Record<string, unknown> = Object.create(null);
  const metaRoot = new TableMeta();
  const state: ParserState = {
    source,
    length: source.length,
    position: 0,
    maxDepth,
    bigint: options?.bigint === true,
    allowUnsafeKeys: options?.allowUnsafeKeys === true,
    root,
    metaRoot,
    context: root,
    contextKeys: [],
    contextMeta: metaRoot,
    contextDepth: 0,
    lastKeyOffset: 0,
    dottedInlineTables: undefined,
  };

  readDocument(state);

  return root as T;
};
