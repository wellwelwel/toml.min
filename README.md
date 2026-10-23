<h1 align="center">toml.min</h1>
<div align="center">

[![NPM Version](https://img.shields.io/npm/v/toml.min.svg?label=&color=70a1ff&logo=npm&logoColor=white)](https://www.npmjs.com/package/toml.min)
[![Coverage](https://img.shields.io/codecov/c/github/wellwelwel/toml.min?label=&logo=codecov&logoColor=white&color=98cc00)](https://app.codecov.io/gh/wellwelwel/toml.min)
[![Secured By Lagune](https://img.shields.io/badge/Lagune-2f7bff?logo=springsecurity&logoColor=white&label=Secured%20By&labelColor=303952)](https://lagune.ai)<br />
[![GitHub Workflow Status (Node.js)](https://img.shields.io/github/actions/workflow/status/wellwelwel/toml.min/ci_node.yml?event=push&label=&branch=main&logo=nodedotjs&logoColor=535c68&color=badc58)](https://github.com/wellwelwel/toml.min/actions/workflows/ci_node.yml?query=branch%3Amain)
[![GitHub Workflow Status (Bun)](https://img.shields.io/github/actions/workflow/status/wellwelwel/toml.min/ci_bun.yml?event=push&label=&branch=main&logo=bun&logoColor=ffffff&color=f368e0)](https://github.com/wellwelwel/toml.min/actions/workflows/ci_bun.yml?query=branch%3Amain)
[![GitHub Workflow Status (Deno)](https://img.shields.io/github/actions/workflow/status/wellwelwel/toml.min/ci_deno.yml?event=push&label=&branch=main&logo=deno&logoColor=ffffff&color=079992)](https://github.com/wellwelwel/toml.min/actions/workflows/ci_deno.yml?query=branch%3Amain)

🔧 [**Faster**](#benchmark) and lightweight [**TOML**](https://toml.io) **v1.1.0** parser for **JavaScript** and **TypeScript**.

</div>

- Zero runtime dependencies
- Single-file hand-written recursive-descent parser
- Compatible with **Node.js** _(18+)_, **Bun**, and **Deno**

---

## Install

```bash
# Node.js
npm i toml.min
```

```bash
# Bun
bun add toml.min
```

```bash
# Deno
deno add npm:toml.min
```

---

## Usage

### Import

#### ES Modules

```ts
import { parse } from 'toml.min';
```

#### CommonJS

```js
const { parse } = require('toml.min');
```

### Quickstart

```ts
import { parse } from 'toml.min';

const data = parse(`
  title = "TOML Example"

  [owner]
  name = "Tom Preston-Werner"
  dob = 1979-05-27T07:32:00Z

  [database]
  ports = [8001, 8001, 8003]
  enabled = true
`);

data.title; // "TOML Example"
data.owner.name; // "Tom Preston-Werner"
data.owner.dob; // OffsetDateTime (a Date)
data.database.ports; // [8001, 8001, 8003]
data.database.enabled; // true
```

### Options

`parse` takes an optional second argument:

```ts
parse(source, { maxDepth: 100, bigint: false, allowUnsafeKeys: false });
```

| Option            | Default | Description                                                                                                                                                   |
| ----------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maxDepth`        | `100`   | How deep tables and arrays can nest below the root, however they are written. Must be an integer from `0` to `1000`. See [Untrusted Input](#untrusted-input). |
| `bigint`          | `false` | Returns integers as `BigInt`. See [Integers](#integers).                                                                                                      |
| `allowUnsafeKeys` | `false` | Accepts `__proto__` keys and `constructor` keys holding a table. See [Untrusted Input](#untrusted-input).                                                     |

---

## Supported Types

### Strings

Basic, literal, multiline, and all escape sequences:

```toml
basic = "hello\nworld"
literal = 'no \escapes'
multiline = """
  line one
  line two"""
multiline_literal = '''
  raw content
  preserved'''
```

Escape sequences: `\b`, `\t`, `\n`, `\f`, `\r`, `\\`, `\"`, `\e`, `\uXXXX`, `\UXXXXXXXX`, `\xHH`.

### Integers

```toml
decimal = 42
positive = +99
negative = -17
with_separator = 1_000_000
hex = 0xDEADBEEF
octal = 0o755
binary = 0b11010110
```

Integers are returned as numbers, so they must fit the range a number holds exactly (±9007199254740991). Anything outside it throws `INTEGER_OUT_OF_RANGE` instead of being rounded.

With `bigint: true`, every integer is returned as a `BigInt` and the range grows to the full 64 bits **TOML** allows (-9223372036854775808 to 9223372036854775807). Floats stay numbers.

### Floats

```toml
pi = 3.14159
scientific = 6.626e-34
positive_inf = inf
negative_inf = -inf
not_a_number = nan
```

Floats are returned as numbers, so one too large, such as `1e400`, becomes `Infinity`. Check untrusted floats with `Number.isFinite` before using them as limits or timeouts.

### Booleans

```toml
enabled = true
disabled = false
```

### Dates and Times

Offset date-times are returned as `OffsetDateTime`, a `Date` that also keeps the original `text`. A `Date` only stores the UTC instant to the millisecond, so the written offset and any finer precision survive only in `text`.

Local date-times, dates, and times are returned as `LocalDateOrTime`, so they can be told apart from quoted strings. Each one carries the original `text` and a `kind`:

```toml
odt = 1979-05-27T07:32:00+05:30  # OffsetDateTime { text: '1979-05-27T07:32:00+05:30' }
ldt = 1979-05-27T07:32:00        # LocalDateOrTime { kind: 'date-time', text: '1979-05-27T07:32:00' }
ld  = 1979-05-27                  # LocalDateOrTime { kind: 'date', text: '1979-05-27' }
lt  = 07:32                       # LocalDateOrTime { kind: 'time', text: '07:32' }
```

```ts
import { LocalDateOrTime, OffsetDateTime, parse } from 'toml.min';

const { odt, ld } = parse<{ odt: unknown; ld: unknown }>(
  'odt = 1979-05-27T07:32:00+05:30\nld = 1979-05-27'
);

if (odt instanceof OffsetDateTime) odt.toISOString(); // "1979-05-27T02:02:00.000Z"
if (odt instanceof OffsetDateTime) odt.text; // "1979-05-27T07:32:00+05:30"
if (ld instanceof LocalDateOrTime && ld.kind === 'date') ld.text; // "1979-05-27"
```

`String()` and `JSON.stringify` turn a `LocalDateOrTime` into its `text`. An `OffsetDateTime` serializes like any `Date`, as the UTC instant.

### Tables

```toml
[server]
host = "localhost"
port = 8080

[server.tls]
enabled = true
```

### Inline Tables

```toml
point = { x = 1, y = 2 }
name = { first = "Tom", last = "Preston-Werner" }
```

### Arrays

```toml
ports = [8001, 8002, 8003]
mixed = [1, "two", 3.0, true]
nested = [[1, 2], [3, 4]]
```

### Array of Tables

```toml
[[products]]
name = "Hammer"
sku = 738594937

[[products]]
name = "Nail"
sku = 284758393
```

### Dotted Keys

```toml
fruit.apple.color = "red"
fruit.apple.taste.sweet = true
```

---

## Error Handling

`parse` throws a `TomlError` with a stable `code` and the 1-based `line` and `column` of the problem:

```ts
import { parse, TomlError } from 'toml.min';

try {
  parse('key = "unterminated');
} catch (error) {
  if (error instanceof TomlError)
    console.error(
      `${error.code} on line ${error.line}, column ${error.column}: ${error.message}`
    );
}
```

- `message` is plain language and can change in any release, so match on `code` to tell errors apart or to write your own messages.
- Messages are at most 300 characters, and any key or value they quote is cut to 40 characters (marked with `…`). Quoted text escapes `"` and `\`, and shows control, invisible, and bidirectional characters, as well as lone surrogates, as code points such as `[U+202E]`.
- A source that is not a string, or an invalid option, throws a `TypeError` instead.

### Error Codes

| Code                        | Meaning                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `CONTROL_CHARACTER`         | A comment or string contains a control character.                                                                   |
| `DUPLICATE_KEY`             | A key or table is defined more than once, or extended where **TOML** forbids it.                                    |
| `EXPECTED_COMMA`            | Array items or inline table entries are missing a comma between them.                                               |
| `EXPECTED_EQUALS`           | A key is not followed by `=`.                                                                                       |
| `EXPECTED_NEWLINE`          | Extra content follows a value or table header on the same line.                                                     |
| `EXPECTED_VALUE`            | A value is missing.                                                                                                 |
| `INTEGER_OUT_OF_RANGE`      | An integer is out of range. See [Integers](#integers).                                                              |
| `INVALID_DATE`              | A date doesn't exist, such as `2023-02-29`.                                                                         |
| `INVALID_ESCAPE`            | An escape sequence is unknown or incomplete.                                                                        |
| `INVALID_KEY`               | A key is missing, triple-quoted, unquoted when it needs quotes, or unsafe. See [Untrusted Input](#untrusted-input). |
| `INVALID_NUMBER`            | A number is malformed, such as `007` or `1__000`.                                                                   |
| `INVALID_TABLE_HEADER`      | A table header is not closed with `]` or `]]`.                                                                      |
| `INVALID_TIME`              | A time or time zone offset is invalid, such as `24:00:00` or `07:32.5` (a fraction without seconds).                |
| `INVALID_VALUE`             | A value is invalid, such as unquoted text.                                                                          |
| `LONE_SURROGATE`            | A comment or string contains a lone surrogate, which is invalid Unicode.                                            |
| `NESTING_TOO_DEEP`          | Tables and arrays nest deeper than `maxDepth`.                                                                      |
| `TOO_MANY_QUOTES`           | A multiline string ends with more than five quotes in a row.                                                        |
| `UNTERMINATED_ARRAY`        | An array is never closed with `]`.                                                                                  |
| `UNTERMINATED_INLINE_TABLE` | An inline table is never closed with `}`.                                                                           |
| `UNTERMINATED_STRING`       | A string is never closed.                                                                                           |

---

## Untrusted Input

- `maxDepth` stops a hostile file from exhausting the call stack, in the parser or in your code that walks the result. Its ceiling of `1000` stays below the shallowest overflow measured (about 1,800 nested inline tables on **Node.js** 22).
- `parse` doesn't limit input size, and its work grows linearly with it, so cap the size of untrusted input before parsing.
- Every table has a `null` prototype, so parsing never changes a shared prototype. **TOML** allows `__proto__` keys and `constructor` keys holding a table, but the parser refuses both with `INVALID_KEY`, because copying the result with `Object.assign` or a deep merge can turn them into prototype changes. A `constructor` key holding any other value is accepted. With `allowUnsafeKeys`, copy results with spread (`{ ...result }`) and merge them only with code that skips both keys.
- Strings and quoted keys can hold control characters through escapes such as `\e` and `\x00` (NUL), and bidirectional marks such as U+202E even when written raw. Escape or strip both before writing parsed values to a terminal or log or passing them as command arguments, and reject NUL before passing a value to code that treats it as the end of a string.
- Keys are compared without Unicode normalization, so lookalike keys, such as one with a zero-width space or a decomposed accent, stay distinct. When reviewing files from untrusted authors, flag invisible or decomposed characters in quoted keys.
- Error messages are short and safe to display. See [Error Handling](#error-handling).

---

## TypeScript

The `parse` function accepts a generic type parameter:

```ts
import { parse } from 'toml.min';

type Config = {
  database: {
    host: string;
    port: number;
  };
};

const config = parse<Config>(`
  [database]
  host = "localhost"
  port = 5432
`);

config.database.host; // string
config.database.port; // number
```

The generic is not checked at runtime, so validate data from files you don't control.

`ParseOptions`, `TomlErrorCode`, and `LocalDateOrTimeKind` are also exported.

---

## Benchmark

Measured with [**hyperfine**](https://github.com/sharkdp/hyperfine) parsing the same **TOML** payload:

| Parser                                                                        | Times slower than **toml.min** |
| ----------------------------------------------------------------------------- | ------------------------------ |
| ✨ **toml.min** `1.0.0`                                                       | **1.00x** _(baseline)_         |
| [smol-toml](https://github.com/squirrelchat/smol-toml) `1.9.1`                | 1.11x ↓                        |
| [toml-eslint-parser](https://github.com/ota-meshi/toml-eslint-parser) `1.0.3` | 5.90x ↓                        |
| [@decimalturn/toml-patch](https://github.com/DecimalTurn/toml-patch) `3.3.1`  | 6.95x ↓                        |
| [toml](https://github.com/BinaryMuse/toml-node) `5.0.1`                       | 9.21x ↓                        |

- Each benchmark parses the same **TOML** snapshot **5,000 times** per run, with **10 measured runs** and **5 warmup runs** via [**hyperfine**](https://github.com/sharkdp/hyperfine). See the [**benchmark**](https://github.com/wellwelwel/toml.min/tree/main/benchmark) directory for details.

---

## Security Policy

[![GitHub Workflow Status (with event)](https://img.shields.io/github/actions/workflow/status/wellwelwel/toml.min/ci_codeql.yml?event=push&label=&branch=main&logo=github&logoColor=white&color=f368e0)](https://github.com/wellwelwel/toml.min/actions/workflows/ci_codeql.yml?query=branch%3Amain)

Please check the [**SECURITY.md**](https://github.com/wellwelwel/toml.min/blob/main/SECURITY.md).

---

## Contributing

See the [**Contributing Guide**](https://github.com/wellwelwel/toml.min/blob/main/CONTRIBUTING.md) and please follow our [**Code of Conduct**](https://github.com/wellwelwel/toml.min/blob/main/CODE_OF_CONDUCT.md).

---

## Acknowledgements

- [![Contributors](https://img.shields.io/github/contributors/wellwelwel/toml.min?label=Contributors)](https://github.com/wellwelwel/toml.min/graphs/contributors)
- **toml.min** is inspired by [**toml-node**](https://github.com/BinaryMuse/toml-node), reimplemented as a hand-written recursive-descent parser for performance and zero dependencies.

---

## License

**toml.min** is under the [**MIT License**](https://github.com/wellwelwel/toml.min/blob/main/LICENSE).<br />
Copyright &copy; 2026-present [**Weslley Araujo**](https://github.com/wellwelwel) and **toml.min** [**contributors**](https://github.com/wellwelwel/toml.min/graphs/contributors).
