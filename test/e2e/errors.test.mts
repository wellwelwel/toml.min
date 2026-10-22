import type { TomlErrorCode } from '../../src/index.ts';
import { describe, it, strict } from 'poku';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TomlError, parse } from '../__helpers__/index.mts';

type CodeCase = {
  code: TomlErrorCode;
  source: string;
  line: number;
  column: number;
};

type HiddenCase = { name: string; key: string; label: string };

type FoundCase = {
  name: string;
  source: string;
  character: string;
  label: string;
};

type EchoCase = { name: string; source: string; quoted: string };

const __dirname = dirname(fileURLToPath(import.meta.url));
const MESSAGE_LIMIT = 300;
const HIDDEN = /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u;

const messageOf = (source: string): string => {
  try {
    parse(source);
  } catch (error) {
    if (error instanceof TomlError) return error.message;
  }

  return strict.fail('Expected a TomlError');
};

const duplicated = (key: string): string => `${key} = 1\n${key} = 2`;

describe('Error codes', () => {
  const cases: CodeCase[] = [
    {
      code: 'CONTROL_CHARACTER',
      source: 'a = "x\u0007"',
      line: 1,
      column: 7,
    },
    { code: 'DUPLICATE_KEY', source: 'a = 1\na = 2', line: 2, column: 1 },
    { code: 'EXPECTED_COMMA', source: 'a = [1 2]', line: 1, column: 8 },
    { code: 'EXPECTED_EQUALS', source: 'a b = 1', line: 1, column: 3 },
    { code: 'EXPECTED_NEWLINE', source: 'a = 1 b = 2', line: 1, column: 7 },
    { code: 'EXPECTED_VALUE', source: 'a =\nb = 1', line: 1, column: 4 },
    {
      code: 'INTEGER_OUT_OF_RANGE',
      source: 'a = 9007199254740993',
      line: 1,
      column: 5,
    },
    { code: 'INVALID_DATE', source: 'a = 1979-02-30', line: 1, column: 5 },
    { code: 'INVALID_ESCAPE', source: 'a = "\\q"', line: 1, column: 6 },
    { code: 'INVALID_KEY', source: '= 1', line: 1, column: 1 },
    { code: 'INVALID_NUMBER', source: 'a = 01', line: 1, column: 5 },
    { code: 'INVALID_TABLE_HEADER', source: '[a b]', line: 1, column: 4 },
    { code: 'INVALID_TIME', source: 'a = 24:00:00', line: 1, column: 5 },
    { code: 'INVALID_VALUE', source: 'a = yes', line: 1, column: 5 },
    { code: 'LONE_SURROGATE', source: 'a = "x\uD800"', line: 1, column: 7 },
    {
      code: 'NESTING_TOO_DEEP',
      source: `a = ${'['.repeat(101)}`,
      line: 1,
      column: 105,
    },
    { code: 'TOO_MANY_QUOTES', source: 'a = """x""""""', line: 1, column: 9 },
    { code: 'UNTERMINATED_ARRAY', source: 'a = [1,', line: 1, column: 5 },
    {
      code: 'UNTERMINATED_INLINE_TABLE',
      source: 'a = { b = 1',
      line: 1,
      column: 5,
    },
    {
      code: 'UNTERMINATED_STRING',
      source: 'a = "abc\nb = 1',
      line: 1,
      column: 5,
    },
  ];

  for (const { code, source, line, column } of cases)
    it(`reports ${code} with its line and column`, () =>
      strict.throws(
        () => parse(source),
        (error) =>
          error instanceof TomlError &&
          error.name === 'TomlError' &&
          error.code === code &&
          error.line === line &&
          error.column === column
      ));

  it('reports a TypeError, not a TomlError, for input that is not a string', () =>
    strict.throws(
      () => (parse as (input: unknown) => unknown)(42),
      (error) => error instanceof TypeError && !(error instanceof TomlError)
    ));

  it('points at the comment that takes the place of a missing value', () =>
    strict.throws(() => parse('a = # TODO'), {
      name: 'TomlError',
      code: 'EXPECTED_VALUE',
      line: 1,
      column: 5,
    }));

  it('points at the end of the file when the value is missing there', () =>
    strict.throws(() => parse('a = '), {
      name: 'TomlError',
      code: 'EXPECTED_VALUE',
      line: 1,
      column: 5,
    }));

  it('points at the bracket of an indented table header already defined', () =>
    strict.throws(() => parse('[a]\nb = 1\n [a.b]\nc = 2'), {
      name: 'TomlError',
      code: 'DUPLICATE_KEY',
      line: 3,
      column: 2,
    }));

  it('documents exactly the codes the parser reports', () => {
    const readme = readFileSync(
      join(__dirname, '..', '..', 'README.md'),
      'utf8'
    );
    const documented = [...readme.matchAll(/^\| `([A-Z_]+)` +\|/gm)].map(
      (match) => match[1]
    );

    strict.deepEqual(
      documented.sort(),
      cases.map((entry) => entry.code).sort()
    );
  });
});

