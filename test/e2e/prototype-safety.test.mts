import { describe, it, strict } from 'poku';
import { TomlError, assertParsesTo, parse } from '../__helpers__/index.mts';

type Route = {
  name: string;
  source: (key: string) => string;
  path: (key: string) => (string | number)[];
  line: number;
  column: number;
  holdsTable: boolean;
};

type Spelling = { name: string; write: (key: string) => string };

type ValueCase = { name: string; source: string; expected: unknown };

const INERT_KEYS = ['prototype'];
const UNSAFE_KEYS = ['__proto__', 'constructor'];
const UNSAFE_SOURCES = ['__proto__ = true', 'constructor.a = true'];
const NOT_ALLOWING: unknown[] = [false, 'true', 1];
const LOOKALIKE_KEYS = [
  '__proto',
  '__PROTO__',
  '__proto__x',
  ' __proto__',
  'Constructor',
  'constructors',
  ' constructor',
];

const CONSTRUCTOR_VALUES: ValueCase[] = [
  {
    name: 'text',
    source: 'constructor = "init"',
    expected: { constructor: 'init' },
  },
  {
    name: 'an integer',
    source: 'constructor = 1',
    expected: { constructor: 1 },
  },
  {
    name: 'a boolean',
    source: 'constructor = true',
    expected: { constructor: true },
  },
  {
    name: 'an array',
    source: 'constructor = ["a", "b"]',
    expected: { constructor: ['a', 'b'] },
  },
  {
    name: 'an array of inline tables',
    source: 'constructor = [{ a = 1 }]',
    expected: { constructor: [{ a: 1 }] },
  },
  {
    name: 'an array of tables',
    source: '[[constructor]]\na = 1',
    expected: { constructor: [{ a: 1 }] },
  },
  {
    name: 'text at the end of a dotted key',
    source: 'a.constructor = "init"',
    expected: { a: { constructor: 'init' } },
  },
  {
    name: 'text in a headed table',
    source: '[a]\nconstructor = "init"',
    expected: { a: { constructor: 'init' } },
  },
  {
    name: 'text in an inline table',
    source: 'a = { constructor = "init" }',
    expected: { a: { constructor: 'init' } },
  },
];

const SPELLINGS: Spelling[] = [
  { name: 'bare', write: (key) => key },
  { name: 'in double quotes', write: (key) => `"${key}"` },
  { name: 'in single quotes', write: (key) => `'${key}'` },
  {
    name: 'with an escape',
    write: (key) => `"\\x${key.charCodeAt(0).toString(16)}${key.slice(1)}"`,
  },
];

const parseUnchecked = parse as (input: string, options: unknown) => unknown;

const assertPrototypeUntouched = (): void => {
  const fresh: Record<string, unknown> = {};

  strict.equal(Object.getPrototypeOf(fresh), Object.prototype);
  strict.equal(fresh.polluted, undefined);
  strict.equal(Object.hasOwn(Object.prototype, 'polluted'), false);
  strict.equal(fresh.constructor, Object);
};

const assertOwnPath = (result: unknown, path: (string | number)[]): void => {
  let current = result;

  for (const step of path) {
    if (typeof current !== 'object' || current === null)
      strict.fail(`Expected a table or an array at ${step}`);
    if (typeof step === 'number') {
      strict.ok(Array.isArray(current));
    } else {
      strict.equal(Object.getPrototypeOf(current), null);
      strict.ok(Object.hasOwn(current, step), `own key ${step}`);
    }
    current = Reflect.get(current, step);
  }
  strict.equal(current, true);
};

