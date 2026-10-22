<h1 align="center">toml.min</h1>
<div align="center">

[![NPM Version](https://img.shields.io/npm/v/toml.min.svg?label=&color=70a1ff&logo=npm&logoColor=white)](https://www.npmjs.com/package/toml.min)
[![Coverage](https://img.shields.io/codecov/c/github/wellwelwel/toml.min?label=&logo=codecov&logoColor=white&color=98cc00)](https://app.codecov.io/gh/wellwelwel/toml.min)<br />
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
data.owner.dob; // OffsetDateTime, a Date object
data.database.ports; // [8001, 8001, 8003]
data.database.enabled; // true
```

### Options

`parse` takes an optional second argument:

```ts
parse(source, { maxDepth: 100, bigint: false, allowUnsafeKeys: false });
```

| Option            | Default | Description                                                                                                                                                                                                              |
| ----------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `maxDepth`        | `100`   | How many levels of tables and arrays can nest below the root. Every level counts: arrays, inline tables, dotted keys, table headers, and the table inside each array of tables. Going past it throws `NESTING_TOO_DEEP`. |
| `bigint`          | `false` | Returns every integer as a `BigInt` and accepts the full 64-bit range. See [Integers](#integers).                                                                                                                        |
| `allowUnsafeKeys` | `false` | Accepts a `__proto__` key, and a `constructor` key holding a table, instead of throwing `INVALID_KEY`. See [Untrusted Input](#untrusted-input).                                                                          |

`maxDepth` must be a non-negative integer. The default leaves wide headroom: the shallowest stack overflow measured was about 2,300 nested inline tables, on **Node.js**. Raising it into the thousands can exhaust the call stack again, in the parser and in your own code that walks the result.

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

Integers are returned as numbers between -9007199254740991 and 9007199254740991, the range a JavaScript number holds exactly. Any integer outside it throws `INTEGER_OUT_OF_RANGE` instead of being rounded.

To read the full 64-bit range **TOML** allows, pass `bigint: true`. Every integer is then returned as a `BigInt`, from -9223372036854775808 to 9223372036854775807, and anything outside that range throws `INTEGER_OUT_OF_RANGE`. Floats stay numbers.

### Floats

```toml
pi = 3.14159
scientific = 6.626e-34
positive_inf = inf
negative_inf = -inf
not_a_number = nan
```

### Booleans

```toml
enabled = true
disabled = false
```

### Dates and Times

Offset date-times are returned as `OffsetDateTime` objects: JavaScript `Date` objects that also carry the exact `text` from the file. The `Date` holds the UTC instant to the millisecond, so the written offset and any finer fraction of a second are kept only in `text`. Local date-times, local dates, and local times are returned as `LocalDateOrTime` objects, never as strings, so a date in the file can't be mistaken for quoted text. They also carry `text`, plus a `kind`:

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

For a `LocalDateOrTime`, `String(value)` and `JSON.stringify` both produce `text`. An `OffsetDateTime` converts like any `Date`, so `JSON.stringify` produces the UTC instant.

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

Parse errors are `TomlError` objects with a stable `code`, and the `line` and `column` where the problem is (both start at 1):

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

- `message` is plain language for people who have never read the **TOML** spec. Its wording can change in any release, so match on `code` to tell errors apart or to write your own wording.
- A message is never longer than 300 characters. Any key or value it quotes is cut to 40 characters, with `…` marking the cut, and control, invisible, and bidirectional characters, along with lone surrogates, appear as their code point, such as `[U+202E]`.
- Passing something other than a string, or an invalid option, throws a `TypeError` instead.

### Error Codes

| Code                        | Meaning                                                                                                                                   |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `CONTROL_CHARACTER`         | A comment or string contains an invisible control character.                                                                              |
| `DUPLICATE_KEY`             | A key or table is defined more than once, or something already defined is added to elsewhere.                                             |
| `EXPECTED_COMMA`            | Items in an array, or entries in an inline table, are not separated by commas.                                                            |
| `EXPECTED_EQUALS`           | A key is not followed by `=`.                                                                                                             |
| `EXPECTED_NEWLINE`          | Something else follows a value or a table header on the same line.                                                                        |
| `EXPECTED_VALUE`            | A value is missing.                                                                                                                       |
| `INTEGER_OUT_OF_RANGE`      | An integer can't be represented exactly. See [Integers](#integers).                                                                       |
| `INVALID_DATE`              | A date doesn't exist, such as `2023-02-29`.                                                                                               |
| `INVALID_ESCAPE`            | A backslash escape in a string is unknown or incomplete.                                                                                  |
| `INVALID_KEY`               | A key is missing, uses triple quotes, uses characters that need quotes, or is refused as unsafe. See [Untrusted Input](#untrusted-input). |
| `INVALID_NUMBER`            | A number is malformed, such as `007` or `1__000`.                                                                                         |
| `INVALID_TABLE_HEADER`      | A table header is not closed with `]` or `]]`.                                                                                            |
| `INVALID_TIME`              | A time or time zone offset doesn't exist, such as `24:00:00`.                                                                             |
| `INVALID_VALUE`             | A word that is not a value, such as unquoted text.                                                                                        |
| `LONE_SURROGATE`            | A comment or string contains a lone surrogate, which is not a valid Unicode character.                                                    |
| `NESTING_TOO_DEEP`          | Tables and arrays nest deeper than `maxDepth`.                                                                                            |
| `TOO_MANY_QUOTES`           | A multiline string ends with more than five quotes in a row.                                                                              |
| `UNTERMINATED_ARRAY`        | An array is never closed with `]`.                                                                                                        |
| `UNTERMINATED_INLINE_TABLE` | An inline table is never closed with `}`.                                                                                                 |
| `UNTERMINATED_STRING`       | A string is never closed.                                                                                                                 |

---

## Untrusted Input

- Tables and arrays nest at most `maxDepth` levels, so a hostile file can't exhaust the call stack, in the parser or in your own code that walks the result.
- Every table has a `null` prototype, so a key taken from the file never changes the shared object prototype while parsing. Even so, a `__proto__` key, or a `constructor` key holding a table, is refused on purpose with `INVALID_KEY`, although **TOML** allows both. Copying the result with `Object.assign` turns `__proto__` into a prototype change, and a deep merge can follow either key into the built-in `Object` shared by the whole program. A `constructor` key holding a plain value, such as text, a number, or an array, is still accepted. If you set `allowUnsafeKeys`, copy results with spread (`{ ...result }`) and merge them only with code that skips both keys.
- Strings and quoted keys can hold control characters, because **TOML** escapes such as `\e` and `\x00` decode to the escape character and NUL. The parser rejects those characters only when they are written raw, so check the parsed values rather than the **TOML** text: escape or strip control characters before printing them to a terminal or a log or passing them as command arguments, and reject NUL before handing a value to code that reads it as the end of a string.
- Error messages stay short and are safe to display. See [Error Handling](#error-handling).

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

The generic only describes the shape you expect. The parser doesn't check it, so validate data from files you don't control.

The `ParseOptions`, `TomlErrorCode`, and `LocalDateOrTimeKind` types are exported too.

---

## Benchmark

Measured with [**hyperfine**](https://github.com/sharkdp/hyperfine) parsing the same **TOML** payload:

| Parser                                                                | Times slower than **toml.min** | Package Size                                           |
| --------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------ |
| ✨ **toml.min**                                                       | **1.00x** _(baseline)_         | <img src="https://pkg-size.dev/badge/install/48737" >  |
| [smol-toml](https://github.com/nicolo-ribaudo/smol-toml)              | 1.39x ↓                        | <img src="https://pkg-size.dev/badge/install/103432">  |
| [toml-eslint-parser](https://github.com/ota-meshi/toml-eslint-parser) | 2.95x ↓                        | <img src="https://pkg-size.dev/badge/install/118432" > |
| [@decimalturn/toml-patch](https://github.com/DecimalTurn/toml-patch)  | 3.43x ↓                        | <img src="https://pkg-size.dev/badge/install/102278" > |
| [toml](https://github.com/BinaryMuse/toml-node)                       | 6.42x ↓                        | <img src="https://pkg-size.dev/badge/install/123966" > |

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
