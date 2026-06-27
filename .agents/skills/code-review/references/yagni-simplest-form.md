# YAGNI / simplest-form

Part of the code-review skill (`SKILL.md`). This is the detail behind the **highest-priority lens** and its checklist items in section D.

## The rule

**This is the highest-priority lens. Apply it to every changed line, and flag violations on your own without waiting for the user to point at them.**

For every new construct in the diff (a variable, branch, guard, helper, prop, parameter, option, type, default, wrapper, abstraction), ask: **"what breaks if I delete or collapse this?"** If the answer is "nothing, the behavior is identical," it is a finding. The simplest form that produces the same observable behavior is the correct form. "It works", "it's defensive", and "it's more explicit" are NOT justifications for extra code.

Run this test on **type signatures too, not only runtime code**. A return/param type carries surface that can be over-wide or inconsistent just like a `let` block. Apply "what breaks if I narrow or remove part of this type?" to every new signature.

Concretely, flag (this list is illustrative, not exhaustive):
- A `let` + `if`-assignment that a single expression replaces. Canonical example from this repo: `let v: string | undefined; if (x !== undefined) { v = String(x) }` collapses to `const v = x?.toString()` (optional chaining yields `undefined` for `undefined`; `number`/`string` both have `.toString()`). The block existed only to avoid `String(undefined)` producing `"undefined"`.
- A guard, branch, or `?`-check for a state the types already make impossible.
- Redundant null/undefined handling that optional chaining (`?.`), a default (`= []`), or `??` already covers.
- A prop / parameter / option threaded through but never varied by any caller (pass nothing, or read it from context the callee already consumes).
- A wrapper or helper that just forwards to one underlying call with no added meaning.
- Premature generalization: parameters, config, or branches for cases that don't exist in the codebase yet.
- A custom utility where a one-line library/standard call does the same thing.
- A `=> X | undefined` (or `X | null`, `X | ''`) return type where the consumer treats the empty value and a plain default identically. Canonical example from this repo: `getCellClassName?: (info) => string | undefined` should be `=> string`, because the value flows into `cn()`/clsx, which drops `''` exactly like `undefined` (verify the sink yourself: `cn('a', '', 'b')` is `'a b'`). The `| undefined` adds no behavior. Check the actual sink before claiming the empty value is harmless.

When you flag one, give the concrete simpler form in the suggestion (not just "simplify this"), and scan the diff for sibling instances. Missing an obvious simplification the user then has to point out is a review defect, the same as missing a bug.

**Verify claimed consistency; never assert a "mirror."** When you (or the PR) describe a new member as following / mirroring / matching an existing sibling, do not assert it. Put the two signatures side by side and diff them. Inconsistent shapes between siblings are a finding, e.g. a new `(info) => string | undefined` next to an existing `isCellDisabled: (info) => boolean` (definite return) should match its sibling's convention unless there is a real reason to differ. "This mirrors X" without a literal comparison is the same shortcut as asserting an API behavior from memory.

## Checklist items this backs

- **YAGNI / simplest-form checked (highest priority).** Applied the "what breaks if I delete or collapse this?" test to every new variable, branch, guard, prop, param, option, type, default, wrapper, and abstraction in the diff. Flagged each construct that collapses to a simpler form with identical behavior, with the concrete simpler form in the suggestion. The `let`+`if`-assignment → one-expression case (`let v; if (x !== undefined) v = String(x)` → `const v = x?.toString()`) is the canonical instance and must be caught unprompted.
- **Type signatures run through YAGNI.** Applied the test to every new return/param type, not only runtime code. A `=> X | undefined` (or `| null`/`| ''`) whose sink treats the empty value like a default (e.g. `cn()`/clsx dropping `''`) should narrow to `=> X`. Verified the sink's behavior before claiming the empty value is harmless. Canonical case: `getCellClassName: (info) => string | undefined` → `=> string`.
- **Claimed consistency verified by diffing signatures.** Wherever the PR (or my own notes) says a new member mirrors / follows / matches an existing sibling, put the two signatures side by side and confirmed they actually match. An inconsistent shape between siblings (e.g. `(info) => string | undefined` next to `isCellDisabled: (info) => boolean`) is a finding. Did NOT assert "this mirrors X" without the literal comparison.
