import type { ParseOptions } from '../../src/index.ts';
import { describe, it, strict } from 'poku';
import { parse } from '../__helpers__/index.mts';

type NestingSource = { name: string; build: (levels: number) => string };

const DEFAULT_LIMIT = 100;
const STACK_EXHAUSTING_LEVELS = 100_000;

const keyPath = (parts: number): string =>
  Array.from({ length: parts }, () => 'a').join('.');

const treeDepth = (value: unknown): number => {
  if (value === null || typeof value !== 'object') return 0;

  return 1 + Math.max(0, ...Object.values(value).map(treeDepth));
};

const takesLimit = (limit: number): boolean => {
  try {
    parse('', { maxDepth: limit });

    return true;
  } catch (error) {
    if (error instanceof TypeError) return false;

    throw error;
  }
};

const highestTakenLimit = (taken: number, refused: number): number => {
  if (refused - taken === 1) return taken;

  const middle = taken + Math.floor((refused - taken) / 2);

  return takesLimit(middle)
    ? highestTakenLimit(middle, refused)
    : highestTakenLimit(taken, middle);
};

describe('Nesting depth', () => {
  const sources: NestingSource[] = [
    {
      name: 'arrays',
      build: (levels) => `a = ${'['.repeat(levels)}${']'.repeat(levels)}`,
    },
    {
      name: 'inline tables',
      build: (levels) =>
        `a = ${'{ b = '.repeat(levels)}1${' }'.repeat(levels)}`,
    },
    {
      name: 'empty inline tables',
      build: (levels) =>
        `a = ${'{ b = '.repeat(levels - 1)}{}${' }'.repeat(levels - 1)}`,
    },
    { name: 'dotted keys', build: (levels) => `${keyPath(levels + 1)} = 1` },
    { name: 'table headers', build: (levels) => `[${keyPath(levels)}]` },
    {
      name: 'arrays of tables',
      build: (levels) => `[[${keyPath(levels - 1)}]]`,
    },
  ];
  const highestLimit = highestTakenLimit(
    DEFAULT_LIMIT,
    STACK_EXHAUSTING_LEVELS + 1
  );

  for (const source of sources) {
    it(`accepts ${source.name} nested ${DEFAULT_LIMIT} levels deep by default`, () =>
      strict.equal(
        treeDepth(parse(source.build(DEFAULT_LIMIT))) - 1,
        DEFAULT_LIMIT
      ));

    it(`rejects ${source.name} nested one level past the default`, () =>
      strict.throws(() => parse(source.build(DEFAULT_LIMIT + 1)), {
        name: 'TomlError',
        code: 'NESTING_TOO_DEEP',
      }));

    it(`accepts ${source.name} nested as deep as the highest limit allowed`, () =>
      strict.doesNotThrow(() =>
        parse(source.build(highestLimit), { maxDepth: highestLimit })
      ));

    it(`rejects ${source.name} nested one level past the highest limit allowed`, () =>
      strict.throws(
        () => parse(source.build(highestLimit + 1), { maxDepth: highestLimit }),
        { name: 'TomlError', code: 'NESTING_TOO_DEEP' }
      ));
  }

  it('rejects a million opening brackets at the first one past the limit', () =>
    strict.throws(() => parse(`a = ${'['.repeat(1_000_000)}`), {
      name: 'TomlError',
      code: 'NESTING_TOO_DEEP',
      line: 1,
      column: 105,
    }));

  it('rejects a dotted key with 20,000 parts at the first part past the limit', () =>
    strict.throws(() => parse(`${keyPath(20_000)} = 1`), {
      name: 'TomlError',
      code: 'NESTING_TOO_DEEP',
      line: 1,
      column: 203,
    }));

  it('rejects a table header with 100,000 parts at the first part past the limit', () =>
    strict.throws(() => parse(`[${keyPath(100_000)}]`), {
      name: 'TomlError',
      code: 'NESTING_TOO_DEEP',
      line: 1,
      column: 202,
    }));

  it('adds up levels from headers, dotted keys, inline tables and arrays', () => {
    const source = '[x.y]\nz.w = [{ v = [] }]';

    strict.equal(treeDepth(parse(source, { maxDepth: 6 })) - 1, 6);
    strict.throws(() => parse(source, { maxDepth: 5 }), {
      name: 'TomlError',
      code: 'NESTING_TOO_DEEP',
      line: 2,
      column: 14,
    });
  });

  it('counts the table inside an array of tables as its own level', () => {
    const source = '[[a]]\n[a.b]';

    strict.equal(treeDepth(parse(source, { maxDepth: 3 })) - 1, 3);
    strict.throws(() => parse(source, { maxDepth: 2 }), {
      name: 'TomlError',
      code: 'NESTING_TOO_DEEP',
      line: 2,
      column: 1,
    });
  });
});

describe('Nesting depth option', () => {
  const invalidLimits: unknown[] = [
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    '10',
  ];
  const parseLoosely = parse as (
    input: string,
    options?: { maxDepth?: unknown }
  ) => unknown;

  it('lowers the limit', () =>
    strict.throws(() => parse('a = [[[]]]', { maxDepth: 2 }), {
      name: 'TomlError',
      code: 'NESTING_TOO_DEEP',
    }));

  it('raises the limit', () => {
    const options: ParseOptions = { maxDepth: 1000 };

    strict.equal(
      treeDepth(parse(`a = ${'['.repeat(1000)}${']'.repeat(1000)}`, options)) -
        1,
      1000
    );
  });

  it('allows only plain values at the root when set to 0', () => {
    strict.deepEqual(
      { ...parse<Record<string, unknown>>('a = 1', { maxDepth: 0 }) },
      { a: 1 }
    );
    strict.throws(() => parse('a = []', { maxDepth: 0 }), {
      name: 'TomlError',
      code: 'NESTING_TOO_DEEP',
    });
    strict.throws(() => parse('[a]', { maxDepth: 0 }), {
      name: 'TomlError',
      code: 'NESTING_TOO_DEEP',
    });
  });

  for (const limit of invalidLimits)
    it(`refuses the ${typeof limit} ${String(limit)} as a limit`, () =>
      strict.throws(
        () => parseLoosely('a = 1', { maxDepth: limit }),
        TypeError
      ));
});
