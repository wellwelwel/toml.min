import type { Rejection } from '../__helpers__/index.mts';
import { describe, it, strict } from 'poku';
import { assertParsesTo, parse, read } from '../__helpers__/index.mts';

type TextCase = { name: string; text: string };

type TextPosition = {
  name: string;
  source: (text: string) => string;
  parsed: (text: string) => unknown;
};

describe('Strings', () => {
  it('decodes \\u escapes', () =>
    assertParsesTo(read('strings--unicode-escape-u.toml'), {
      str: 'My name is Jos\u00E9',
    }));

  it('decodes \\U escapes', () =>
    assertParsesTo(read('strings--unicode-escape-U.toml'), {
      str: 'My name is Jos\u00E9',
    }));

  it('decodes \\x escapes', () =>
    assertParsesTo(read('strings--hex-escape-x.toml'), { str: 'AB' }));

  it('decodes \\e as the escape character', () =>
    assertParsesTo(read('strings--escape-e.toml'), { str: '\x1B' }));

  it('decodes \\r as a carriage return', () =>
    assertParsesTo(read('strings--escape-r.toml'), { a: 'hello\rworld' }));

  it('reads multiline basic strings', () =>
    assertParsesTo(read('strings--multiline-basic.toml'), {
      key1: 'One\nTwo',
      key2: 'One\nTwo',
      key3: 'One\nTwo',
    }));

  it('drops the newline and indentation after a line-ending backslash', () =>
    assertParsesTo(read('strings--multiline-eat-whitespace.toml'), {
      key1: 'The quick brown fox jumps over the lazy dog.',
      key2: 'The quick brown fox jumps over the lazy dog.',
      key3: 'The quick brown fox jumps over the lazy dog.',
    }));

  it('keeps backslashes in literal strings as typed', () =>
    assertParsesTo(read('strings--literal.toml'), {
      winpath: 'C:\\Users\\nodejs\\templates',
      winpath2: '\\\\ServerX\\admin$\\system32\\',
      quoted: 'Tom "Dubs" Preston-Werner',
      regex: '<\\i\\c*\\s*>',
    }));

  it('keeps multiline literal strings as typed after the first newline', () =>
    assertParsesTo(read('strings--multiline-literal.toml'), {
      regex2: "I [dw]on't need \\d{2} apples",
      lines:
        'The first newline is\ntrimmed in raw strings.\n   All other whitespace\n   is preserved.\n',
    }));

  it('reads an empty basic string', () =>
    assertParsesTo(read('strings--empty-basic.toml'), { a: '' }));

  it('reads an empty literal string', () =>
    assertParsesTo(read('strings--empty-literal.toml'), { a: '' }));

  it('reads an empty multiline basic string', () =>
    assertParsesTo(read('strings--empty-multiline-basic.toml'), { a: '' }));

  it('reads an empty multiline literal string', () =>
    assertParsesTo(read('strings--empty-multiline-literal.toml'), { a: '' }));

  it('keeps up to two quotes next to the closing quotes of a multiline basic string', () =>
    assertParsesTo(read('strings--multiline-basic-trailing-quotes.toml'), {
      a: '""hello""',
    }));

  it('keeps up to two quotes next to the closing quotes of a multiline literal string', () =>
    assertParsesTo(read('strings--multiline-literal-trailing-quotes.toml'), {
      a: "''hello''",
    }));
});

describe('Escape sequences', () => {
  const rejections: Rejection[] = [
    {
      name: 'a backslash at the end of the file',
      fixture: 'escape-sequences--truncated-escape.toml',
      code: 'UNTERMINATED_STRING',
    },
    {
      name: 'a \\u escape with fewer than four digits',
      fixture: 'escape-sequences--truncated-unicode-u.toml',
      code: 'INVALID_ESCAPE',
    },
    {
      name: 'a \\U escape with fewer than eight digits',
      fixture: 'escape-sequences--truncated-unicode-U.toml',
      code: 'INVALID_ESCAPE',
    },
    {
      name: 'a \\x escape with fewer than two digits',
      fixture: 'escape-sequences--truncated-hex-x.toml',
      code: 'INVALID_ESCAPE',
    },
    {
      name: 'an escape letter TOML does not define',
      fixture: 'escape-sequences--unknown-escape.toml',
      code: 'INVALID_ESCAPE',
    },
    {
      name: 'a \\u escape for a surrogate code point',
      fixture: 'escape-sequences--surrogate.toml',
      code: 'INVALID_ESCAPE',
    },
    {
      name: 'a \\U escape past the last Unicode code point',
      fixture: 'escape-sequences--past-last-code-point.toml',
      code: 'INVALID_ESCAPE',
    },
  ];

  it('decodes \\b as a backspace', () =>
    assertParsesTo(read('escape-sequences--backspace.toml'), { a: '\b' }));

  it('decodes \\f as a form feed', () =>
    assertParsesTo(read('escape-sequences--form-feed.toml'), { a: '\f' }));

  it('keeps the escape character and NUL decoded from \\e and \\x00 in values and quoted keys', () =>
    assertParsesTo(read('escape-sequences--control-characters.toml'), {
      basic: 'a\x1Bb\x00c',
      multiline: 'a\x1Bb\x00c',
      'a\x1Bb\x00c': 1,
    }));

  for (const { name, fixture, code } of rejections)
    it(`rejects ${name}`, () =>
      strict.throws(() => parse(read(fixture)), { name: 'TomlError', code }));
});

