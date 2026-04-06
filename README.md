<h1 align="center">toml.min</h1>
<div align="center">

<!-- [![NPM Version](https://img.shields.io/npm/v/toml.min.svg?label=&color=70a1ff&logo=npm&logoColor=white)](https://www.npmjs.com/package/toml.min)
[![NPM Downloads](https://img.shields.io/npm/dm/toml.min.svg?label=&logo=npm&logoColor=white&color=45aaf2)](https://www.npmjs.com/package/toml.min)
[![Coverage](https://img.shields.io/codecov/c/github/wellwelwel/toml.min?label=&logo=codecov&logoColor=white&color=98cc00)](https://app.codecov.io/gh/wellwelwel/toml.min)<br />
[![GitHub Workflow Status (Node.js)](https://img.shields.io/github/actions/workflow/status/wellwelwel/toml.min/ci_node.yml?event=push&label=&branch=main&logo=nodedotjs&logoColor=535c68&color=badc58)](https://github.com/wellwelwel/toml.min/actions/workflows/ci_node.yml?query=branch%3Amain)
[![GitHub Workflow Status (Bun)](https://img.shields.io/github/actions/workflow/status/wellwelwel/toml.min/ci_bun.yml?event=push&label=&branch=main&logo=bun&logoColor=ffffff&color=f368e0)](https://github.com/wellwelwel/toml.min/actions/workflows/ci_bun.yml?query=branch%3Amain)
[![GitHub Workflow Status (Deno)](https://img.shields.io/github/actions/workflow/status/wellwelwel/toml.min/ci_deno.yml?event=push&label=&branch=main&logo=deno&logoColor=ffffff&color=079992)](https://github.com/wellwelwel/toml.min/actions/workflows/ci_deno.yml?query=branch%3Amain) -->

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
data.owner.dob; // Date object
data.database.ports; // [8001, 8001, 8003]
data.database.enabled; // true
```

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

Offset date-times are returned as JavaScript `Date` objects. Local date-times, local dates, and local times are returned as strings:

```toml
odt = 1979-05-27T07:32:00Z       # Date object
ldt = 1979-05-27T07:32:00        # string: "1979-05-27T07:32:00"
ld  = 1979-05-27                  # string: "1979-05-27"
lt  = 07:32:00                    # string: "07:32:00"
```

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

Parse errors include `line` and `column` properties:

```ts
import { parse } from 'toml.min';

try {
  parse('key = "unterminated');
} catch (error) {
  console.error(
    `Error on line ${error.line}, column ${error.column}: ${error.message}`
  );
}
```

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

See the [**Contributing Guide**](https://github.com/wellwelwel/toml.min/blob/main/CONTRIBUTING.md) and please follow our [**Code of Conduct**](https://github.com/wellwelwel/toml.min/blob/main/CODE_OF_CONDUCT.md)

---

## Acknowledgements

- [![Contributors](https://img.shields.io/github/contributors/wellwelwel/toml.min?label=Contributors)](https://github.com/wellwelwel/toml.min/graphs/contributors)
- **toml.min** is inspired by [**toml-node**](https://github.com/BinaryMuse/toml-node), reimplemented as a hand-written recursive-descent parser for performance and zero dependencies.

---

## License

**toml.min** is under the [**MIT License**](https://github.com/wellwelwel/toml.min/blob/main/LICENSE).<br />
Copyright &copy; 2026-present [**Weslley Araujo**](https://github.com/wellwelwel) and **toml.min** [**contributors**](https://github.com/wellwelwel/toml.min/graphs/contributors).
