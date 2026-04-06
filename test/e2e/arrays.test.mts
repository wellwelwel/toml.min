import { describe, it, strict } from 'poku';
import { createRequire } from 'node:module';
import { parse, read } from '../__helpers__/index.mts';

const require = createRequire(import.meta.url);
const { parse: parseToml } = require('../../src/index.ts');

describe('Arrays', () => {
  it('supports trailing commas', () =>
    parse(read('arrays--trailing-commas.toml'), {
      arr: [1, 2, 3],
    }));
  it('single element with no trailing comma', () =>
    parse(read('arrays--single-element.toml'), { a: [1] }));
  it('empty array', () => parse(read('arrays--empty.toml'), { a: [] }));
  it('array with whitespace', () =>
    parse(read('arrays--whitespace.toml'), {
      versions: { files: [3, 5] },
    }));
  it('empty array with whitespace', () =>
    parse(read('arrays--empty-whitespace.toml'), {
      versions: { files: [] },
    }));

  it('allows mixed-type arrays (TOML v1.0.0)', () =>
    parse(read('errors--mixed-type-arrays.toml'), {
      data: [1, 2, 'test'],
    }));
});

describe('Array errors', () => {
  it('rejects unterminated array', () =>
    strict.throws(() => parseToml(read('array-errors--unterminated.toml'))));

  it('rejects missing comma between elements', () =>
    strict.throws(() => parseToml(read('array-errors--missing-comma.toml'))));
});
