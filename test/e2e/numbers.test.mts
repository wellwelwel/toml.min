import { describe, it, strict } from 'poku';
import { createRequire } from 'node:module';
import { parse, read } from '../__helpers__/index.mts';

const require = createRequire(import.meta.url);
const { parse: parseToml } = require('../../src/index.ts') as {
  parse: <T = unknown>(input: string) => T;
};

describe('Numbers', () => {
  it('integer formats', () =>
    parse(read('numbers--integer-formats.toml'), {
      a: 99,
      b: 42,
      c: 0,
      d: -17,
      e: 1000001,
      f: 12345,
    }));

  it('float formats', () =>
    parse(read('numbers--float-formats.toml'), {
      a: 1.0,
      b: 3.1415,
      c: -0.01,
      d: 5e22,
      e: 1e6,
      f: -2e-2,
      g: 6.626e-34,
      h: 9224617.445991227,
      i: Number.POSITIVE_INFINITY,
    }));

  it('hex integer', () =>
    parse(read('numbers--hex-integer.toml'), { a: 0xdeadbeef }));
  it('octal integer', () =>
    parse(read('numbers--octal-integer.toml'), { a: 0o755 }));
  it('binary integer', () =>
    parse(read('numbers--binary-integer.toml'), {
      a: 0b11010110,
    }));

  it('bare integer 0 at end of input', () =>
    parse(read('remaining-coverage--bare-zero.toml'), { a: 0 }));

  it('hex with lowercase letters', () =>
    parse(read('remaining-coverage--hex-lowercase.toml'), {
      a: 255,
    }));

  it('special float: inf', () => {
    const r = parseToml<Record<string, number>>(
      read('numbers--special-inf.toml')
    );
    strict.equal(r.a, Number.POSITIVE_INFINITY);
    strict.equal(r.b, Number.POSITIVE_INFINITY);
    strict.equal(r.c, Number.NEGATIVE_INFINITY);
  });

  it('special float: nan', () => {
    const r = parseToml<Record<string, number>>(
      read('numbers--special-nan.toml')
    );
    strict.ok(Number.isNaN(r.a));
    strict.ok(Number.isNaN(r.b));
    strict.ok(Number.isNaN(r.c));
  });
});

describe('Number validation', () => {
  it('float starting from 0', () =>
    parse(read('number-validation--float-starting-from-zero.toml'), {
      a: 0.5,
    }));
  it('float 0 with exponent', () =>
    parse(read('number-validation--float-zero-exponent.toml'), {
      a: 0,
    }));

  it('negative number', () =>
    parse(read('number-validation--negative.toml'), { a: -42 }));
  it('positive number with sign', () =>
    parse(read('number-validation--positive-sign.toml'), {
      a: 42,
    }));

  it('rejects 0 followed by underscore', () =>
    strict.throws(() =>
      parseToml(read('number-validation--zero-underscore.toml'))
    ));

  it('rejects trailing underscore in integer', () =>
    strict.throws(() =>
      parseToml(read('number-validation--trailing-underscore.toml'))
    ));

  it('rejects underscore before digit in hex', () =>
    strict.throws(() =>
      parseToml(read('number-validation--underscore-before-hex-digit.toml'))
    ));

  it('rejects leading zeros', () =>
    strict.throws(() => parseToml(read('errors--leading-zeros.toml'))));

  it('rejects value at end of input', () =>
    strict.throws(() =>
      parseToml(read('number-validation--value-at-end-of-input.toml'))
    ));

  it('rejects sign followed by non-digit', () =>
    strict.throws(() =>
      parseToml(read('remaining-coverage--sign-followed-by-non-digit.toml'))
    ));
});
