import type { Rejection } from '../__helpers__/index.mts';
import { describe, it, strict } from 'poku';
import { assertParsesTo, parse, read } from '../__helpers__/index.mts';

describe('Numbers', () => {
  it('reads signed, unsigned and underscored integers', () =>
    assertParsesTo(read('numbers--integer-formats.toml'), {
      a: 99,
      b: 42,
      c: 0,
      d: -17,
      e: 1000001,
      f: 12345,
    }));

  it('reads fractions, exponents and underscored floats', () =>
    assertParsesTo(read('numbers--float-formats.toml'), {
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

  it('reads hexadecimal integers', () =>
    assertParsesTo(read('numbers--hex-integer.toml'), { a: 0xdeadbeef }));

  it('reads lowercase hexadecimal digits', () =>
    assertParsesTo(read('numbers--hex-lowercase.toml'), { a: 255 }));

  it('reads octal integers', () =>
    assertParsesTo(read('numbers--octal-integer.toml'), { a: 0o755 }));

  it('reads binary integers', () =>
    assertParsesTo(read('numbers--binary-integer.toml'), { a: 0b11010110 }));

  it('reads 0 at the end of the file', () =>
    assertParsesTo(read('numbers--bare-zero.toml'), { a: 0 }));

  it('reads inf with and without a sign', () => {
    const result = parse<Record<string, number>>(
      read('numbers--special-inf.toml')
    );

    strict.equal(result.a, Number.POSITIVE_INFINITY);
    strict.equal(result.b, Number.POSITIVE_INFINITY);
    strict.equal(result.c, Number.NEGATIVE_INFINITY);
  });

  it('reads nan with and without a sign', () => {
    const result = parse<Record<string, number>>(
      read('numbers--special-nan.toml')
    );

    strict.ok(Number.isNaN(result.a));
    strict.ok(Number.isNaN(result.b));
    strict.ok(Number.isNaN(result.c));
  });
});

describe('Number validation', () => {
  const rejections: Rejection[] = [
    {
      name: 'a leading zero',
      fixture: 'number-validation--leading-zeros.toml',
      code: 'INVALID_NUMBER',
    },
    {
      name: 'an underscore right after a leading 0',
      fixture: 'number-validation--zero-underscore.toml',
      code: 'INVALID_NUMBER',
    },
    {
      name: 'a trailing underscore',
      fixture: 'number-validation--trailing-underscore.toml',
      code: 'INVALID_NUMBER',
    },
    {
      name: 'an underscore before the first hexadecimal digit',
      fixture: 'number-validation--underscore-before-hex-digit.toml',
      code: 'INVALID_NUMBER',
    },
    {
      name: 'a sign followed by letters',
      fixture: 'number-validation--sign-without-digits.toml',
      code: 'INVALID_NUMBER',
    },
  ];
  const signedPrefixedIntegers = [
    '+0x1F',
    '-0x1F',
    '+0o17',
    '-0o17',
    '+0b1',
    '-0b1',
  ];

  it('reads 0 with an exponent', () =>
    assertParsesTo(read('number-validation--float-zero-exponent.toml'), {
      a: 0,
    }));

  for (const { name, fixture, code } of rejections)
    it(`rejects ${name}`, () =>
      strict.throws(() => parse(read(fixture)), { name: 'TomlError', code }));

  for (const integer of signedPrefixedIntegers)
    it(`rejects the sign in ${integer}, which only decimal numbers allow`, () =>
      strict.throws(() => parse(`a = ${integer}`), {
        name: 'TomlError',
        code: 'INVALID_NUMBER',
        line: 1,
        column: 5,
      }));
});

describe('Integer range', () => {
  const unsafeIntegers = [
    '9007199254740993',
    '9007199254740992',
    '-9007199254740992',
    '0x20000000000000',
    '0o400000000000000000',
    `0b1${'0'.repeat(53)}`,
    '9223372036854775808',
    '9'.repeat(400),
  ];

  for (const integer of unsafeIntegers)
    it(`rejects ${integer.slice(0, 24)} instead of rounding it`, () =>
      strict.throws(() => parse(`a = ${integer}`), {
        name: 'TomlError',
        code: 'INTEGER_OUT_OF_RANGE',
        line: 1,
        column: 5,
      }));

  it('keeps the edges of the safe integer range', () => {
    const result = parse<Record<string, number>>(
      'max = 9007199254740991\nmin = -9007199254740991\nhex = 0x1FFFFFFFFFFFFF'
    );

    strict.equal(result.max, 9007199254740991);
    strict.equal(result.min, -9007199254740991);
    strict.equal(result.hex, 9007199254740991);
  });

  it('applies only to integers, not floats', () =>
    strict.equal(
      parse<Record<string, number>>('a = 9007199254740993.0').a,
      9007199254740992
    ));
});

describe('BigInt integers', () => {
  const outOfInt64 = [
    '9223372036854775808',
    '-9223372036854775809',
    '0x8000000000000000',
    '10_000_000_000_000_000_000',
    '9'.repeat(200_000),
  ];
  const notEnabling: unknown[] = ['true', 'false', 1];
  const parseLoosely = parse as (
    input: string,
    options: { bigint?: unknown }
  ) => Record<string, unknown>;

  it('reads the whole 64-bit range exactly', () => {
    const result = parse<Record<string, bigint>>(
      'max = 9223372036854775807\nmin = -9223372036854775808\nhex = 0x7FFFFFFFFFFFFFFF',
      { bigint: true }
    );

    strict.equal(result.max, 9223372036854775807n);
    strict.equal(result.min, -9223372036854775808n);
    strict.equal(result.hex, 9223372036854775807n);
  });

  it('returns every integer as a BigInt and leaves floats as numbers', () => {
    const result = parse<Record<string, unknown>>(
      'small = 42\nzero = 0\npadded = 0x0000000000000000000000000000000000000000000000000000000000000000001\nfloat = 1.5',
      { bigint: true }
    );

    strict.equal(result.small, 42n);
    strict.equal(result.zero, 0n);
    strict.equal(result.padded, 1n);
    strict.equal(result.float, 1.5);
  });

  for (const integer of outOfInt64)
    it(`rejects ${integer.slice(0, 24)} outside the 64-bit range`, () =>
      strict.throws(() => parse(`a = ${integer}`, { bigint: true }), {
        name: 'TomlError',
        code: 'INTEGER_OUT_OF_RANGE',
        line: 1,
        column: 5,
      }));

  for (const value of notEnabling)
    it(`keeps integers as numbers when bigint is ${JSON.stringify(value)}`, () =>
      strict.equal(parseLoosely('a = 1', { bigint: value }).a, 1));

  for (const prefix of ['0x', '0o', '0b'])
    it(`accepts ${prefix} integers padded with leading zeros`, () =>
      strict.equal(
        parse<Record<string, bigint>>(`a = ${prefix}${'0'.repeat(100)}1`, {
          bigint: true,
        }).a,
        1n
      ));
});