describe('Lone surrogates', () => {
  const positions: TextPosition[] = [
    {
      name: 'a basic string',
      source: (text) => `a = "${text}"`,
      parsed: (text) => ({ a: text }),
    },
    {
      name: 'a literal string',
      source: (text) => `a = '${text}'`,
      parsed: (text) => ({ a: text }),
    },
    {
      name: 'a multiline basic string',
      source: (text) => `a = """${text}"""`,
      parsed: (text) => ({ a: text }),
    },
    {
      name: 'a multiline literal string',
      source: (text) => `a = '''${text}'''`,
      parsed: (text) => ({ a: text }),
    },
    {
      name: 'a basic quoted key',
      source: (text) => `"${text}" = 1`,
      parsed: (text) => ({ [text]: 1 }),
    },
    {
      name: 'a literal quoted key',
      source: (text) => `'${text}' = 1`,
      parsed: (text) => ({ [text]: 1 }),
    },
    {
      name: 'a comment',
      source: (text) => `a = 1 #${text}`,
      parsed: () => ({ a: 1 }),
    },
  ];
  const loneSurrogates: TextCase[] = [
    {
      name: 'a high surrogate followed by a regular character',
      text: 'x\uD83Dy',
    },
    {
      name: 'a high surrogate followed by another high surrogate',
      text: 'x\uD83D😀y',
    },
    { name: 'a high surrogate at the end of the text', text: 'x\uD83D' },
    { name: 'a low surrogate after a regular character', text: 'x\uDE00y' },
    {
      name: 'a low surrogate after a complete pair',
      text: 'x😀\uDE00y',
    },
  ];
  const surrogatePairs: TextCase[] = [
    {
      name: 'a surrogate pair between regular characters',
      text: 'x😀y',
    },
    {
      name: 'surrogate pairs touching the delimiters',
      text: '😀😀',
    },
  ];

  for (const position of positions)
    for (const { name, text } of loneSurrogates)
      it(`rejects ${name} in ${position.name}`, () =>
        strict.throws(() => parse(position.source(text)), {
          name: 'TomlError',
          code: 'LONE_SURROGATE',
        }));

  for (const position of positions)
    for (const { name, text } of surrogatePairs)
      it(`accepts ${name} in ${position.name}`, () =>
        assertParsesTo(position.source(text), position.parsed(text)));
});

describe('Multiline string edge cases', () => {
  const rejections: Rejection[] = [
    {
      name: 'six closing quotes in a multiline basic string',
      fixture: 'multiline-edge-cases--six-plus-quotes-basic.toml',
      code: 'TOO_MANY_QUOTES',
    },
    {
      name: 'six closing quotes in a multiline literal string',
      fixture: 'multiline-edge-cases--six-plus-quotes-literal.toml',
      code: 'TOO_MANY_QUOTES',
    },
    {
      name: 'a multiline basic string cut off after a backslash',
      fixture: 'multiline-edge-cases--ending-backslash.toml',
      code: 'UNTERMINATED_STRING',
    },
  ];

  it('drops a CRLF right after a line-ending backslash', () =>
    assertParsesTo(read('multiline-edge-cases--backslash-crlf.toml'), {
      a: 'hello',
    }));

  it('drops every blank line after a line-ending backslash', () =>
    assertParsesTo(
      read('multiline-edge-cases--backslash-newline-eats-whitespace.toml'),
      { a: 'hello' }
    ));

  it('drops every CRLF blank line after a line-ending backslash', () =>
    assertParsesTo(
      read('multiline-edge-cases--backslash-newline-eats-crlf.toml'),
      { a: 'hello' }
    ));

  it('drops whitespace after a backslash even when no newline follows', () =>
    assertParsesTo(
      read('multiline-edge-cases--backslash-whitespace-no-newline.toml'),
      { a: 'x\n' }
    ));

  for (const { name, fixture, code } of rejections)
    it(`rejects ${name}`, () =>
      strict.throws(() => parse(read(fixture)), { name: 'TomlError', code }));
});

describe('String errors', () => {
  const rejections: Rejection[] = [
    {
      name: 'a control character in a basic string',
      fixture: 'string-errors--control-character-basic.toml',
      code: 'CONTROL_CHARACTER',
    },
    {
      name: 'a control character in a literal string',
      fixture: 'string-errors--control-character-literal.toml',
      code: 'CONTROL_CHARACTER',
    },
    {
      name: 'a basic string that is never closed',
      fixture: 'string-errors--unterminated-basic.toml',
      code: 'UNTERMINATED_STRING',
    },
    {
      name: 'a literal string that is never closed',
      fixture: 'string-errors--unterminated-literal.toml',
      code: 'UNTERMINATED_STRING',
    },
    {
      name: 'a multiline basic string that is never closed',
      fixture: 'string-errors--unterminated-multiline-basic.toml',
      code: 'UNTERMINATED_STRING',
    },
    {
      name: 'a multiline literal string that is never closed',
      fixture: 'string-errors--unterminated-multiline-literal.toml',
      code: 'UNTERMINATED_STRING',
    },
  ];

  for (const { name, fixture, code } of rejections)
    it(`rejects ${name}`, () =>
      strict.throws(() => parse(read(fixture)), { name: 'TomlError', code }));

  for (const quote of ['"', "'"])
    it(`points at the opening ${quote} of a string cut off by a line break`, () =>
      strict.throws(() => parse(`a = ${quote}abc\nb = 1`), {
        name: 'TomlError',
        code: 'UNTERMINATED_STRING',
        line: 1,
        column: 5,
      }));
});