describe('Prototype safety', () => {
  const routes: Route[] = [
    {
      name: 'the root table',
      source: (key) => `${key}.polluted = true`,
      path: (key) => [key, 'polluted'],
      line: 1,
      column: 1,
      holdsTable: true,
    },
    {
      name: 'a key holding an inline table',
      source: (key) => `${key} = { polluted = true }`,
      path: (key) => [key, 'polluted'],
      line: 1,
      column: 1,
      holdsTable: true,
    },
    {
      name: 'a table header',
      source: (key) => `[${key}]\npolluted = true`,
      path: (key) => [key, 'polluted'],
      line: 1,
      column: 2,
      holdsTable: true,
    },
    {
      name: 'a headed table',
      source: (key) => `[a.${key}]\npolluted = true`,
      path: (key) => ['a', key, 'polluted'],
      line: 1,
      column: 4,
      holdsTable: true,
    },
    {
      name: 'a key inside a headed table',
      source: (key) => `[a]\n${key} = { polluted = true }`,
      path: (key) => ['a', key, 'polluted'],
      line: 2,
      column: 1,
      holdsTable: true,
    },
    {
      name: 'a dotted key',
      source: (key) => `a.${key}.polluted = true`,
      path: (key) => ['a', key, 'polluted'],
      line: 1,
      column: 3,
      holdsTable: true,
    },
    {
      name: 'an inline table',
      source: (key) => `a = { ${key} = { polluted = true } }`,
      path: (key) => ['a', key, 'polluted'],
      line: 1,
      column: 7,
      holdsTable: true,
    },
    {
      name: 'a dotted key inside an inline table',
      source: (key) => `a = { ${key}.polluted = true }`,
      path: (key) => ['a', key, 'polluted'],
      line: 1,
      column: 7,
      holdsTable: true,
    },
    {
      name: 'an array of tables header',
      source: (key) => `[[${key}]]\npolluted = true`,
      path: (key) => [key, 0, 'polluted'],
      line: 1,
      column: 3,
      holdsTable: false,
    },
    {
      name: 'a key inside an array of tables',
      source: (key) => `[[a]]\n${key} = { polluted = true }`,
      path: (key) => ['a', 0, key, 'polluted'],
      line: 2,
      column: 1,
      holdsTable: true,
    },
  ];

  for (const route of routes)
    for (const spelling of SPELLINGS) {
      const unsafeKeys = route.holdsTable ? UNSAFE_KEYS : ['__proto__'];

      for (const key of INERT_KEYS)
        it(`keeps ${key} written ${spelling.name} as an ordinary own key in ${route.name}`, () => {
          const result = parse(route.source(spelling.write(key)));

          assertOwnPath(result, route.path(key));
          assertPrototypeUntouched();
        });

      for (const key of unsafeKeys) {
        it(`refuses ${key} written ${spelling.name} in ${route.name}`, () =>
          strict.throws(
            () => parse(route.source(spelling.write(key))),
            (error) =>
              error instanceof TomlError &&
              error.code === 'INVALID_KEY' &&
              error.line === route.line &&
              error.column === route.column
          ));

        it(`keeps ${key} written ${spelling.name} as an ordinary own key in ${route.name} when allowed`, () => {
          const result = parse(route.source(spelling.write(key)), {
            allowUnsafeKeys: true,
          });

          assertOwnPath(result, route.path(key));
          assertPrototypeUntouched();
        });
      }
    }

  for (const { name, source, expected } of CONSTRUCTOR_VALUES)
    it(`keeps constructor holding ${name}`, () =>
      assertParsesTo(source, expected));

  for (const value of NOT_ALLOWING)
    for (const source of UNSAFE_SOURCES)
      it(`refuses ${source} when allowUnsafeKeys is ${JSON.stringify(value)}`, () =>
        strict.throws(
          () => parseUnchecked(source, { allowUnsafeKeys: value }),
          { name: 'TomlError', code: 'INVALID_KEY', line: 1, column: 1 }
        ));

  it('still refuses __proto__ defined twice when allowed', () =>
    strict.throws(
      () => parse('__proto__ = 1\n__proto__ = 2', { allowUnsafeKeys: true }),
      { name: 'TomlError', code: 'DUPLICATE_KEY', line: 2, column: 1 }
    ));

  for (const key of LOOKALIKE_KEYS)
    it(`keeps the lookalike "${key}" as an ordinary own key`, () =>
      assertOwnPath(parse(`"${key}".polluted = true`), [key, 'polluted']));
});
