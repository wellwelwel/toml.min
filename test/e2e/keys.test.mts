import type { Rejection } from '../__helpers__/index.mts';
import { describe, it, strict } from 'poku';
import { assertParsesTo, parse, read } from '../__helpers__/index.mts';

describe('Quoted keys', () => {
  it('reads a non-ASCII quoted table name', () =>
    assertParsesTo(read('quoted-keys--simple.toml'), {
      '\u00CA': { a: 1 },
    }));

  it('reads quoted parts of a table name with spaces around the dots', () =>
    assertParsesTo(read('quoted-keys--complex.toml'), {
      a: { '\u00CA': { c: { d: 1 } } },
    }));

  it('decodes escaped quotes in a quoted key', () =>
    assertParsesTo(read('quoted-keys--escaped-quotes.toml'), {
      'the "thing"': { a: true },
    }));

  it('decodes an escaped backslash in a quoted key', () =>
    assertParsesTo(read('quoted-keys--backslash.toml'), {
      'the\\ key': { one: 'one', two: 2, three: false },
    }));

  it('mixes bare and quoted parts in a table name', () =>
    assertParsesTo(read('quoted-keys--dotted-with-quoted.toml'), {
      a: { 'the\\ key': { one: 'one', two: 2, three: false } },
    }));

  it('reads a quoted part that looks like a bare key', () =>
    assertParsesTo(read('quoted-keys--bare-looking.toml'), {
      a: { 'the-key': { one: 'one', two: 2, three: false } },
    }));

  it('keeps a dot inside a quoted key as part of the key', () =>
    assertParsesTo(read('quoted-keys--with-dot.toml'), {
      a: { 'the.key': { one: 'one', two: 2, three: false } },
    }));

  it('keeps double quotes inside a single-quoted key', () =>
    assertParsesTo(read('quoted-keys--single-quoted-with-double-quotes.toml'), {
      table: { 'a "quoted value"': 'value' },
    }));

  it('keeps = inside a quoted key', () =>
    assertParsesTo(read('quoted-keys--with-equals.toml'), {
      module: { 'foo=bar': 'zzz' },
    }));
});

describe('Dotted keys', () => {
  it('builds nested tables from a dotted key', () =>
    assertParsesTo(read('dotted-keys--assignment.toml'), {
      a: { b: { c: 1 } },
    }));

  it('merges dotted keys that share a prefix', () =>
    assertParsesTo(read('dotted-keys--value-context.toml'), {
      fruit: { apple: { color: 'red', taste: { sweet: true } } },
    }));
});

describe('Key errors', () => {
  const rejections: Rejection[] = [
    {
      name: 'a triple-quoted basic string as a key',
      fixture: 'key-errors--multiline-basic-as-key.toml',
      code: 'INVALID_KEY',
    },
    {
      name: 'a triple-quoted literal string as a key',
      fixture: 'key-errors--multiline-literal-as-key.toml',
      code: 'INVALID_KEY',
    },
    {
      name: 'a dot before the first part of a table name',
      fixture: 'key-errors--dot-at-start.toml',
      code: 'INVALID_KEY',
    },
    {
      name: 'a dot after the last part of a table name',
      fixture: 'key-errors--dot-at-end.toml',
      code: 'INVALID_KEY',
    },
    {
      name: 'a key set twice in the same table',
      fixture: 'key-errors--key-set-twice.toml',
      code: 'DUPLICATE_KEY',
    },
    {
      name: 'a table header over a key that holds a value',
      fixture: 'key-errors--header-over-value.toml',
      code: 'DUPLICATE_KEY',
    },
    {
      name: 'a table header nested under a key that holds a value',
      fixture: 'key-errors--nested-header-over-value.toml',
      code: 'DUPLICATE_KEY',
    },
    {
      name: 'an array of tables over a table',
      fixture: 'key-errors--array-of-tables-over-table.toml',
      code: 'DUPLICATE_KEY',
    },
  ];

  for (const { name, fixture, code } of rejections)
    it(`rejects ${name}`, () =>
      strict.throws(() => parse(read(fixture)), { name: 'TomlError', code }));
});
