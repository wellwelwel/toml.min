import type {
  LocalDateOrTimeKind,
  MetaNode,
  ParseOptions,
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
const ECHO_LIMIT = 40;
const MAX_INTEGER_DIGITS = 64;
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

const isDigit = (code: number): boolean => code >= ZERO && code <= NINE;

const isHexDigit = (code: number): boolean =>
  isDigit(code) ||
  (code >= CHAR_A && code <= CHAR_F) ||
  (code >= CHAR_a && code <= CHAR_f);

const isOctalDigit = (code: number): boolean => code >= ZERO && code <= SEVEN;

const isBinaryDigit = (code: number): boolean => code === ZERO || code === ONE;

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

const isExponentMarker = (code: number): boolean =>
  code === CHAR_e || code === CHAR_E;

const stripUnderscores = (digits: string): string =>
  digits.includes('_') ? digits.replace(/_/g, '') : digits;

const hexCode = (codePoint: number): string =>
  codePoint.toString(16).toUpperCase().padStart(4, '0');

const codePointName = (codePoint: number): string => `U+${hexCode(codePoint)}`;

const quoteInput = (text: string): string => {
  let shown = '';
  for (const character of text) {
    const visible = HIDDEN_CHARACTER.test(character)
      ? `[${codePointName(character.codePointAt(0)!)}]`
      : character;
    if (shown.length + visible.length > ECHO_LIMIT) return `"${shown}…"`;
    shown += visible;
  }
  return `"${shown}"`;
};

const formatPath = (keys: string[]): string =>
  keys.map((key) => (key.indexOf('.') > -1 ? `'${key}'` : key)).join('.');

const createMetaNode = (): MetaNode => ({
  assigned: false,
  holdsValue: false,
  explicit: false,
  tableArray: false,
  children: Object.create(null),
});

const ensureChildMeta = (meta: MetaNode, key: string): MetaNode => {
  const known = meta.children[key];
  if (known) return known;
  const child = createMetaNode();
  meta.children[key] = child;
  return child;
};

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

export const parse = <T = unknown>(
  input: string,
  options?: ParseOptions
): T => {
  if (typeof input !== 'string') throw new TypeError('source is not a string');

  const maxDepth = options?.maxDepth ?? DEFAULT_MAX_DEPTH;
  if (!Number.isSafeInteger(maxDepth) || maxDepth < 0)
    throw new TypeError('maxDepth must be a non-negative integer');

  const bigint = options?.bigint === true;
  const allowUnsafeKeys = options?.allowUnsafeKeys === true;
  const src = input.charCodeAt(0) === BOM ? input.slice(1) : input;
  const len = src.length;
  const root: Record<string, unknown> = Object.create(null);
  const metaRoot = createMetaNode();

  let pos = 0;
  let context = root;
  let contextKeys: string[] = [];
  let contextMeta = metaRoot;
  let contextDepth = 0;
  let lastKeyOffset = 0;

  const fail = (code: TomlErrorCode, message: string, offset = pos): never => {
    let line = 1;
    let column = 1;
    for (let cursor = 0; cursor < offset; cursor++) {
      if (src.charCodeAt(cursor) === LF) {
        line++;
        column = 1;
      } else {
        column++;
      }
    }
    throw new TomlError(code, message, line, column);
  };

  const describeFound = (): string => {
    if (pos >= len) return 'the end of the file';
    const current = src.charCodeAt(pos);
    if (current === LF || current === CR) return 'the end of the line';
    if (current === HASH) return 'a comment';
    return quoteInput(String.fromCodePoint(src.codePointAt(pos)!));
  };

  const failTooDeep = (offset = pos): never =>
    fail(
      'NESTING_TOO_DEEP',
      `Tables and arrays are nested more than ${maxDepth} levels deep here, which is over the limit.`,
      offset
    );

  const failForbiddenCharacter = (
    current: number,
    container: 'string' | 'comment'
  ): never => {
    if (isSurrogate(current))
      return fail(
        'LONE_SURROGATE',
        `This ${container} contains ${codePointName(current)}, which is not a valid Unicode character on its own. Remove it.`
      );
    const alternative =
      container === 'string'
        ? `, or write it as \\u${hexCode(current)} inside "double quotes"`
        : '';
    return fail(
      'CONTROL_CHARACTER',
      `This ${container} contains the invisible control character ${codePointName(current)}. Remove it${alternative}.`
    );
  };

  const failAlreadySet = (path: string[], offset: number): never =>
    fail(
      'DUPLICATE_KEY',
      `${quoteInput(formatPath(path))} is already set to a value, so no keys can be added under it.`,
      offset
    );

  const failDefinedTwice = (path: string[], offset: number): never =>
    fail(
      'DUPLICATE_KEY',
      `The key ${quoteInput(formatPath(path))} is defined more than once. Each key can only be set once.`,
      offset
    );

  const failInvalidValue = (): never => {
    let end = pos;
    while (end < len && isBareKeyCharacter(src.charCodeAt(end))) end++;
    return fail(
      'INVALID_VALUE',
      `${quoteInput(src.substring(pos, end))} is not a valid value. Put text inside "quotes", and write true and false in lowercase.`
    );
  };

  const failIntegerRange = (
    start: number,
    min: number | bigint,
    max: number | bigint
  ): never =>
    fail(
      'INTEGER_OUT_OF_RANGE',
      `The integer ${quoteInput(src.substring(start, pos))} is outside the range that can be read exactly. Whole numbers must be between ${min} and ${max}.`,
      start
    );

  const failMissingValue = (): never =>
    fail(
      'EXPECTED_VALUE',
      `Expected a value here, but found ${describeFound()}. Values look like "text", 42, true, [1, 2] or { key = 1 }.`
    );

  const failUnterminatedArray = (start: number): never =>
    fail(
      'UNTERMINATED_ARRAY',
      'This array is never closed. Add ] after its last item.',
      start
    );

  const failUnterminatedInlineTable = (start: number): never =>
    fail(
      'UNTERMINATED_INLINE_TABLE',
      'This inline table is never closed. Add } after its last entry.',
      start
    );

  const failConstructorTable = (): never =>
    fail(
      'INVALID_KEY',
      `"constructor" can't hold a table, because merging the result into another object could change the built-in Object shared by the whole program. Give it a plain value, or rename it.`,
      lastKeyOffset
    );

  const isLoneSurrogate = (current: number): boolean => {
    if (isHighSurrogate(current))
      return !isLowSurrogate(src.charCodeAt(pos + 1));
    return isLowSurrogate(current) && !isHighSurrogate(src.charCodeAt(pos - 1));
  };

  const isForbiddenCharacter = (current: number): boolean =>
    current < HIGH_SURROGATE_START
      ? isForbiddenControlCharacter(current)
      : isLoneSurrogate(current);

  const skipWhitespace = (): void => {
    while (pos < len) {
      const current = src.charCodeAt(pos);
      if (current === SPACE || current === TAB) pos++;
      else break;
    }
  };

  const skipNewline = (): boolean => {
    if (src.charCodeAt(pos) === LF) {
      pos++;
      return true;
    }
    if (src.charCodeAt(pos) === CR) {
      pos++;
      if (pos < len && src.charCodeAt(pos) === LF) pos++;
      return true;
    }
    return false;
  };

  const skipComment = (): void => {
    if (pos < len && src.charCodeAt(pos) === HASH) {
      pos++;
      while (pos < len) {
        const current = src.charCodeAt(pos);
        if (current === LF || current === CR) break;
        if (isForbiddenCharacter(current))
          failForbiddenCharacter(current, 'comment');
        pos++;
      }
    }
  };

  const skipBlanks = (): void => {
    while (pos < len) {
      const current = src.charCodeAt(pos);
      if (current === SPACE || current === TAB) pos++;
      else if (current === HASH) skipComment();
      else if (!skipNewline()) break;
    }
  };

  const endsLine = (): boolean => {
    skipWhitespace();
    skipComment();
    return pos >= len || skipNewline();
  };

  const readBareKey = (): string => {
    const start = pos;
    while (pos < len && isBareKeyCharacter(src.charCodeAt(pos))) pos++;
    if (pos === start)
      fail(
        'INVALID_KEY',
        `Expected a key here, but found ${describeFound()}. Keys without quotes can only use A-Z, a-z, 0-9, - and _.`
      );
    return src.substring(start, pos);
  };

  const readEscape = (): string => {
    pos++;
    if (pos >= len) return '';
    const current = src.charCodeAt(pos++);
    switch (current) {
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
        return readUnicodeEscape(4, 'u');
      case CHAR_U:
        return readUnicodeEscape(8, 'U');
      case CHAR_x:
        return readUnicodeEscape(2, 'x');
      default:
        return fail(
          'INVALID_ESCAPE',
          `${quoteInput(`\\${String.fromCodePoint(src.codePointAt(pos - 1)!)}`)} is not a valid escape. Write \\\\ for a backslash, or use 'single quotes' to keep backslashes as typed.`,
          pos - 2
        );
    }
  };

  const readUnicodeEscape = (digits: number, letter: string): string => {
    const start = pos;
    for (let cursor = 0; cursor < digits; cursor++) {
      if (pos >= len || !isHexDigit(src.charCodeAt(pos)))
        fail(
          'INVALID_ESCAPE',
          `\\${letter} must be followed by exactly ${digits} hexadecimal digits (0-9, A-F).`,
          start - 2
        );
      pos++;
    }
    const codePoint = Number.parseInt(src.substring(start, pos), 16);
    if (codePoint > MAX_CODE_POINT || isSurrogate(codePoint))
      fail(
        'INVALID_ESCAPE',
        `${quoteInput(src.substring(start - 2, pos))} is not a valid Unicode character.`,
        start - 2
      );
    return String.fromCodePoint(codePoint);
  };

  const readBasicString = (): string => {
    const start = pos;
    pos++;
    let result = '';
    let segment = pos;
    while (pos < len) {
      const current = src.charCodeAt(pos);
      if (current === DOUBLE_QUOTE) {
        result += src.substring(segment, pos);
        pos++;
        return result;
      }
      if (current === BACKSLASH) {
        result += src.substring(segment, pos);
        result += readEscape();
        segment = pos;
      } else if (isForbiddenCharacter(current)) {
        if (current === LF || current === CR) break;
        failForbiddenCharacter(current, 'string');
      } else {
        pos++;
      }
    }
    return fail(
      'UNTERMINATED_STRING',
      'This string is never closed. End it with " on the same line, or use """ for text that spans several lines.',
      start
    );
  };

  const readLiteralString = (): string => {
    const start = pos;
    pos++;
    const segment = pos;
    while (pos < len) {
      const current = src.charCodeAt(pos);
      if (current === SINGLE_QUOTE) {
        const result = src.substring(segment, pos);
        pos++;
        return result;
      }
      if (isForbiddenCharacter(current)) {
        if (current === LF || current === CR) break;
        failForbiddenCharacter(current, 'string');
      }
      pos++;
    }
    return fail(
      'UNTERMINATED_STRING',
      "This string is never closed. End it with ' on the same line, or use ''' for text that spans several lines.",
      start
    );
  };

  const readMultilineString = (quote: number): string => {
    const start = pos;
    pos += 3;
    skipNewline();
    let result = '';
    let segment = pos;
    while (pos < len) {
      const current = src.charCodeAt(pos);
      if (current === quote) {
        let quoteEnd = pos;
        while (quoteEnd < len && src.charCodeAt(quoteEnd) === quote) quoteEnd++;
        const quoteCount = quoteEnd - pos;
        if (quoteCount > 5)
          fail(
            'TOO_MANY_QUOTES',
            'This string ends with too many quotes in a row. At most five can end it: three that close the string and two that belong to the text.'
          );
        pos = quoteEnd;
        if (quoteCount >= 3) return result + src.substring(segment, pos - 3);
      } else if (current === BACKSLASH && quote === DOUBLE_QUOTE) {
        result += src.substring(segment, pos);
        const next = src.charCodeAt(pos + 1);
        if (next === LF || next === CR || next === SPACE || next === TAB) {
          pos++;
          do skipWhitespace();
          while (skipNewline());
        } else {
          result += readEscape();
        }
        segment = pos;
      } else if (current === CR) {
        result += `${src.substring(segment, pos)}\n`;
        skipNewline();
        segment = pos;
      } else if (current !== LF && isForbiddenCharacter(current)) {
        failForbiddenCharacter(current, 'string');
      } else {
        pos++;
      }
    }
    return fail(
      'UNTERMINATED_STRING',
      `This string is never closed. End it with ${quote === DOUBLE_QUOTE ? '"""' : "'''"}.`,
      start
    );
  };

  const isTripleQuote = (quote: number): boolean =>
    src.charCodeAt(pos + 1) === quote && src.charCodeAt(pos + 2) === quote;

  const readString = (quote: number): string => {
    if (isTripleQuote(quote)) return readMultilineString(quote);
    return quote === DOUBLE_QUOTE ? readBasicString() : readLiteralString();
  };

  const readSimpleKey = (): string => {
    const current = src.charCodeAt(pos);
    if (current !== DOUBLE_QUOTE && current !== SINGLE_QUOTE)
      return readBareKey();
    if (isTripleQuote(current))
      fail(
        'INVALID_KEY',
        `A key can't use triple quotes. Use "double" or 'single' quotes instead.`
      );
    return readString(current);
  };

  const refuseConstructorTable = (keys: string[]): void => {
    if (!allowUnsafeKeys && keys[keys.length - 1] === 'constructor')
      failConstructorTable();
  };

  const readDottedKey = (maxParts: number): string[] => {
    const keys: string[] = [];
    while (true) {
      if (keys.length >= maxParts) failTooDeep();
      lastKeyOffset = pos;
      const key = readSimpleKey();
      if (key === '__proto__' && !allowUnsafeKeys)
        fail(
          'INVALID_KEY',
          `"__proto__" can't be used as a key, because copying the result into an ordinary object would replace that object's prototype. Rename it.`,
          lastKeyOffset
        );
      keys.push(key);
      skipWhitespace();
      if (pos >= len || src.charCodeAt(pos) !== DOT) return keys;
      refuseConstructorTable(keys);
      pos++;
      skipWhitespace();
    }
  };

  const readEqualsSign = (): void => {
    skipWhitespace();
    if (pos >= len || src.charCodeAt(pos) !== EQUALS)
      fail(
        'EXPECTED_EQUALS',
        `Expected = after this key, but found ${describeFound()}. Put keys with spaces or symbols inside "quotes".`
      );
    pos++;
    skipWhitespace();
  };

  const readAssignedKey = (maxParts: number): string[] => {
    const keys = readDottedKey(maxParts);
    readEqualsSign();
    if (src.charCodeAt(pos) === LEFT_BRACE) refuseConstructorTable(keys);
    return keys;
  };

  const readDigits = (
    isAllowedDigit: (code: number) => boolean,
    digitName: string
  ): string => {
    const start = pos;
    if (pos >= len || !isAllowedDigit(src.charCodeAt(pos)))
      fail(
        'INVALID_NUMBER',
        `Expected ${digitName} here, but found ${describeFound()}.`
      );
    pos++;
    while (pos < len) {
      const current = src.charCodeAt(pos);
      if (current === UNDERSCORE) {
        if (pos + 1 >= len || !isAllowedDigit(src.charCodeAt(pos + 1)))
          fail(
            'INVALID_NUMBER',
            'An underscore in a number must sit between two digits.'
          );
        pos++;
      } else if (isAllowedDigit(current)) {
        pos++;
      } else {
        break;
      }
    }
    return src.substring(start, pos);
  };

  const validateDate = (date: string, offset: number): void => {
    const year = +date.substring(0, 4);
    const month = +date.substring(5, 7);
    const day = +date.substring(8, 10);
    if (month < 1 || month > 12)
      fail(
        'INVALID_DATE',
        `This date doesn't exist: month ${month} is not between 1 and 12.`,
        offset
      );
    let maxDay = MAX_DAYS[month - 1];
    if (
      month === 2 &&
      ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0)
    )
      maxDay = 29;
    if (day < 1 || day > maxDay)
      fail(
        'INVALID_DATE',
        `This date doesn't exist: month ${month} of ${year} has no day ${day}.`,
        offset
      );
  };

  const validateTime = (time: string, offset: number): void => {
    const hour = +time.substring(0, 2);
    const minute = +time.substring(3, 5);
    const second = +time.substring(6, 8);
    if (hour > 23)
      fail(
        'INVALID_TIME',
        `This time doesn't exist: hour ${hour} is not between 0 and 23.`,
        offset
      );
    if (minute > 59)
      fail(
        'INVALID_TIME',
        `This time doesn't exist: minute ${minute} is not between 0 and 59.`,
        offset
      );
    if (second > 59)
      fail(
        'INVALID_TIME',
        `This time doesn't exist: second ${second} is not between 0 and 59.`,
        offset
      );
  };

  const validateTimeOffset = (timeOffset: string, offset: number): void => {
    if (timeOffset === 'Z') return;
    const hour = +timeOffset.substring(1, 3);
    const minute = +timeOffset.substring(4, 6);
    if (hour > 23)
      fail(
        'INVALID_TIME',
        `This time zone offset doesn't exist: hour ${hour} is not between 0 and 23.`,
        offset
      );
    if (minute > 59)
      fail(
        'INVALID_TIME',
        `This time zone offset doesn't exist: minute ${minute} is not between 0 and 59.`,
        offset
      );
  };

  const startsDate = (): boolean =>
    pos + 10 <= len &&
    isDigit(src.charCodeAt(pos)) &&
    isDigit(src.charCodeAt(pos + 1)) &&
    isDigit(src.charCodeAt(pos + 2)) &&
    isDigit(src.charCodeAt(pos + 3)) &&
    src.charCodeAt(pos + 4) === DASH &&
    isDigit(src.charCodeAt(pos + 5)) &&
    isDigit(src.charCodeAt(pos + 6)) &&
    src.charCodeAt(pos + 7) === DASH &&
    isDigit(src.charCodeAt(pos + 8)) &&
    isDigit(src.charCodeAt(pos + 9));

  const tryReadTime = (): string | undefined => {
    if (
      pos + 5 > len ||
      !isDigit(src.charCodeAt(pos)) ||
      !isDigit(src.charCodeAt(pos + 1)) ||
      src.charCodeAt(pos + 2) !== COLON ||
      !isDigit(src.charCodeAt(pos + 3)) ||
      !isDigit(src.charCodeAt(pos + 4))
    )
      return undefined;

    let time = src.substring(pos, pos + 5);
    pos += 5;

    if (
      pos + 3 <= len &&
      src.charCodeAt(pos) === COLON &&
      isDigit(src.charCodeAt(pos + 1)) &&
      isDigit(src.charCodeAt(pos + 2))
    ) {
      time += src.substring(pos, pos + 3);
      pos += 3;
    } else {
      time += ':00';
    }

    if (
      pos < len &&
      src.charCodeAt(pos) === DOT &&
      pos + 1 < len &&
      isDigit(src.charCodeAt(pos + 1))
    ) {
      const fractionStart = pos;
      pos++;
      while (pos < len && isDigit(src.charCodeAt(pos))) pos++;
      time += src.substring(fractionStart, pos);
    }

    return time;
  };

  const tryReadTimeOffset = (): string | undefined => {
    const current = pos < len ? src.charCodeAt(pos) : 0;
    if (current === CHAR_Z || current === CHAR_z) {
      pos++;
      return 'Z';
    }
    if (
      pos + 6 > len ||
      (current !== PLUS && current !== DASH) ||
      !isDigit(src.charCodeAt(pos + 1)) ||
      !isDigit(src.charCodeAt(pos + 2)) ||
      src.charCodeAt(pos + 3) !== COLON ||
      !isDigit(src.charCodeAt(pos + 4)) ||
      !isDigit(src.charCodeAt(pos + 5))
    )
      return undefined;

    const timeOffset = src.substring(pos, pos + 6);
    pos += 6;
    return timeOffset;
  };

  const tryReadDateOrTime = ():
    | OffsetDateTime
    | LocalDateOrTime
    | undefined => {
    const start = pos;

    if (!startsDate()) {
      const time = tryReadTime();
      if (time === undefined) return undefined;
      validateTime(time, start);
      return new LocalDateOrTime('time', src.substring(start, pos));
    }

    const date = src.substring(pos, pos + 10);
    pos += 10;

    const delimiter = pos < len ? src.charCodeAt(pos) : 0;
    const hasTime =
      delimiter === CHAR_T ||
      delimiter === CHAR_t ||
      (delimiter === SPACE &&
        pos + 1 < len &&
        isDigit(src.charCodeAt(pos + 1)));
    if (!hasTime) {
      validateDate(date, start);
      return new LocalDateOrTime('date', date);
    }

    pos++;
    const time = tryReadTime();
    if (time === undefined) {
      pos = start;
      return undefined;
    }
    validateDate(date, start);
    validateTime(time, start);

    const offsetStart = pos;
    const timeOffset = tryReadTimeOffset();
    if (timeOffset === undefined)
      return new LocalDateOrTime('date-time', src.substring(start, pos));
    validateTimeOffset(timeOffset, offsetStart);
    return new OffsetDateTime(
      `${date}T${time}${timeOffset}`,
      src.substring(start, pos)
    );
  };

  const tryReadSpecialFloat = (): number | undefined => {
    const sign = src.charCodeAt(pos);
    const start = sign === PLUS || sign === DASH ? pos + 1 : pos;
    const first = src.charCodeAt(start);
    if (
      first === CHAR_i &&
      src.charCodeAt(start + 1) === CHAR_n &&
      src.charCodeAt(start + 2) === CHAR_f
    ) {
      pos = start + 3;
      return sign === DASH
        ? Number.NEGATIVE_INFINITY
        : Number.POSITIVE_INFINITY;
    }
    if (
      first === CHAR_n &&
      src.charCodeAt(start + 1) === CHAR_a &&
      src.charCodeAt(start + 2) === CHAR_n
    ) {
      pos = start + 3;
      return Number.NaN;
    }
    return undefined;
  };

  const toBigInt = (
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
      failIntegerRange(start, MIN_INT64, MAX_INT64);
    const magnitude = BigInt(
      `${RADIX_PREFIXES[radix]}${plain.slice(firstSignificant)}`
    );
    const value = sign < 0 ? -magnitude : magnitude;
    if (value < MIN_INT64 || value > MAX_INT64)
      failIntegerRange(start, MIN_INT64, MAX_INT64);
    return value;
  };

  const toInteger = (
    digits: string,
    radix: number,
    sign: number,
    start: number
  ): number | bigint => {
    if (bigint) return toBigInt(digits, radix, sign, start);
    const value = sign * Number.parseInt(stripUnderscores(digits), radix);
    if (!Number.isSafeInteger(value))
      failIntegerRange(start, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
    return value;
  };

  const readExponent = (sign: number, mantissa: string): number => {
    pos++;
    const exponentStart = pos;
    const exponentSign = src.charCodeAt(pos);
    if (exponentSign === PLUS || exponentSign === DASH) pos++;
    readDigits(isDigit, DECIMAL_DIGIT);
    return (
      sign *
      Number.parseFloat(
        `${stripUnderscores(mantissa)}e${stripUnderscores(src.substring(exponentStart, pos))}`
      )
    );
  };

  const readFraction = (sign: number, integerPart: string): number => {
    pos++;
    const mantissa = `${integerPart}.${readDigits(isDigit, DECIMAL_DIGIT)}`;
    if (pos < len && isExponentMarker(src.charCodeAt(pos)))
      return readExponent(sign, mantissa);
    return sign * Number.parseFloat(stripUnderscores(mantissa));
  };

  const readNumber = (): number | bigint => {
    const start = pos;
    const signCode = src.charCodeAt(pos);
    const sign = signCode === DASH ? -1 : 1;
    if (signCode === PLUS || signCode === DASH) pos++;

    const firstDigit = src.charCodeAt(pos);
    if (firstDigit === ZERO) {
      const prefix = pos + 1 < len ? src.charCodeAt(pos + 1) : 0;
      if (prefix === CHAR_x) {
        pos += 2;
        return toInteger(readDigits(isHexDigit, HEX_DIGIT), 16, sign, start);
      }
      if (prefix === CHAR_o) {
        pos += 2;
        return toInteger(readDigits(isOctalDigit, OCTAL_DIGIT), 8, sign, start);
      }
      if (prefix === CHAR_b) {
        pos += 2;
        return toInteger(
          readDigits(isBinaryDigit, BINARY_DIGIT),
          2,
          sign,
          start
        );
      }
      pos++;
      if (pos < len) {
        const afterZero = src.charCodeAt(pos);
        if (isDigit(afterZero) || afterZero === UNDERSCORE)
          fail(
            'INVALID_NUMBER',
            'A number can only start with 0 when it is exactly 0. Remove the leading zeros.',
            start
          );
        if (afterZero === DOT) return readFraction(sign, '0');
        if (isExponentMarker(afterZero)) return readExponent(sign, '0');
      }
      return bigint ? 0n : 0;
    }

    if (!isDigit(firstDigit)) {
      if (pos > start)
        fail(
          'INVALID_NUMBER',
          `Expected a digit after the sign, but found ${describeFound()}.`
        );
      failInvalidValue();
    }
    const integerDigits = readDigits(isDigit, DECIMAL_DIGIT);
    if (pos < len) {
      const afterInteger = src.charCodeAt(pos);
      if (afterInteger === DOT) return readFraction(sign, integerDigits);
      if (isExponentMarker(afterInteger))
        return readExponent(sign, integerDigits);
    }
    return toInteger(integerDigits, 10, sign, start);
  };

  const readNumberOrDate = ():
    | number
    | bigint
    | OffsetDateTime
    | LocalDateOrTime =>
    tryReadSpecialFloat() ?? tryReadDateOrTime() ?? readNumber();

  const readValue = (depth: number): unknown => {
    if (pos >= len) return failMissingValue();
    const current = src.charCodeAt(pos);

    if (current === DOUBLE_QUOTE || current === SINGLE_QUOTE)
      return readString(current);
    if (current === CHAR_t) {
      if (
        src.charCodeAt(pos + 1) === CHAR_r &&
        src.charCodeAt(pos + 2) === CHAR_u &&
        src.charCodeAt(pos + 3) === CHAR_e
      ) {
        pos += 4;
        return true;
      }
      failInvalidValue();
    }
    if (current === CHAR_f) {
      if (
        src.charCodeAt(pos + 1) === CHAR_a &&
        src.charCodeAt(pos + 2) === CHAR_l &&
        src.charCodeAt(pos + 3) === CHAR_s &&
        src.charCodeAt(pos + 4) === CHAR_e
      ) {
        pos += 5;
        return false;
      }
      failInvalidValue();
    }
    if (current === LEFT_BRACKET) return readArray(depth);
    if (current === LEFT_BRACE) return readInlineTable(depth);
    if (
      isDigit(current) ||
      current === PLUS ||
      current === DASH ||
      current === CHAR_i ||
      current === CHAR_n
    )
      return readNumberOrDate();

    if (isBareKeyCharacter(current)) failInvalidValue();
    return failMissingValue();
  };

  const readArray = (depth: number): unknown[] => {
    const start = pos;
    if (depth > maxDepth) failTooDeep();
    pos++;
    const result: unknown[] = [];
    while (true) {
      skipBlanks();
      if (pos >= len) failUnterminatedArray(start);
      if (src.charCodeAt(pos) === RIGHT_BRACKET) {
        pos++;
        return result;
      }
      result.push(readValue(depth + 1));
      skipBlanks();
      if (pos >= len) failUnterminatedArray(start);
      const separator = src.charCodeAt(pos);
      if (separator === RIGHT_BRACKET) {
        pos++;
        return result;
      }
      if (separator !== COMMA)
        fail(
          'EXPECTED_COMMA',
          `Expected a comma or ] here, but found ${describeFound()}. Separate items with commas and close the array with ].`
        );
      pos++;
    }
  };

  const readInlineTable = (depth: number): Record<string, unknown> => {
    const start = pos;
    if (depth > maxDepth) failTooDeep();
    pos++;
    const table: Record<string, unknown> = Object.create(null);
    const tableMeta = createMetaNode();
    while (true) {
      skipBlanks();
      if (pos >= len) failUnterminatedInlineTable(start);
      if (src.charCodeAt(pos) === RIGHT_BRACE) {
        pos++;
        return table;
      }
      readInlineTableEntry(table, tableMeta, depth);
      skipBlanks();
      if (pos >= len) failUnterminatedInlineTable(start);
      const separator = src.charCodeAt(pos);
      if (separator === RIGHT_BRACE) {
        pos++;
        return table;
      }
      if (separator !== COMMA)
        fail(
          'EXPECTED_COMMA',
          `Expected a comma or } here, but found ${describeFound()}. Separate entries with commas and close the table with }.`
        );
      pos++;
    }
  };

  const readInlineTableEntry = (
    table: Record<string, unknown>,
    tableMeta: MetaNode,
    depth: number
  ): void => {
    const offset = pos;
    const keys = readAssignedKey(maxDepth - depth + 1);
    const value = readValue(depth + keys.length);
    assignInlineKeyValue(table, keys, value, offset, tableMeta);
  };

  const assignInlineKeyValue = (
    table: Record<string, unknown>,
    keys: string[],
    value: unknown,
    offset: number,
    tableMeta: MetaNode
  ): void => {
    const lastIndex = keys.length - 1;
    let target = table;
    let meta = tableMeta;
    for (let depth = 0; depth < lastIndex; depth++) {
      const key = keys[depth];
      if (target[key] === undefined) target[key] = Object.create(null);
      else if (meta.children[key]?.holdsValue)
        failAlreadySet(keys.slice(0, depth + 1), offset);
      meta = ensureChildMeta(meta, key);
      target = target[key] as Record<string, unknown>;
    }
    const lastKey = keys[lastIndex];
    if (target[lastKey] !== undefined) failDefinedTwice(keys, offset);
    target[lastKey] = value;
    ensureChildMeta(meta, lastKey).holdsValue = true;
  };

  const assignKeyValue = (
    keys: string[],
    value: unknown,
    offset: number
  ): void => {
    const lastIndex = keys.length - 1;
    let target = context;
    let meta = contextMeta;
    for (let depth = 0; depth < lastIndex; depth++) {
      const key = keys[depth];
      const existing = target[key];
      const known = meta.children[key];
      if (existing === undefined) target[key] = Object.create(null);
      else if (
        typeof existing !== 'object' ||
        Array.isArray(existing) ||
        known?.holdsValue
      )
        failAlreadySet(contextKeys.concat(keys.slice(0, depth + 1)), offset);
      else if (known?.explicit)
        fail(
          'DUPLICATE_KEY',
          `${quoteInput(formatPath(contextKeys.concat(keys.slice(0, depth + 1))))} already has its own [section], so add this key under that section instead.`,
          offset
        );
      meta = ensureChildMeta(meta, key);
      if (existing === undefined || !known) meta.assigned = true;
      target = target[key] as Record<string, unknown>;
    }

    const lastKey = keys[lastIndex];
    if (target[lastKey] !== undefined)
      failDefinedTwice(contextKeys.concat(keys), offset);
    target[lastKey] = value;
    const lastMeta = ensureChildMeta(meta, lastKey);
    lastMeta.assigned = true;
    lastMeta.holdsValue = true;
  };

  const resolveHeader = (
    keys: string[],
    levelsBelow: number,
    offset: number
  ): MetaNode => {
    let meta = metaRoot;
    let depth = levelsBelow;
    for (const key of keys) {
      depth += meta.tableArray ? 2 : 1;
      meta = ensureChildMeta(meta, key);
    }
    if (depth > maxDepth) failTooDeep(offset);
    contextDepth = depth;
    return meta;
  };

  const resolveHeaderTarget = (
    keys: string[],
    emptyValue: unknown,
    offset: number
  ): unknown => {
    const lastIndex = keys.length - 1;
    let table = root;
    let meta = metaRoot;
    for (let depth = 0; depth < lastIndex; depth++) {
      const key = keys[depth];
      meta = meta.children[key];
      if (table[key] === undefined) table[key] = Object.create(null);
      else if (meta.holdsValue)
        failAlreadySet(keys.slice(0, depth + 1), offset);
      const child = table[key];
      table = (
        Array.isArray(child) && child.length > 0
          ? child[child.length - 1]
          : child
      ) as Record<string, unknown>;
    }
    const lastKey = keys[lastIndex];
    if (table[lastKey] === undefined) table[lastKey] = emptyValue;
    return table[lastKey];
  };

  const setTablePath = (keys: string[], offset: number): void => {
    const meta = resolveHeader(keys, 0, offset);
    if (meta.assigned)
      fail(
        'DUPLICATE_KEY',
        `${quoteInput(formatPath(keys))} is already defined earlier in the file, so it can't start a new [section] here.`,
        offset
      );
    meta.assigned = true;
    meta.explicit = true;
    context = resolveHeaderTarget(keys, Object.create(null), offset) as Record<
      string,
      unknown
    >;
    contextKeys = keys;
    contextMeta = meta;
  };

  const addTableArray = (keys: string[], offset: number): void => {
    const meta = resolveHeader(keys, 1, offset);
    if (meta.holdsValue)
      fail(
        'DUPLICATE_KEY',
        `${quoteInput(formatPath(keys))} is already set to a value, so [[ ]] can't add tables to it.`,
        offset
      );
    meta.children = Object.create(null);
    meta.assigned = true;
    meta.tableArray = true;
    const tables = resolveHeaderTarget(keys, [], offset);
    if (!Array.isArray(tables))
      fail(
        'DUPLICATE_KEY',
        `${quoteInput(formatPath(keys))} is already defined as a single table, so [[ ]] can't add tables to it.`,
        offset
      );
    const table: Record<string, unknown> = Object.create(null);
    (tables as unknown[]).push(table);
    context = table;
    contextKeys = keys;
    contextMeta = meta;
  };

  const readTableHeader = (): void => {
    const offset = pos;
    pos++;
    const isArrayTable = pos < len && src.charCodeAt(pos) === LEFT_BRACKET;
    if (isArrayTable) pos++;
    skipWhitespace();
    const keys = readDottedKey(isArrayTable ? maxDepth - 1 : maxDepth);
    if (!isArrayTable) refuseConstructorTable(keys);
    skipWhitespace();
    if (pos >= len || src.charCodeAt(pos) !== RIGHT_BRACKET)
      fail(
        'INVALID_TABLE_HEADER',
        `Expected ] to close this table name, but found ${describeFound()}. Put names with spaces or symbols inside "quotes".`
      );
    pos++;
    if (isArrayTable) {
      if (pos >= len || src.charCodeAt(pos) !== RIGHT_BRACKET)
        fail(
          'INVALID_TABLE_HEADER',
          `Expected ]] to close this table name, but found ${describeFound()}.`
        );
      pos++;
    }
    if (!endsLine())
      fail(
        'EXPECTED_NEWLINE',
        `Expected the end of the line after this table name, but found ${describeFound()}. Put the next key on its own line.`
      );
    if (isArrayTable) addTableArray(keys, offset);
    else setTablePath(keys, offset);
  };

  const readKeyValue = (): void => {
    const offset = pos;
    const keys = readAssignedKey(maxDepth - contextDepth + 1);
    const value = readValue(contextDepth + keys.length);
    assignKeyValue(keys, value, offset);
    if (!endsLine())
      fail(
        'EXPECTED_NEWLINE',
        `Expected the end of the line after this value, but found ${describeFound()}. Put each key = value on its own line, and start comments with #.`
      );
  };

  while (pos < len) {
    skipWhitespace();
    if (pos >= len) break;
    const current = src.charCodeAt(pos);
    if (current === LF || current === CR) {
      skipNewline();
      continue;
    }
    if (current === HASH) {
      skipComment();
      if (pos < len) skipNewline();
      continue;
    }
    if (current === LEFT_BRACKET) readTableHeader();
    else readKeyValue();
  }

  return root as T;
};
