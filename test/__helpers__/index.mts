import type { TomlErrorCode } from '../../src/index.ts';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { strict } from 'poku';

export type Rejection = { name: string; fixture: string; code: TomlErrorCode };

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
export const {
  parse,
  TomlError,
  LocalDateOrTime,
  OffsetDateTime,
}: typeof import('../../src/index.ts') = require('../../src/index.ts');

const isTable = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
};

const normalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalize);
  if (!isTable(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, normalize(item)])
  );
};

export const read = (name: string): string =>
  readFileSync(join(__dirname, '..', '__snapshots__', name), 'utf8');

export const assertParsesTo = (source: string, expected: unknown): void =>
  strict.deepEqual(normalize(parse(source)), normalize(expected));