describe('Error message echoes', () => {
  const payload = `${'\u202E'.repeat(50_000)}${'x'.repeat(150_000)}`;
  const hostileSources = [
    duplicated(`"${payload}"`),
    `"${payload}" = 1\n"${payload}".b = 2`,
    `[a."${payload}"]\n[a]\n"${payload}".c = 1`,
    `["${payload}"]\n["${payload}"]`,
    `"${payload}" = 1\n[["${payload}"]]`,
    `["${payload}"]\n[["${payload}"]]`,
    `a = { "${payload}" = 1, "${payload}".b = 2 }`,
    `a = ${'x'.repeat(200_000)}`,
    `a = ${'9'.repeat(200_000)}`,
    'a = "\\\u202E"',
    'a = \u202E',
    '\u202E = 1',
    'a = 1 \u202E',
    'a = "x\uD800y"',
  ];
  const hiddenCases: HiddenCase[] = [
    { name: 'NUL', key: '"x\\u0000y"', label: 'U+0000' },
    { name: 'bell', key: '"x\\u0007y"', label: 'U+0007' },
    { name: 'escape', key: '"x\\u001By"', label: 'U+001B' },
    { name: 'delete', key: '"x\\u007Fy"', label: 'U+007F' },
    { name: 'next line', key: '"x\\u0085y"', label: 'U+0085' },
    { name: 'no-break space', key: '"x\\u00A0y"', label: 'U+00A0' },
    { name: 'soft hyphen', key: '"x\\u00ADy"', label: 'U+00AD' },
    { name: 'Arabic letter mark', key: '"x\\u061Cy"', label: 'U+061C' },
    { name: 'zero width space', key: '"x\\u200By"', label: 'U+200B' },
    { name: 'zero width joiner', key: '"x\\u200Dy"', label: 'U+200D' },
    { name: 'left-to-right mark', key: '"x\\u200Ey"', label: 'U+200E' },
    { name: 'line separator', key: '"x\\u2028y"', label: 'U+2028' },
    { name: 'paragraph separator', key: '"x\\u2029y"', label: 'U+2029' },
    { name: 'left-to-right embedding', key: '"x\\u202Ay"', label: 'U+202A' },
    { name: 'right-to-left override', key: '"x\\u202Ey"', label: 'U+202E' },
    { name: 'word joiner', key: '"x\\u2060y"', label: 'U+2060' },
    { name: 'left-to-right isolate', key: '"x\\u2066y"', label: 'U+2066' },
    { name: 'pop directional isolate', key: '"x\\u2069y"', label: 'U+2069' },
    { name: 'ideographic space', key: '"x\\u3000y"', label: 'U+3000' },
    { name: 'Hangul filler', key: '"x\\u3164y"', label: 'U+3164' },
    { name: 'byte order mark', key: '"x\\uFEFFy"', label: 'U+FEFF' },
    { name: 'tag letter', key: '"x\\U000E0041y"', label: 'U+E0041' },
  ];
  const foundCases: FoundCase[] = [
    {
      name: 'right-to-left override',
      source: 'a = \u202Eb',
      character: '\u202E',
      label: 'U+202E',
    },
    {
      name: 'lone surrogate',
      source: 'a = \uD800',
      character: '\uD800',
      label: 'U+D800',
    },
  ];
  const echoCases: EchoCase[] = [
    {
      name: 'quote marks in a key set twice',
      source: duplicated(`'x" and "y'`),
      quoted: '"x\\" and \\"y"',
    },
    {
      name: 'a backslash ending a key set twice',
      source: duplicated(`'x\\'`),
      quoted: '"x\\\\"',
    },
    {
      name: 'quote marks in a table defined twice',
      source: `['x" and "y']\n['x" and "y']`,
      quoted: '"x\\" and \\"y"',
    },
    {
      name: 'a quote mark found where a line should end',
      source: 'a = 1 "',
      quoted: '"\\""',
    },
    {
      name: 'a backslash found where a line should end',
      source: 'a = 1 \\',
      quoted: '"\\\\"',
    },
    { name: 'an unknown escape', source: 'a = "\\q"', quoted: '"\\\\q"' },
  ];

  it('clips a 200,000-character key with a visible mark', () => {
    const key = 'k'.repeat(200_000);
    const message = messageOf(duplicated(key));

    strict.ok(message.includes(`"${'k'.repeat(40)}…"`));
    strict.ok(!message.includes('k'.repeat(41)));
  });

  for (const { name, source, character, label } of foundCases)
    it(`shows a ${name} as its code point`, () => {
      const message = messageOf(source);

      strict.ok(message.includes(`"[${label}]"`));
      strict.ok(!message.includes(character));
    });

  for (const { name, key, label } of hiddenCases)
    it(`shows the ${name} as ${label}`, () =>
      strict.ok(messageOf(duplicated(key)).includes(`"x[${label}]y"`)));

  it('quotes a key that contains a dot apart from the dots between keys', () =>
    strict.ok(messageOf(duplicated('a."b.c"')).includes(`"a.'b.c'"`)));

  it('keeps visible characters as typed', () =>
    strict.ok(messageOf(duplicated('"café ☕ 🎉"')).includes('"café ☕ 🎉"')));

  it('keeps every message short and free of hidden characters', () => {
    const messages = hostileSources.map(messageOf);

    for (const message of messages) {
      strict.ok(message.length <= MESSAGE_LIMIT, message);
      strict.ok(!HIDDEN.test(message), message);
    }
  });

  for (const { name, source, quoted } of echoCases)
    it(`keeps ${name} inside the quotes of its echo`, () => {
      const message = messageOf(source);

      strict.ok(message.includes(quoted), message);
    });
});
