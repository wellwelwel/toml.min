import type { Rejection } from '../__helpers__/index.mts';
import { describe, it, strict } from 'poku';
import { assertParsesTo, parse, read } from '../__helpers__/index.mts';

describe('Arrays', () => {
  it('accepts a trailing comma', () =>
    assertParsesTo(read('arrays--trailing-commas.toml'), { arr: [1, 2, 3] }));

  it('reads a single element without a trailing comma', () =>
    assertParsesTo(read('arrays--single-element.toml'), { a: [1] }));

  it('reads an empty array', () =>
    assertParsesTo(read('arrays--empty.toml'), { a: [] }));

  it('ignores newlines and indentation between elements', () =>
    assertParsesTo(read('arrays--whitespace.toml'), {
      versions: { files: [3, 5] },
    }));

  it('reads an empty array spread over several lines', () =>
    assertParsesTo(read('arrays--empty-whitespace.toml'), {
      versions: { files: [] },
    }));

  it('mixes value types in one array', () =>
    assertParsesTo(read('arrays--mixed-types.toml'), {
      data: [1, 2, 'test'],
    }));
});

describe('Array errors', () => {
  const rejections: Rejection[] = [
    {
      name: 'an array that is never closed',
      fixture: 'array-errors--unterminated.toml',
      code: 'UNTERMINATED_ARRAY',
    },
    {
      name: 'elements without a comma between them',
      fixture: 'array-errors--missing-comma.toml',
      code: 'EXPECTED_COMMA',
    },
  ];

  for (const { name, fixture, code } of rejections)
    it(`rejects ${name}`, () =>
      strict.throws(() => parse(read(fixture)), { name: 'TomlError', code }));
});
