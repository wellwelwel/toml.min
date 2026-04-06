import { describe, it, strict } from 'poku';
import { createRequire } from 'node:module';
import { parse, read } from '../__helpers__/index.mts';

const require = createRequire(import.meta.url);
const { parse: parseToml } = require('../../src/index.ts');

describe('Quoted keys', () => {
  it('simple quoted key', () =>
    parse(read('quoted-keys--simple.toml'), {
      '\u00CA': { a: 1 },
    }));

  it('complex quoted key', () =>
    parse(read('quoted-keys--complex.toml'), {
      a: { '\u00CA': { c: { d: 1 } } },
    }));

  it('escaped quotes in quoted keys', () =>
    parse(read('quoted-keys--escaped-quotes.toml'), {
      'the "thing"': { a: true },
    }));

  it('backslash in quoted keys', () =>
    parse(read('quoted-keys--backslash.toml'), {
      'the\\ key': { one: 'one', two: 2, three: false },
    }));

  it('dotted with quoted key', () =>
    parse(read('quoted-keys--dotted-with-quoted.toml'), {
      a: { 'the\\ key': { one: 'one', two: 2, three: false } },
    }));

  it('bare-looking quoted key', () =>
    parse(read('quoted-keys--bare-looking.toml'), {
      a: { 'the-key': { one: 'one', two: 2, three: false } },
    }));

  it('quoted key with dot', () =>
    parse(read('quoted-keys--with-dot.toml'), {
      a: { 'the.key': { one: 'one', two: 2, three: false } },
    }));

  it('single-quoted key with double quotes inside', () =>
    parse(read('quoted-keys--single-quoted-with-double-quotes.toml'), {
      table: { 'a "quoted value"': 'value' },
    }));

  it('quoted key with equals', () =>
    parse(read('quoted-keys--with-equals.toml'), {
      module: { 'foo=bar': 'zzz' },
    }));
});

describe('Dotted keys', () => {
  it('dotted key assignment', () =>
    parse(read('dotted-keys--assignment.toml'), {
      a: { b: { c: 1 } },
    }));

  it('dotted key in value context', () =>
    parse(read('dotted-keys--value-context.toml'), {
      fruit: { apple: { color: 'red', taste: { sweet: true } } },
    }));
});

describe('Key edge cases', () => {
  it('rejects multiline basic string as key', () =>
    strict.throws(() =>
      parseToml(read('key-edge-cases--multiline-basic-as-key.toml'))
    ));

  it('rejects multiline literal string as key', () =>
    strict.throws(() =>
      parseToml(read('key-edge-cases--multiline-literal-as-key.toml'))
    ));

  it('rejects dot at start of key', () =>
    strict.throws(() => parseToml(read('errors--dot-at-start.toml'))));

  it('rejects dot at end of key', () =>
    strict.throws(() => parseToml(read('errors--dot-at-end.toml'))));

  it('rejects key override', () =>
    strict.throws(() => parseToml(read('errors--key-override.toml'))));

  it('rejects key override with nested path', () =>
    strict.throws(() =>
      parseToml(read('errors--key-override-nested-path.toml'))
    ));

  it('rejects key override with array table', () =>
    strict.throws(() =>
      parseToml(read('errors--key-override-array-table.toml'))
    ));

  it('rejects key replace', () =>
    strict.throws(() => parseToml(read('errors--key-replace.toml'))));
});
