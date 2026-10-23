import { describe, it, strict } from 'poku';
import { parse } from '../__helpers__/index.mts';

describe('Unquoted values', () => {
  const notValues = ['tru', 'ture', 'fals', 'flase', 'null', 'nil'];

  for (const word of notValues)
    it(`rejects the unquoted word ${word}`, () =>
      strict.throws(() => parse(`a = ${word}`), {
        name: 'TomlError',
        code: 'INVALID_VALUE',
        line: 1,
        column: 5,
      }));
});
