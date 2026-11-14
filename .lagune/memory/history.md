# Lagune History

## Closed findings

### Prototype key holding a table

- **Classification:** High
- **Category:** Prototype pollution (CWE-1321)
- **What it is:** The parser refuses `__proto__` everywhere, and refuses the names of `Object.prototype` members (such as `constructor` or `toString`) whenever they hold a table. The name `prototype` is not on that list, so a file can make `prototype` hold a table through every route the list covers: a table header (`[User.prototype]`), a dotted key (`User.prototype.isAdmin = true`), an inline table (`User = { prototype = { isAdmin = true } }`), a dotted key inside an inline table, and a key inside a headed table, written bare, quoted, or with an escape. The tests pin this as intended behaviour: they list `prototype` as an inert key that must parse as an ordinary own key.
- **Closed:** 2026-11-14

### Built-in names a function-entering merge still reaches

- **Classification:** Medium
- **Category:** Prototype pollution (CWE-1321)
- **What it is:** Beyond the refused names, a deep merge that walks into functions or arrays held by the destination also reaches shared built-ins through ordinary names: `[User.call]` adds properties to `Function.prototype.call`, and `[list.slice]` adds properties to `Array.prototype.slice`. The parser accepts these names holding a table, and refusing them is not practical: `bind = { host = "0.0.0.0", port = 80 }` is common configuration, and the list of such names has no end.
- **Closed:** 2026-11-14
