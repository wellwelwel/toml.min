# toml.min Security Charter

## Principles

### I. Every input is hostile until proven otherwise

Never assume the text handed to `parse` is well formed, small, or friendly. Always treat every byte as if an attacker wrote it, whether it arrived from a file on disk, a network response, an environment variable, or another library.

- Why: toml.min runs inside other people's applications, and those applications rarely control the TOML they receive. A config file pulled from a repository or uploaded by a user is attacker-controlled somewhere in production, and the parser is the only thing standing between that text and the code that trusts the result.

### II. Parsed keys never reach the prototype chain

Always build parsed tables as objects with no prototype. Never let a key taken from the input resolve to an inherited property such as `__proto__`, `constructor`, or `prototype`, and never use a plain object literal as the container for keys that came from parsed text.

- Why: TOML lets the input choose its own key names, so a crafted file could otherwise rewrite behaviour that every object in the host application shares. That is prototype pollution, and it turns a harmless-looking config file into a way to change how unrelated code behaves.

### III. Parsing stays bounded in time, memory, and stack

Always keep the work proportional to the size of the input: scan forward, avoid patterns that can backtrack, and never let nesting depth or repetition turn a small file into unbounded time, memory, or recursion.

- Why: a parser that can be made to hang or run out of stack is a denial of service in every application that embeds it. A few kilobytes of hostile text should never be able to take a server down.

### IV. Invalid input is rejected, never guessed

Always reject input that the TOML v1.1.0 specification does not allow, and always fail by throwing a catchable error that reports where the problem is. Never repair, coerce, or quietly accept malformed input, and never let a parse failure crash the host process.

- Why: a parser that guesses hands the application data that does not match what the file actually said. Worse, two parsers that guess differently let one file mean two things to two services, which is how a value slips past the check that was meant to catch it.

### V. Values are constructed, never evaluated

Never use `eval`, `new Function`, or any other form of dynamic code execution to turn parsed text into a value. Always convert input with explicit parsing code.

- Why: the moment input can be executed instead of read, a config file becomes a way to run arbitrary code inside the host application. That is the most complete compromise available.

### VI. What ships is only what was reviewed

Always keep toml.min free of runtime dependencies, publish only the built output with signed provenance, and keep dependency install scripts disabled. Never add a runtime dependency or widen the published files without a deliberate, reviewed decision.

- Why: this library sits inside other people's applications, so whatever ships alongside it inherits their trust. One compromised dependency, one stray file in the package, or one unsigned release reaches every user on their next install.

### VII. A security behaviour is not real until a test pins it

Always add a test that fails without the guard whenever a security behaviour is added or changed, covering both what must be accepted and what must be rejected. Never delete or weaken such a test to make a change pass, and never trade one away for speed.

- Why: this parser is tuned for performance, and an optimisation that quietly drops a check looks exactly like an optimisation that does not. With no test that fails, the guard disappears and nobody notices until someone exploits it.

## Baseline discipline

Lagune holds this charter, every principle, every time. A principle is not suspended because a control looks small, familiar, or unlikely to be hit. This is not a judgement call.

### Only the controls the project needs

Lagune recommends and applies only the controls this project's context calls for. A control the project does not need is never added for completeness, and a generic checklist is not thoroughness. Every later phase acts on what the system actually does, never on what it might hypothetically do.

- Why: effort spent on risks the project does not have buries the risks it does have. Fewer, right-sized controls are easier to apply, prove, and keep true than a checklist no one finishes.

### Prefer the simplest vetted control

When a control is needed, reach for the safest option already proven, in order: a control this project already has, then a platform or framework built-in, then a well-maintained vetted library, and only then custom code. Never hand-roll a security primitive (cryptography, escaping, authentication, sessions) that a vetted standard already provides. A new dependency is new attack surface, justified and not assumed. Code, an endpoint, or a feature the project does not use is attack surface too, so removing it is itself a control.

- Why: hand-rolled security is where subtle, unaudited bugs live, and a second control duplicating an existing one is the one that gets forgotten and drifts. Boring, standard controls are easier to audit and harder to get wrong, and less surface is less to defend.

### When a control seems skippable

A control is held even when a reason to skip it feels reasonable:

- "Too small to need a control": small gaps are where breaches start.
- "Already handled elsewhere": assumed coverage is exactly how gaps hide.
- "Unlikely to be hit": attackers target the path no one is watching.
- "It works, ship it": working and safe are different claims, and the charter requires both.

## Governance

This charter governs every change to toml.min, from a maintainer commit to an outside pull request. Each later Lagune phase (detect, plan, harden, verify) works inside these principles and never relaxes one for convenience.

A principle changes only by editing this file and updating the version below: MAJOR when a principle is removed or redefined, MINOR when one is added or materially expanded, PATCH for wording and clarity. Charter changes land as their own commit, separate from the code they govern, so the reasoning stays readable in history.

When a change cannot satisfy a principle, the change is reworked or the principle is amended in the open. A principle is never quietly set aside to unblock a release.

Version: 1.0.0 | Ratified: 2026-08-04
