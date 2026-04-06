import { describe, it, strict } from 'poku';
import { createRequire } from 'node:module';
import { parse as parsesToml } from '../__helpers__/index.mts';

const require = createRequire(import.meta.url);
const { parse } = require('../../src/index.ts');

describe('Datetimes', () => {
  it('parses dates from Date.toISOString()', () => {
    const date = new Date();
    parsesToml(`a = ${date.toISOString()}`, { a: date });
  });
});

describe('Edge cases', () => {
  it('throws TypeError for non-string input', () =>
    strict.throws(() => (parse as (x: unknown) => unknown)(42)));
});
