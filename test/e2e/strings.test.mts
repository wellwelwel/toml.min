import { describe, it, strict } from 'poku';
import { createRequire } from 'node:module';
import { parse, read } from '../__helpers__/index.mts';

const require = createRequire(import.meta.url);
const { parse: parseToml } = require('../../src/index.ts');

describe('Strings', () => {
  it('unicode escapes \\u', () =>
    parse(read('strings--unicode-escape-u.toml'), {
      str: 'My name is Jos\u00E9',
    }));
  it('unicode escapes \\U', () =>
    parse(read('strings--unicode-escape-U.toml'), {
      str: 'My name is Jos\u00E9',
    }));
  it('hex escapes \\x', () =>
    parse(read('strings--hex-escape-x.toml'), { str: 'AB' }));
  it('escape \\e (ESC)', () =>
    parse(read('strings--escape-e.toml'), { str: '\x1B' }));

  it('multiline basic strings', () =>
    parse(read('strings--multiline-basic.toml'), {
      key1: 'One\nTwo',
      key2: 'One\nTwo',
      key3: 'One\nTwo',
    }));

  it('multiline eat whitespace', () =>
    parse(read('strings--multiline-eat-whitespace.toml'), {
      key1: 'The quick brown fox jumps over the lazy dog.',
      key2: 'The quick brown fox jumps over the lazy dog.',
      key3: 'The quick brown fox jumps over the lazy dog.',
    }));

  it('literal strings', () =>
    parse(read('strings--literal.toml'), {
      winpath: 'C:\\Users\\nodejs\\templates',
      winpath2: '\\\\ServerX\\admin$\\system32\\',
      quoted: 'Tom "Dubs" Preston-Werner',
      regex: '<\\i\\c*\\s*>',
    }));

  it('multiline literal strings', () =>
    parse(read('strings--multiline-literal.toml'), {
      regex2: "I [dw]on't need \\d{2} apples",
      lines:
        'The first newline is\ntrimmed in raw strings.\n   All other whitespace\n   is preserved.\n',
    }));

  it('empty basic string', () =>
    parse(read('strings--empty-basic.toml'), { a: '' }));
  it('empty literal string', () =>
    parse(read('strings--empty-literal.toml'), { a: '' }));
  it('empty multiline basic string', () =>
    parse(read('strings--empty-multiline-basic.toml'), { a: '' }));
  it('empty multiline literal string', () =>
    parse(read('strings--empty-multiline-literal.toml'), {
      a: '',
    }));

  it('multiline basic with trailing quotes', () =>
    parse(read('strings--multiline-basic-trailing-quotes.toml'), {
      a: '""hello""',
    }));
  it('multiline literal with trailing quotes', () =>
    parse(read('strings--multiline-literal-trailing-quotes.toml'), {
      a: "''hello''",
    }));

  it('escape \\r in basic string', () =>
    parse(read('remaining-coverage--escape-r.toml'), {
      a: 'hello\rworld',
    }));
});

describe('Escape sequences', () => {
  it('escape \\b (backspace)', () =>
    parse(read('escape-sequences--backspace.toml'), { a: '\b' }));
  it('escape \\f (form feed)', () =>
    parse(read('escape-sequences--form-feed.toml'), { a: '\f' }));

  it('rejects truncated escape at end of input', () =>
    strict.throws(() =>
      parseToml(read('escape-sequences--truncated-escape.toml'))
    ));

  it('rejects truncated unicode \\u escape', () =>
    strict.throws(() =>
      parseToml(read('escape-sequences--truncated-unicode-u.toml'))
    ));

  it('rejects truncated unicode \\U escape', () =>
    strict.throws(() =>
      parseToml(read('escape-sequences--truncated-unicode-U.toml'))
    ));

  it('rejects truncated hex \\x escape', () =>
    strict.throws(() =>
      parseToml(read('escape-sequences--truncated-hex-x.toml'))
    ));

  it('rejects bad escape sequences', () =>
    strict.throws(() => parseToml(read('errors--bad-escape.toml'))));
});

describe('Multiline string edge cases', () => {
  it('multiline basic: backslash followed by CR+LF', () =>
    parse(read('multiline-edge-cases--backslash-crlf.toml'), {
      a: 'hello',
    }));

  it('multiline basic: backslash-newline eats spaces and newlines', () =>
    parse(
      read('multiline-edge-cases--backslash-newline-eats-whitespace.toml'),
      { a: 'hello' }
    ));

  it('multiline basic: backslash-newline eats CRLF', () =>
    parse(read('multiline-edge-cases--backslash-newline-eats-crlf.toml'), {
      a: 'hello',
    }));

  it('multiline basic: backslash-whitespace without newline is lenient', () =>
    parse(read('remaining-coverage--backslash-whitespace-no-newline.toml'), {
      a: 'x\n',
    }));

  it('rejects 6+ quotes in multiline basic string', () =>
    strict.throws(() =>
      parseToml(read('multiline-edge-cases--six-plus-quotes-basic.toml'))
    ));

  it('rejects 6+ quotes in multiline literal string', () =>
    strict.throws(() =>
      parseToml(read('multiline-edge-cases--six-plus-quotes-literal.toml'))
    ));

  it('rejects multiline basic string ending with backslash', () =>
    strict.throws(() =>
      parseToml(read('remaining-coverage--multiline-ending-backslash.toml'))
    ));
});

describe('Literal string errors', () => {
  it('rejects control char in literal string', () =>
    strict.throws(() =>
      parseToml(read('literal-string-errors--control-char-literal.toml'))
    ));

  it('rejects control char in basic string', () =>
    strict.throws(() =>
      parseToml(read('literal-string-errors--control-char-basic.toml'))
    ));

  it('rejects unterminated basic string', () =>
    strict.throws(() =>
      parseToml(read('errors--unterminated-basic-string.toml'))
    ));

  it('rejects unterminated literal string', () =>
    strict.throws(() =>
      parseToml(read('errors--unterminated-literal-string.toml'))
    ));

  it('rejects unterminated multiline basic string', () =>
    strict.throws(() =>
      parseToml(read('errors--unterminated-multiline-basic.toml'))
    ));

  it('rejects unterminated multiline literal string', () =>
    strict.throws(() =>
      parseToml(read('errors--unterminated-multiline-literal.toml'))
    ));

  it('rejects bad unicode', () =>
    strict.throws(() => parseToml(read('errors--bad-unicode.toml'))));
});
