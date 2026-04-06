import { describe, it, strict } from 'poku';
import { createRequire } from 'node:module';
import { parse, read } from '../__helpers__/index.mts';

const require = createRequire(import.meta.url);
const { parse: parseToml } = require('../../src/index.ts');

describe('Edge cases', () => {
  it('using "constructor" as key', () =>
    parse(read('edge-cases--constructor-key.toml'), {
      empty: {},
      emptier: {},
      constructor: { constructor: 1 },
      emptiest: {},
    }));

  it('empty input', () => parse(read('edge-cases--empty-input.toml'), {}));

  it('only comments', () => parse(read('edge-cases--only-comments.toml'), {}));

  it('BOM is stripped', () => parse(read('edge-cases--bom.toml'), { a: 1 }));

  it('CRLF line endings', () =>
    parse(read('edge-cases--crlf.toml'), { a: 1, b: 2 }));

  it('CRLF in multiline basic string normalized to LF', () =>
    parse(read('edge-cases--crlf-multiline-basic.toml'), {
      a: 'line1\nline2\n',
    }));

  it('whitespace-only input', () =>
    parse(read('edge-cases--whitespace-only.toml'), {}));

  it('input ending without trailing newline after value', () =>
    parse(read('edge-cases--no-trailing-newline.toml'), { a: 1 }));

  it('table header at end of file without trailing newline', () =>
    parse(read('edge-cases--table-header-no-newline.toml'), {
      a: {},
    }));

  it('CRLF after table header', () =>
    parse(read('edge-cases--crlf-after-table.toml'), {
      a: { b: 1 },
    }));

  it('CRLF in multiline literal string normalized to LF', () =>
    parse(read('edge-cases--crlf-multiline-literal.toml'), {
      a: 'line1\nline2\n',
    }));

  it('multiline basic string starting with CRLF', () =>
    parse(read('edge-cases--crlf-multiline-basic-start.toml'), {
      a: 'hello',
    }));

  it('multiline literal string starting with CRLF', () =>
    parse(read('edge-cases--crlf-multiline-literal-start.toml'), {
      a: 'hello',
    }));

  it('__proto__ does not pollute Object.prototype', () => {
    parseToml(read('edge-cases--proto-pollution.toml'));
    strict.equal(({} as Record<string, unknown>).a, undefined);
  });
});

describe('Whitespace', () => {
  it('handles whitespace', () =>
    parse(read('whitespace--handles-whitespace.toml'), {
      a: 1,
      b: 2,
    }));
  it('leading newlines', () =>
    parse(read('whitespace--leading-newlines.toml'), {
      test: 'ing',
    }));
});

describe('Comment validation', () => {
  it('rejects control char in comment', () =>
    strict.throws(() =>
      parseToml(read('comment-validation--control-char.toml'))
    ));
});

describe('Error handling', () => {
  it('rejects bad input 01', () =>
    strict.throws(() => parseToml(read('errors--bad-input-01.toml'))));

  it('rejects bad input 02', () =>
    strict.throws(() => parseToml(read('errors--bad-input-02.toml'))));

  it('rejects bad input 03', () =>
    strict.throws(() => parseToml(read('errors--bad-input-03.toml'))));

  it('rejects bad input 04', () =>
    strict.throws(() => parseToml(read('errors--bad-input-04.toml'))));

  it('errors have correct line and column', () => {
    try {
      parseToml(read('errors--line-column-check.toml'));
      strict.fail('Should have thrown');
    } catch (e: unknown) {
      const err = e as Error & { line: number; column: number };
      strict.equal(err.line, 3);
      strict.equal(err.column, 2);
    }
  });
});
