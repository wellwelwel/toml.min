import type { MetaNode } from './types.js';

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
const COLON = 0x3a;
const EQUALS = 0x3d;
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
const BOM = 0xfeff;

const isBareKeyChar = (code: number): boolean =>
  (code >= 0x41 && code <= 0x5a) || // A-Z
  (code >= 0x61 && code <= 0x7a) || // a-z
  (code >= 0x30 && code <= 0x39) || // 0-9
  code === DASH ||
  code === UNDERSCORE;

const isDigit = (code: number): boolean => code >= 0x30 && code <= 0x39;

const isHexDigit = (code: number): boolean =>
  (code >= 0x30 && code <= 0x39) || // 0-9
  (code >= 0x41 && code <= 0x46) || // A-F
  (code >= 0x61 && code <= 0x66); // a-f

const isOctDigit = (code: number): boolean => code >= 0x30 && code <= 0x37;

const isBinDigit = (code: number): boolean => code === 0x30 || code === 0x31;

const stripUnderscores = (source: string): string =>
  source.indexOf('_') === -1 ? source : source.replace(/_/g, '');

const MAX_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export const parse = <T = unknown>(input: string): T => {
  if (typeof input !== 'string') throw new TypeError('source is not a string');

  const src = input.charCodeAt(0) === BOM ? input.slice(1) : input;
  const len = src.length;
  const root: Record<string, unknown> = Object.create(null);

  let pos = 0;
  let currentPath = '';
  let context: Record<string, unknown> = root;

  const createMetaNode = (): MetaNode => ({
    assigned: false,
    value: false,
    explicit: false,
    children: Object.create(null),
  });
  const metaRoot = createMetaNode();
  let currentMeta: MetaNode = metaRoot;

  const fail = (msg: string, errorOffset?: number): never => {
    const offset = errorOffset === undefined ? pos : errorOffset;
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
    const error = new Error(msg) as Error & { line: number; column: number };
    error.line = line;
    error.column = column;
    throw error;
  };

  const skipWs = (): void => {
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
        if (current !== TAB && (current < SPACE || current === DEL))
          fail('Invalid character in comment');
        pos++;
      }
    }
  };

  const skipBlanks = (): void => {
    while (pos < len) {
      const current = src.charCodeAt(pos);
      if (current === SPACE || current === TAB || current === LF) {
        pos++;
      } else if (current === CR) {
        pos++;
        if (pos < len && src.charCodeAt(pos) === LF) pos++;
      } else if (current === HASH) {
        skipComment();
      } else {
        break;
      }
    }
  };

  const readBareKey = (): string => {
    const start = pos;
    while (pos < len && isBareKeyChar(src.charCodeAt(pos))) pos++;
    if (pos === start) fail('Expected a key');
    return src.substring(start, pos);
  };

  const readEscape = (): string => {
    pos++; // skip backslash
    if (pos >= len) fail('Unexpected end of input in escape sequence');
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
        return readUnicodeEscape(4);
      case CHAR_U:
        return readUnicodeEscape(8);
      case CHAR_x:
        return readUnicodeEscape(2);
      default:
        return fail(
          `Invalid escape sequence: \\${String.fromCharCode(current)}`,
          pos - 2
        );
    }
  };

  const readUnicodeEscape = (digits: number): string => {
    const start = pos;
    for (let cursor = 0; cursor < digits; cursor++) {
      if (pos >= len || !isHexDigit(src.charCodeAt(pos)))
        fail('Invalid Unicode escape');
      pos++;
    }
    const codePoint = Number.parseInt(src.substring(start, pos), 16);
    if (codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff))
      fail(
        `Invalid Unicode code point: ${src.substring(start, pos)}`,
        start - 2
      );
    return String.fromCodePoint(codePoint);
  };

  const readBasicString = (): string => {
    pos++; // skip opening "
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
      } else if (
        current === LF ||
        current === CR ||
        (current < SPACE && current !== TAB) ||
        current === DEL
      ) {
        fail('Invalid character in basic string');
      } else {
        pos++;
      }
    }
    return fail('Unterminated basic string');
  };

  const readMultilineBasicString = (): string => {
    pos += 3; // skip """
    if (pos < len && src.charCodeAt(pos) === LF) pos++;
    else if (pos < len && src.charCodeAt(pos) === CR) {
      pos++;
      if (pos < len && src.charCodeAt(pos) === LF) pos++;
    }

    let result = '';
    let segment = pos;
    while (pos < len) {
      const current = src.charCodeAt(pos);
      if (current === DOUBLE_QUOTE) {
        let quoteCount = 0;
        while (
          pos + quoteCount < len &&
          src.charCodeAt(pos + quoteCount) === DOUBLE_QUOTE
        )
          quoteCount++;
        if (quoteCount >= 3) {
          const extra = quoteCount - 3;
          if (extra > 2) fail('Too many quotes in multiline basic string');
          result += src.substring(segment, pos);
          for (let cursor = 0; cursor < extra; cursor++) result += '"';
          pos += quoteCount;
          return result;
        }
        pos++;
      } else if (current === BACKSLASH) {
        result += src.substring(segment, pos);
        const nextChar = pos + 1 < len ? src.charCodeAt(pos + 1) : 0;
        if (
          nextChar === LF ||
          nextChar === CR ||
          nextChar === SPACE ||
          nextChar === TAB
        ) {
          pos++; // skip backslash
          while (pos < len) {
            const wsChar = src.charCodeAt(pos);
            if (wsChar === SPACE || wsChar === TAB) {
              pos++;
            } else if (wsChar === LF) {
              pos++;
              break;
            } else if (wsChar === CR) {
              pos++;
              if (pos < len && src.charCodeAt(pos) === LF) pos++;
              break;
            } else {
              break;
            }
          }
          while (pos < len) {
            const wsChar = src.charCodeAt(pos);
            if (wsChar === SPACE || wsChar === TAB || wsChar === LF) {
              pos++;
            } else if (wsChar === CR) {
              pos++;
              if (pos < len && src.charCodeAt(pos) === LF) pos++;
            } else {
              break;
            }
          }
        } else {
          result += readEscape();
        }
        segment = pos;
      } else if (current === CR) {
        result += src.substring(segment, pos);
        result += '\n';
        pos++;
        if (pos < len && src.charCodeAt(pos) === LF) pos++;
        segment = pos;
      } else if (
        (current < SPACE && current !== TAB && current !== LF) ||
        current === DEL
      ) {
        fail('Invalid character in multiline basic string');
      } else {
        pos++;
      }
    }
    return fail('Unterminated multiline basic string');
  };

  const readLiteralString = (): string => {
    pos++; // skip '
    const segment = pos;
    while (pos < len) {
      const current = src.charCodeAt(pos);
      if (current === SINGLE_QUOTE) {
        const result = src.substring(segment, pos);
        pos++;
        return result;
      }
      if (
        current === LF ||
        current === CR ||
        (current < SPACE && current !== TAB) ||
        current === DEL
      )
        fail('Invalid character in literal string');
      pos++;
    }
    return fail('Unterminated literal string');
  };

  const readMultilineLiteralString = (): string => {
    pos += 3; // skip '''
    if (pos < len && src.charCodeAt(pos) === LF) pos++;
    else if (pos < len && src.charCodeAt(pos) === CR) {
      pos++;
      if (pos < len && src.charCodeAt(pos) === LF) pos++;
    }

    let result = '';
    let segment = pos;
    while (pos < len) {
      const current = src.charCodeAt(pos);
      if (current === SINGLE_QUOTE) {
        let quoteCount = 0;
        while (
          pos + quoteCount < len &&
          src.charCodeAt(pos + quoteCount) === SINGLE_QUOTE
        )
          quoteCount++;
        if (quoteCount >= 3) {
          const extra = quoteCount - 3;
          if (extra > 2) fail('Too many quotes in multiline literal string');
          result += src.substring(segment, pos);
          for (let cursor = 0; cursor < extra; cursor++) result += "'";
          pos += quoteCount;
          return result;
        }
        pos++;
      } else if (current === CR) {
        result += src.substring(segment, pos);
        result += '\n';
        pos++;
        if (pos < len && src.charCodeAt(pos) === LF) pos++;
        segment = pos;
      } else if (
        (current < SPACE && current !== TAB && current !== LF) ||
        current === DEL
      ) {
        fail('Invalid character in multiline literal string');
      } else {
        pos++;
      }
    }
    return fail('Unterminated multiline literal string');
  };

  const readString = (): string => {
    const current = src.charCodeAt(pos);
    if (current === DOUBLE_QUOTE) {
      if (
        src.charCodeAt(pos + 1) === DOUBLE_QUOTE &&
        src.charCodeAt(pos + 2) === DOUBLE_QUOTE
      )
        return readMultilineBasicString();
      return readBasicString();
    }
    if (current === SINGLE_QUOTE) {
      if (
        src.charCodeAt(pos + 1) === SINGLE_QUOTE &&
        src.charCodeAt(pos + 2) === SINGLE_QUOTE
      )
        return readMultilineLiteralString();
      return readLiteralString();
    }
    return fail('Expected string');
  };

  const readSimpleKey = (): string => {
    const current = src.charCodeAt(pos);
    if (current === DOUBLE_QUOTE) {
      if (
        src.charCodeAt(pos + 1) === DOUBLE_QUOTE &&
        src.charCodeAt(pos + 2) === DOUBLE_QUOTE
      )
        fail('Multiline strings not allowed in keys');
      return readBasicString();
    }
    if (current === SINGLE_QUOTE) {
      if (
        src.charCodeAt(pos + 1) === SINGLE_QUOTE &&
        src.charCodeAt(pos + 2) === SINGLE_QUOTE
      )
        fail('Multiline strings not allowed in keys');
      return readLiteralString();
    }
    return readBareKey();
  };

  const readDottedKey = (): string[] => {
    const keys = [readSimpleKey()];
    while (true) {
      skipWs();
      if (pos >= len || src.charCodeAt(pos) !== DOT) break;
      pos++; // skip .
      skipWs();
      keys.push(readSimpleKey());
    }
    return keys;
  };

  const readDigits = (
    check: (code: number) => boolean,
    name: string
  ): string => {
    const start = pos;
    if (pos >= len || !check(src.charCodeAt(pos)))
      fail(`Expected ${name} digit`);
    pos++;
    while (pos < len) {
      const current = src.charCodeAt(pos);
      if (current === UNDERSCORE) {
        if (pos + 1 >= len || !check(src.charCodeAt(pos + 1)))
          fail(`Invalid underscore in ${name}`);
        pos++;
      } else if (check(current)) {
        pos++;
      } else {
        break;
      }
    }
    return src.substring(start, pos);
  };

  const validateDate = (dateStr: string, offset: number): void => {
    const year = +dateStr.substring(0, 4);
    const month = +dateStr.substring(5, 7);
    const day = +dateStr.substring(8, 10);
    if (month < 1 || month > 12)
      fail(`Invalid date: month ${month} out of range.`, offset);
    let maxDay = MAX_DAYS[month - 1];
    if (
      month === 2 &&
      ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0)
    )
      maxDay = 29;
    if (day < 1 || day > maxDay)
      fail(`Invalid date: day ${day} out of range for month ${month}.`, offset);
  };

  const validateTime = (timeStr: string, offset: number): void => {
    const hour = +timeStr.substring(0, 2);
    const minute = +timeStr.substring(3, 5);
    const second = +timeStr.substring(6, 8);
    if (hour > 23) fail(`Invalid time: hour ${hour} out of range.`, offset);
    if (minute > 59)
      fail(`Invalid time: minute ${minute} out of range.`, offset);
    if (second > 59)
      fail(`Invalid time: second ${second} out of range.`, offset);
  };

  const validateOffset = (offsetStr: string, offset: number): void => {
    if (offsetStr === 'Z' || offsetStr === 'z') return;
    const hour = +offsetStr.substring(1, 3);
    const minute = +offsetStr.substring(4, 6);
    if (hour > 23) fail(`Invalid offset: hour ${hour} out of range.`, offset);
    if (minute > 59)
      fail(`Invalid offset: minute ${minute} out of range.`, offset);
  };

  const tryReadDatetime = (): unknown | undefined => {
    const saved = pos;

    // Try date_part: YYYY-MM-DD
    if (
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
      isDigit(src.charCodeAt(pos + 9))
    ) {
      const datePart = src.substring(pos, pos + 10);
      pos += 10;

      // Check for datetime delimiter: T, t, or space followed by digit
      const delimiter = pos < len ? src.charCodeAt(pos) : 0;
      if (
        delimiter === CHAR_T ||
        delimiter === CHAR_t ||
        (delimiter === SPACE &&
          pos + 1 < len &&
          isDigit(src.charCodeAt(pos + 1)))
      ) {
        pos++; // skip delimiter
        const timeResult = tryReadTimePart();
        if (timeResult === undefined) {
          pos = saved;
          return undefined;
        }

        const offsetPos = pos;
        // Check for offset
        const offsetChar = pos < len ? src.charCodeAt(pos) : 0;
        if (offsetChar === CHAR_Z || offsetChar === CHAR_z) {
          pos++;
          validateDate(datePart, saved);
          validateTime(timeResult, saved);
          validateOffset('Z', offsetPos);
          return new Date(`${datePart}T${timeResult}Z`);
        }
        if (offsetChar === PLUS || offsetChar === DASH) {
          const offsetResult = tryReadOffset();
          if (offsetResult !== undefined) {
            validateDate(datePart, saved);
            validateTime(timeResult, saved);
            validateOffset(offsetResult, offsetPos);
            return new Date(`${datePart}T${timeResult}${offsetResult}`);
          }
        }
        // Local datetime
        validateDate(datePart, saved);
        validateTime(timeResult, saved);
        return `${datePart}T${timeResult}`;
      }

      // Local date
      validateDate(datePart, saved);
      return datePart;
    }

    // Try local time: HH:MM[:SS[.frac]]
    if (
      pos + 5 <= len &&
      isDigit(src.charCodeAt(pos)) &&
      isDigit(src.charCodeAt(pos + 1)) &&
      src.charCodeAt(pos + 2) === COLON &&
      isDigit(src.charCodeAt(pos + 3)) &&
      isDigit(src.charCodeAt(pos + 4))
    ) {
      const timeResult = tryReadTimePart();
      if (timeResult !== undefined) {
        validateTime(timeResult, saved);
        return timeResult;
      }
    }

    pos = saved;
    return undefined;
  };

  const tryReadTimePart = (): string | undefined => {
    // HH:MM
    if (
      pos + 5 > len ||
      !isDigit(src.charCodeAt(pos)) ||
      !isDigit(src.charCodeAt(pos + 1)) ||
      src.charCodeAt(pos + 2) !== COLON ||
      !isDigit(src.charCodeAt(pos + 3)) ||
      !isDigit(src.charCodeAt(pos + 4))
    )
      return undefined;

    let result = src.substring(pos, pos + 5);
    pos += 5;

    // :SS
    if (
      pos + 3 <= len &&
      src.charCodeAt(pos) === COLON &&
      isDigit(src.charCodeAt(pos + 1)) &&
      isDigit(src.charCodeAt(pos + 2))
    ) {
      result += src.substring(pos, pos + 3);
      pos += 3;
    } else {
      result += ':00';
    }

    // .fraction
    if (
      pos < len &&
      src.charCodeAt(pos) === DOT &&
      pos + 1 < len &&
      isDigit(src.charCodeAt(pos + 1))
    ) {
      const fracStart = pos;
      pos++; // skip .
      while (pos < len && isDigit(src.charCodeAt(pos))) pos++;
      result += src.substring(fracStart, pos);
    }

    return result;
  };

  const tryReadOffset = (): string | undefined => {
    // +HH:MM or -HH:MM
    if (
      pos + 6 > len ||
      (src.charCodeAt(pos) !== PLUS && src.charCodeAt(pos) !== DASH) ||
      !isDigit(src.charCodeAt(pos + 1)) ||
      !isDigit(src.charCodeAt(pos + 2)) ||
      src.charCodeAt(pos + 3) !== COLON ||
      !isDigit(src.charCodeAt(pos + 4)) ||
      !isDigit(src.charCodeAt(pos + 5))
    )
      return undefined;

    const result = src.substring(pos, pos + 6);
    pos += 6;
    return result;
  };

  const readNumberOrDate = (): unknown => {
    const current = src.charCodeAt(pos);

    // inf/nan with optional sign
    if (current === PLUS || current === DASH) {
      if (
        src.charCodeAt(pos + 1) === CHAR_i &&
        src.charCodeAt(pos + 2) === CHAR_n &&
        src.charCodeAt(pos + 3) === CHAR_f
      ) {
        const sign = current === DASH ? -1 : 1;
        pos += 4;
        return sign * Number.POSITIVE_INFINITY;
      }
      if (
        src.charCodeAt(pos + 1) === CHAR_n &&
        src.charCodeAt(pos + 2) === CHAR_a &&
        src.charCodeAt(pos + 3) === CHAR_n
      ) {
        pos += 4;
        return Number.NaN;
      }
    }
    if (
      src.charCodeAt(pos) === CHAR_i &&
      src.charCodeAt(pos + 1) === CHAR_n &&
      src.charCodeAt(pos + 2) === CHAR_f
    ) {
      pos += 3;
      return Number.POSITIVE_INFINITY;
    }
    if (
      src.charCodeAt(pos) === CHAR_n &&
      src.charCodeAt(pos + 1) === CHAR_a &&
      src.charCodeAt(pos + 2) === CHAR_n
    ) {
      pos += 3;
      return Number.NaN;
    }

    // Try datetime first
    const saved = pos;
    const datetime = tryReadDatetime();
    if (datetime !== undefined) return datetime;
    pos = saved;

    // Numbers
    return readNumber();
  };

  const readNumber = (): number => {
    let sign = 1;
    const current = src.charCodeAt(pos);

    if (current === PLUS || current === DASH) {
      if (current === DASH) sign = -1;
      pos++;
    }

    const firstDigit = src.charCodeAt(pos);
    if (firstDigit === ZERO) {
      const nextChar = pos + 1 < len ? src.charCodeAt(pos + 1) : 0;
      if (nextChar === CHAR_x) {
        // 0x hex
        pos += 2;
        const digits = readDigits(isHexDigit, 'hexadecimal');
        return sign * Number.parseInt(stripUnderscores(digits), 16);
      }
      if (nextChar === CHAR_o) {
        // 0o octal
        pos += 2;
        const digits = readDigits(isOctDigit, 'octal');
        return sign * Number.parseInt(stripUnderscores(digits), 8);
      }
      if (nextChar === CHAR_b) {
        // 0b binary
        pos += 2;
        const digits = readDigits(isBinDigit, 'binary');
        return sign * Number.parseInt(stripUnderscores(digits), 2);
      }
      // Bare 0
      pos++;
      if (pos < len) {
        const afterZero = src.charCodeAt(pos);
        if (isDigit(afterZero) || afterZero === UNDERSCORE)
          fail('Leading zeros are not allowed');
        if (afterZero === DOT) return readFloatFrac(sign, '0');
        if (afterZero === CHAR_e || afterZero === 0x45)
          // e, E
          return readFloatExp(sign, '0');
      }
      return 0;
    }

    if (!isDigit(firstDigit)) fail('Expected digit');
    const intDigits = readDigits(isDigit, 'decimal');

    if (pos < len) {
      const afterInt = src.charCodeAt(pos);
      if (afterInt === DOT) return readFloatFrac(sign, intDigits);
      if (afterInt === CHAR_e || afterInt === 0x45)
        // e, E
        return readFloatExp(sign, intDigits);
    }

    return sign * Number.parseInt(stripUnderscores(intDigits), 10);
  };

  const readFloatFrac = (sign: number, intPart: string): number => {
    pos++; // skip .
    const fracDigits = readDigits(isDigit, 'decimal');
    const combined = `${intPart}.${fracDigits}`;

    if (pos < len) {
      const afterFrac = src.charCodeAt(pos);
      if (afterFrac === CHAR_e || afterFrac === 0x45)
        // e, E
        return readFloatExp(sign, combined);
    }

    return sign * Number.parseFloat(stripUnderscores(combined));
  };

  const readFloatExp = (sign: number, mantissa: string): number => {
    pos++; // skip e/E
    let expSign = '';
    if (pos < len) {
      const signChar = src.charCodeAt(pos);
      if (signChar === PLUS) {
        expSign = '+';
        pos++;
      } else if (signChar === DASH) {
        expSign = '-';
        pos++;
      }
    }
    const expDigits = readDigits(isDigit, 'exponent');
    return (
      sign *
      Number.parseFloat(
        `${stripUnderscores(mantissa)}e${expSign}${stripUnderscores(expDigits)}`
      )
    );
  };

  const readValue = (): unknown => {
    if (pos >= len) fail('Expected value');
    const current = src.charCodeAt(pos);

    if (current === DOUBLE_QUOTE || current === SINGLE_QUOTE)
      return readString();
    if (current === CHAR_t) {
      // true
      if (
        src.charCodeAt(pos + 1) === CHAR_r &&
        src.charCodeAt(pos + 2) === CHAR_u &&
        src.charCodeAt(pos + 3) === CHAR_e
      ) {
        pos += 4;
        return true;
      }
      fail('Invalid value');
    }
    if (current === CHAR_f) {
      // false
      if (
        src.charCodeAt(pos + 1) === CHAR_a &&
        src.charCodeAt(pos + 2) === CHAR_l &&
        src.charCodeAt(pos + 3) === CHAR_s &&
        src.charCodeAt(pos + 4) === CHAR_e
      ) {
        pos += 5;
        return false;
      }
      fail('Invalid value');
    }
    if (current === LEFT_BRACKET) return readArray();
    if (current === LEFT_BRACE) return readInlineTable();

    // number or date
    if (
      isDigit(current) ||
      current === PLUS ||
      current === DASH ||
      current === CHAR_i || // inf
      current === CHAR_n // nan
    )
      return readNumberOrDate();

    fail(`Unexpected character: ${src[pos]}`);
  };

  const readArray = (): unknown[] => {
    pos++; // skip [
    const result: unknown[] = [];
    skipBlanks();
    if (pos < len && src.charCodeAt(pos) === RIGHT_BRACKET) {
      pos++;
      return result;
    }
    result.push(readValue());
    while (true) {
      skipBlanks();
      if (pos >= len) fail('Unterminated array');
      if (src.charCodeAt(pos) === RIGHT_BRACKET) {
        pos++;
        return result;
      }
      if (src.charCodeAt(pos) !== COMMA) fail('Expected comma or ] in array');
      pos++; // skip ,
      skipBlanks();
      if (pos < len && src.charCodeAt(pos) === RIGHT_BRACKET) {
        pos++;
        return result;
      }
      result.push(readValue());
    }
  };

  const readInlineTable = (): Record<string, unknown> => {
    pos++; // skip {
    const table: Record<string, unknown> = Object.create(null);
    const definedKeys = new Set<string>();
    skipBlanks();
    if (pos < len && src.charCodeAt(pos) === RIGHT_BRACE) {
      pos++;
      return table;
    }
    readInlineTableEntry(table, definedKeys);
    while (true) {
      skipBlanks();
      if (pos >= len) fail('Unterminated inline table');
      if (src.charCodeAt(pos) === RIGHT_BRACE) {
        pos++;
        return table;
      }
      if (src.charCodeAt(pos) !== COMMA)
        fail('Expected comma or } in inline table');
      pos++; // skip ,
      skipBlanks();
      if (pos < len && src.charCodeAt(pos) === RIGHT_BRACE) {
        pos++;
        return table;
      }
      readInlineTableEntry(table, definedKeys);
    }
  };

  const readInlineTableEntry = (
    table: Record<string, unknown>,
    definedKeys: Set<string>
  ): void => {
    const offset = pos;
    const keys = readDottedKey();
    skipWs();
    if (pos >= len || src.charCodeAt(pos) !== EQUALS)
      fail('Expected = after key');
    pos++; // skip =
    skipWs();
    const value = readValue();
    setNestedKey(table, keys, value, offset, definedKeys);
    definedKeys.add(keys.join('.'));
  };

  const setNestedKey = (
    table: Record<string, unknown>,
    keys: string[],
    value: unknown,
    offset: number,
    definedKeys: Set<string>
  ): void => {
    let target = table;
    let buildPath = '';
    for (let depth = 0; depth < keys.length - 1; depth++) {
      const key = keys[depth];
      buildPath = buildPath ? `${buildPath}.${key}` : key;
      if (target[key] === undefined) {
        target[key] = Object.create(null);
      } else if (
        typeof target[key] !== 'object' ||
        target[key] === null ||
        Array.isArray(target[key])
      ) {
        fail(`Cannot redefine existing key '${buildPath}'.`, offset);
      } else if (definedKeys.has(buildPath)) {
        fail(`Cannot extend inline table '${buildPath}'.`, offset);
      }
      target = target[key] as Record<string, unknown>;
    }
    const lastKey = keys[keys.length - 1];
    const fullPath = buildPath ? `${buildPath}.${lastKey}` : lastKey;
    if (target[lastKey] !== undefined)
      fail(`Cannot redefine existing key '${fullPath}'.`, offset);
    target[lastKey] = value;
  };

  // --- Compiler logic ---

  const buildQuotedPath = (keys: string[]): string => {
    let path = keys[0].indexOf('.') > -1 ? `"${keys[0]}"` : keys[0];
    for (let depth = 1; depth < keys.length; depth++) {
      const key = keys[depth];
      path += '.';
      path += key.indexOf('.') > -1 ? `"${key}"` : key;
    }
    return path;
  };

  const assignKeyValue = (
    keys: string[],
    value: unknown,
    offset: number
  ): void => {
    let target = context;
    let meta = currentMeta;
    let buildPath = currentPath;
    for (let depth = 0; depth < keys.length - 1; depth++) {
      const key = keys[depth];
      buildPath = buildPath ? `${buildPath}.${key}` : key;
      let childMeta = meta.children[key];

      if (target[key] === undefined) {
        target[key] = Object.create(null);
        if (!childMeta) {
          childMeta = createMetaNode();
          meta.children[key] = childMeta;
        }
        childMeta.assigned = true;
      } else if (
        typeof target[key] !== 'object' ||
        target[key] === null ||
        Array.isArray(target[key])
      ) {
        fail(`Cannot redefine existing key '${buildPath}'.`, offset);
      } else if (childMeta?.value) {
        fail(`Cannot redefine existing key '${buildPath}'.`, offset);
      } else if (childMeta?.explicit) {
        fail(
          `Cannot use dotted keys to extend table '${buildPath}' defined elsewhere.`,
          offset
        );
      }

      if (!childMeta) {
        childMeta = createMetaNode();
        childMeta.assigned = true;
        meta.children[key] = childMeta;
      }

      target = target[key] as Record<string, unknown>;
      meta = childMeta;
    }

    const lastKey = keys[keys.length - 1];
    const fullPath = buildPath ? `${buildPath}.${lastKey}` : lastKey;

    if (target[lastKey] !== undefined)
      fail(`Cannot redefine existing key '${fullPath}'.`, offset);

    target[lastKey] = value;
    let lastMeta = meta.children[lastKey];
    if (!lastMeta) {
      lastMeta = createMetaNode();
      meta.children[lastKey] = lastMeta;
    }
    lastMeta.assigned = true;
    lastMeta.value = true;
  };

  const deepRef = (
    keys: string[],
    defaultValue: unknown,
    offset: number
  ): unknown => {
    let current: unknown = root;
    let meta = metaRoot;

    for (let depth = 0; depth < keys.length; depth++) {
      const key = keys[depth];
      const childMeta = meta.children[key];
      const record = current as Record<string, unknown>;

      if (record[key] === undefined) {
        record[key] =
          depth === keys.length - 1 ? defaultValue : Object.create(null);
      } else if (depth !== keys.length - 1 && childMeta.value) {
        fail(`Cannot redefine existing key '${key}'.`, offset);
      }

      current = record[key];
      meta = childMeta;

      if (
        Array.isArray(current) &&
        (current as unknown[]).length > 0 &&
        depth < keys.length - 1
      ) {
        current = (current as unknown[])[(current as unknown[]).length - 1];
      }
    }

    return current;
  };

  const setTablePath = (keys: string[], offset: number): void => {
    let meta = metaRoot;
    for (const key of keys) {
      if (!meta.children[key]) meta.children[key] = createMetaNode();
      meta = meta.children[key];
    }

    if (meta.assigned)
      fail(`Cannot redefine existing key '${keys.join('.')}'.`, offset);

    meta.assigned = true;
    meta.explicit = true;
    context = deepRef(keys, Object.create(null), offset) as Record<
      string,
      unknown
    >;
    currentPath = buildQuotedPath(keys);
    currentMeta = meta;
  };

  const addTableArray = (keys: string[], offset: number): void => {
    let meta = metaRoot;
    for (const key of keys) {
      if (!meta.children[key]) meta.children[key] = createMetaNode();
      meta = meta.children[key];
    }

    if (meta.value)
      fail(
        `Cannot append to statically defined array '${buildQuotedPath(keys)}'.`,
        offset
      );

    meta.children = Object.create(null);
    meta.assigned = true;
    meta.value = false;
    meta.explicit = false;

    const arr = deepRef(keys, [], offset);
    currentPath = buildQuotedPath(keys);

    if (Array.isArray(arr)) {
      const newTable: Record<string, unknown> = Object.create(null);
      (arr as unknown[]).push(newTable);
      context = newTable;
    } else {
      fail(`Cannot redefine existing key '${keys.join('.')}'.`, offset);
    }
    currentMeta = meta;
  };

  // --- Main loop ---

  while (pos < len) {
    skipWs();
    if (pos >= len) break;

    const current = src.charCodeAt(pos);

    // Newline
    if (current === LF || current === CR) {
      skipNewline();
      continue;
    }

    // Comment
    if (current === HASH) {
      skipComment();
      if (pos < len) skipNewline();
      continue;
    }

    // Table or array-of-tables
    if (current === LEFT_BRACKET) {
      const offset = pos;
      pos++; // skip [
      let isArrayTable = false;
      if (pos < len && src.charCodeAt(pos) === LEFT_BRACKET) {
        isArrayTable = true;
        pos++; // skip second [
      }
      skipWs();
      const keys = readDottedKey();
      skipWs();
      if (pos >= len || src.charCodeAt(pos) !== RIGHT_BRACKET)
        fail('Expected ]');
      pos++;
      if (isArrayTable) {
        if (pos >= len || src.charCodeAt(pos) !== RIGHT_BRACKET)
          fail('Expected ]]');
        pos++;
      }
      skipWs();
      skipComment();
      if (!(pos >= len || skipNewline()))
        fail('Expected newline after table header');

      if (isArrayTable) {
        addTableArray(keys, offset);
      } else {
        setTablePath(keys, offset);
      }
      continue;
    }

    // Key-value assignment
    const offset = pos;
    const keys = readDottedKey();
    skipWs();
    if (pos >= len || src.charCodeAt(pos) !== EQUALS)
      fail('Expected = after key');
    pos++; // skip =
    skipWs();
    const value = readValue();
    assignKeyValue(keys, value, offset);
    skipWs();
    skipComment();
    if (!(pos >= len || skipNewline())) fail('Expected newline after value');
  }

  return root as T;
};
