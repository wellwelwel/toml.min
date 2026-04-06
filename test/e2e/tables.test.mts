import { describe, it, strict } from 'poku';
import { createRequire } from 'node:module';
import { parse, read } from '../__helpers__/index.mts';

const require = createRequire(import.meta.url);
const { parse: parseToml } = require('../../src/index.ts');

describe('Tables', () => {
  it('define on superkey', () =>
    parse(read('tables--define-on-superkey.toml'), {
      a: { b: { c: 1 }, d: 2 },
    }));
  it('whitespace around key names', () =>
    parse(read('tables--whitespace-around-key-names.toml'), {
      a: { b: 1 },
    }));
  it('whitespace around dots', () =>
    parse(read('tables--whitespace-around-dots.toml'), {
      a: { b: { c: { d: 1 } } },
    }));
});

describe('Inline tables', () => {
  it('parses inline tables', () =>
    parse(read('inline-tables--basic.toml'), {
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
  it('parses empty inline tables', () =>
    parse(read('inline-tables--empty.toml'), { a: {} }));
});

describe('Inline table errors', () => {
  it('rejects unterminated inline table', () =>
    strict.throws(() =>
      parseToml(read('inline-table-errors--unterminated.toml'))
    ));

  it('rejects missing = in inline table entry', () =>
    strict.throws(() =>
      parseToml(read('inline-table-errors--missing-equals.toml'))
    ));

  it('rejects duplicate key in inline table', () =>
    strict.throws(() =>
      parseToml(read('inline-table-errors--duplicate-key.toml'))
    ));

  it('rejects inline table dotted key redefining existing', () =>
    strict.throws(() =>
      parseToml(read('inline-table-errors--dotted-key-redefine.toml'))
    ));

  it('rejects inline table extending sealed dotted key', () =>
    strict.throws(() =>
      parseToml(read('inline-table-errors--extending-sealed.toml'))
    ));

  it('rejects trailing comma with no closing brace', () =>
    strict.throws(() =>
      parseToml(read('inline-table-errors--trailing-comma-no-brace.toml'))
    ));

  it('rejects missing comma between inline table entries', () =>
    strict.throws(() =>
      parseToml(read('inline-table-errors--missing-comma.toml'))
    ));

  it('rejects inline table replace', () =>
    strict.throws(() => parseToml(read('errors--inline-table-replace.toml'))));
});

describe('Table path conflicts', () => {
  it('rejects table override', () =>
    strict.throws(() => parseToml(read('errors--table-override.toml'))));

  it('rejects dotted key extending explicit table from elsewhere', () =>
    strict.throws(() =>
      parseToml(read('table-path-conflicts--dotted-extending-explicit.toml'))
    ));

  it('rejects array table on statically defined key', () =>
    strict.throws(() =>
      parseToml(read('table-path-conflicts--array-table-on-static.toml'))
    ));

  it('rejects table redefining non-table array-of-tables path', () =>
    strict.throws(() =>
      parseToml(read('table-path-conflicts--table-redefining-array.toml'))
    ));

  it('rejects missing ] in table header', () =>
    strict.throws(() =>
      parseToml(read('table-path-conflicts--missing-bracket.toml'))
    ));

  it('rejects missing ]] in array table header', () =>
    strict.throws(() =>
      parseToml(read('table-path-conflicts--missing-double-bracket.toml'))
    ));

  it('rejects missing = in key-value', () =>
    strict.throws(() =>
      parseToml(read('table-path-conflicts--missing-equals.toml'))
    ));
});
