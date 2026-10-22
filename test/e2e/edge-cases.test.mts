import type { Rejection } from '../__helpers__/index.mts';
import { describe, it, strict } from 'poku';
import { assertParsesTo, parse, read } from '../__helpers__/index.mts';

describe('Edge cases', () => {
  it('reads an empty document as an empty table', () =>
    assertParsesTo(read('edge-cases--empty-input.toml'), {}));

  it('reads a document of only comments as an empty table', () =>
    assertParsesTo(read('edge-cases--only-comments.toml'), {}));

  it('reads a document of only whitespace as an empty table', () =>
    assertParsesTo(read('edge-cases--whitespace-only.toml'), {}));

  it('ignores a byte order mark at the start', () =>
    assertParsesTo(read('edge-cases--bom.toml'), { a: 1 }));

  it('accepts CRLF line endings', () =>
    assertParsesTo(read('edge-cases--crlf.toml'), { a: 1, b: 2 }));

  it('accepts CRLF after a table header', () =>
    assertParsesTo(read('edge-cases--crlf-after-table.toml'), {
      a: { b: 1 },
    }));

  it('turns CRLF into LF inside a multiline basic string', () =>
    assertParsesTo(read('edge-cases--crlf-multiline-basic.toml'), {
      a: 'line1\nline2\n',
    }));

  it('turns CRLF into LF inside a multiline literal string', () =>
    assertParsesTo(read('edge-cases--crlf-multiline-literal.toml'), {
      a: 'line1\nline2\n',
    }));

  it('trims a CRLF right after the opening quotes of a multiline basic string', () =>
    assertParsesTo(read('edge-cases--crlf-multiline-basic-start.toml'), {
      a: 'hello',
    }));

  it('trims a CRLF right after the opening quotes of a multiline literal string', () =>
    assertParsesTo(read('edge-cases--crlf-multiline-literal-start.toml'), {
      a: 'hello',
    }));

  it('reads a value on the last line without a newline', () =>
    assertParsesTo(read('edge-cases--no-trailing-newline.toml'), { a: 1 }));

  it('reads a table header on the last line without a newline', () =>
    assertParsesTo(read('edge-cases--table-header-no-newline.toml'), {
      a: {},
    }));
});

describe('Whitespace', () => {
  it('ignores blank lines and spaces around key/value pairs', () =>
    assertParsesTo(read('whitespace--handles-whitespace.toml'), {
      a: 1,
      b: 2,
    }));

  it('ignores newlines before the first key', () =>
    assertParsesTo(read('whitespace--leading-newlines.toml'), {
      test: 'ing',
    }));
});

describe('Comments', () => {
  const rejections: Rejection[] = [
    {
      name: 'a control character inside a comment',
      fixture: 'comments--control-character.toml',
      code: 'CONTROL_CHARACTER',
    },
    {
      name: 'a comment without # after a table header',
      fixture: 'comments--missing-hash-after-table-header.toml',
      code: 'EXPECTED_NEWLINE',
    },
    {
      name: 'a comment without # after a string',
      fixture: 'comments--missing-hash-after-string.toml',
      code: 'EXPECTED_NEWLINE',
    },
    {
      name: 'a comment without # after a number',
      fixture: 'comments--missing-hash-after-number.toml',
      code: 'EXPECTED_NEWLINE',
    },
    {
      name: 'a comment without # inside an array',
      fixture: 'comments--missing-hash-in-array.toml',
      code: 'INVALID_VALUE',
    },
  ];

  for (const { name, fixture, code } of rejections)
    it(`rejects ${name}`, () =>
      strict.throws(() => parse(read(fixture)), { name: 'TomlError', code }));
});
