import type { Rejection } from '../__helpers__/index.mts';
import { describe, it, strict } from 'poku';
import { assertParsesTo, parse, read } from '../__helpers__/index.mts';

describe('Tables', () => {
  it('defines a super-table after its sub-table', () =>
    assertParsesTo(read('tables--define-on-superkey.toml'), {
      a: { b: { c: 1 }, d: 2 },
    }));

  it('ignores spaces around a table name', () =>
    assertParsesTo(read('tables--whitespace-around-key-names.toml'), {
      a: { b: 1 },
    }));

  it('ignores spaces around the dots of a table name', () =>
    assertParsesTo(read('tables--whitespace-around-dots.toml'), {
      a: { b: { c: { d: 1 } } },
    }));
});

describe('Inline tables', () => {
  it('reads inline tables, nested and inside arrays', () =>
    assertParsesTo(read('inline-tables--basic.toml'), {
      name: { first: 'Tom', last: 'Preston-Werner' },
      point: { x: 1, y: 2 },
      nested: { x: { a: { b: 3 } } },
      points: [
        { x: 1, y: 2, z: 3 },
        { x: 7, y: 8, z: 9 },
        { x: 2, y: 4, z: 8 },
      ],
      arrays: [
        { x: [1, 2, 3], y: [4, 5, 6] },
        { x: [7, 8, 9], y: [0, 1, 2] },
      ],
    }));

  it('reads an empty inline table', () =>
    assertParsesTo(read('inline-tables--empty.toml'), { a: {} }));

  it('keeps a quoted key containing a dot apart from the dotted path it spells', () =>
    assertParsesTo(read('inline-tables--quoted-keys-with-dots.toml'), {
      x: { a: { b: { c: 1, d: 3 } }, 'a.b': 2 },
      y: { 'a.b': 1, a: { b: { c: 2, d: 3 } } },
      z: { a: { 'b.c': { d: 1, e: 3 }, b: { c: 2 } } },
    }));
});

describe('Inline table errors', () => {
  const rejections: Rejection[] = [
    {
      name: 'an inline table that is never closed',
      fixture: 'inline-table-errors--unterminated.toml',
      code: 'UNTERMINATED_INLINE_TABLE',
    },
    {
      name: 'a trailing comma with no closing brace',
      fixture: 'inline-table-errors--trailing-comma-no-brace.toml',
      code: 'UNTERMINATED_INLINE_TABLE',
    },
    {
      name: 'an entry without =',
      fixture: 'inline-table-errors--missing-equals.toml',
      code: 'EXPECTED_EQUALS',
    },
    {
      name: 'entries without a comma between them',
      fixture: 'inline-table-errors--missing-comma.toml',
      code: 'EXPECTED_COMMA',
    },
    {
      name: 'a key set twice in an inline table',
      fixture: 'inline-table-errors--duplicate-key.toml',
      code: 'DUPLICATE_KEY',
    },
    {
      name: 'a dotted key set twice in an inline table',
      fixture: 'inline-table-errors--dotted-key-redefine.toml',
      code: 'DUPLICATE_KEY',
    },
    {
      name: 'a dotted key under a key that holds a value',
      fixture: 'inline-table-errors--extending-sealed.toml',
      code: 'DUPLICATE_KEY',
    },
    {
      name: 'a dotted key that extends a nested inline table',
      fixture: 'inline-table-errors--extending-nested-inline-table.toml',
      code: 'DUPLICATE_KEY',
    },
    {
      name: 'a dotted key that extends an inline table set through a dotted key',
      fixture: 'inline-table-errors--extending-dotted-inline-table.toml',
      code: 'DUPLICATE_KEY',
    },
    {
      name: 'a table header that extends an inline table',
      fixture: 'inline-table-errors--header-over-inline-table.toml',
      code: 'DUPLICATE_KEY',
    },
  ];

  for (const { name, fixture, code } of rejections)
    it(`rejects ${name}`, () =>
      strict.throws(() => parse(read(fixture)), { name: 'TomlError', code }));
});

describe('Table path conflicts', () => {
  const rejections: Rejection[] = [
    {
      name: 'a table defined twice',
      fixture: 'table-path-conflicts--table-defined-twice.toml',
      code: 'DUPLICATE_KEY',
    },
    {
      name: 'a dotted key that extends a table defined by a header',
      fixture: 'table-path-conflicts--dotted-extending-explicit.toml',
      code: 'DUPLICATE_KEY',
    },
    {
      name: 'an array of tables over a key that holds a value',
      fixture: 'table-path-conflicts--array-table-on-static.toml',
      code: 'DUPLICATE_KEY',
    },
    {
      name: 'an array of tables over a static array',
      fixture: 'table-path-conflicts--table-redefining-array.toml',
      code: 'DUPLICATE_KEY',
    },
    {
      name: 'a table header without ]',
      fixture: 'table-path-conflicts--missing-bracket.toml',
      code: 'INVALID_TABLE_HEADER',
    },
    {
      name: 'an array of tables header without ]]',
      fixture: 'table-path-conflicts--missing-double-bracket.toml',
      code: 'INVALID_TABLE_HEADER',
    },
  ];

  for (const { name, fixture, code } of rejections)
    it(`rejects ${name}`, () =>
      strict.throws(() => parse(read(fixture)), { name: 'TomlError', code }));
});
