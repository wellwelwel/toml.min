import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { strict } from 'poku';

const require = createRequire(import.meta.url);
const { parse: parserToml } = require('../../src/index.ts');

const __dirname = dirname(fileURLToPath(import.meta.url));

export const read = (name: string): string =>
  readFileSync(join(__dirname, '..', '__snapshots__', name), 'utf8');

export const parse = (tomlStr: string, expected: unknown): void => {
  const actual = parserToml(tomlStr);

  strict.deepEqual(normalize(actual), normalize(expected));
};

const normalize = (val: unknown): unknown => {
  if (val instanceof Date) return val;
  if (Array.isArray(val)) return val.map(normalize);
  if (val !== null && typeof val === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(val as Record<string, unknown>)) {
      out[k] = normalize((val as Record<string, unknown>)[k]);
    }
    return out;
  }
  return val;
};
