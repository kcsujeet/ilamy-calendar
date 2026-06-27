# Readability Hard Rules (section F)

Part of the code-review skill (`SKILL.md`). Deterministic control-flow/expression readability rules and the mechanical sweeps that find them. Project-structure rules (colocation, type-folders, package boundaries) live in `project-structure.md`.

Exceptions for this whole section: shadcn-derived `ui/` primitives (kept in sync with upstream) and pre-existing code in files this PR did not modify (`git diff` against base to confirm). When you flag one instance, grep the rest of the diff for siblings and flag them together.

**These rules are deterministic, so you MUST verify each one with a self-run mechanical sweep over the changed files and read the output yourself. A subagent's "none" NEVER satisfies an item in this section.** (A real review missed three nested `if`s and shipped a "clean" verdict because it trusted an Explore agent's "rule: none" instead of running the grep. The agent is a candidate generator, not a verifier.) Eyeballing the diff is also not enough — run the commands. Build the file list once, then run every sweep against it:

```bash
# Changed, non-test, non-ui source files (the scan set for this whole section).
# Adjust the path globs to the repo layout (this repo: 'packages/**/*.ts(x)').
git diff --name-only origin/main..HEAD -- 'src/**/*.ts' 'src/**/*.tsx' | grep -vE '\.test\.|/ui/' > /tmp/srcfiles.txt

# Nested if/switch (the rule most often missed by agents): flags an `if` opened inside an already-open `if`.
while IFS= read -r f; do [ -f "$f" ] || continue; awk -v F="$f" '
  function indent(s){n=0;while(substr(s,n+1,1)=="\t")n++;return n}
  /^[ \t]*if[ \t]*\(/{ind=indent($0);for(d in o){if(o[d]&&d<ind){print F":"NR" nested if";break}}o[ind]=1;next}
  {ind=indent($0);for(d in o){if(d>=ind)o[d]=0}}' "$f"; done < /tmp/srcfiles.txt

# Multi-line ternary (line starting with ? or :) and single-line nested ternary (a ? b : c ?):
while IFS= read -r f; do [ -f "$f" ] || continue; grep -nE '^[[:space:]]*[?:][[:space:]]' "$f" | grep -vE '\?\.' | sed "s|^|$f:|"; grep -nE '\?[^?:]*:[^?:]*\?' "$f" | grep -vE '\?\.|https?:' | sed "s|^|$f:|"; done < /tmp/srcfiles.txt

# Dense multi-clause conditions on ONE line (2+ &&/||) and JSX ternaries:
while IFS= read -r f; do [ -f "$f" ] || continue; grep -nE '(&&.*&&|\|\|.*\|\||&&.*\|\||\|\|.*&&)|\{[^}]*\?[^}]*<|\? *<[A-Z]' "$f" | grep -vE '^\s*(//|\*)' | sed "s|^|$f:|"; done < /tmp/srcfiles.txt

# Multi-line dense conditions: a condition split ONE clause per line is invisible to the
# single-line sweep above (no line has two operators). This flags every line that ENDS in
# `&&` or `||` (a continued condition). MANDATORY — this is the sweep that the line-based
# one structurally cannot catch (a `Boolean(a && b && c && d)` wrapped across 4 lines).
# Open each hit: a 3+ clause condition (or one mixing comparisons like isBefore/isAfter)
# across lines is a violation; a single-clause `cn(...)` line wrapped only because its class
# string is long (e.g. `state.isSelected &&` then a long string) is NOT.
while IFS= read -r f; do [ -f "$f" ] || continue; grep -nE '(&&|\|\|)[[:space:]]*$' "$f" | sed "s|^|$f:|"; done < /tmp/srcfiles.txt

# Any switch statement (prefer a key-value map / lookup object, even a flat one):
while IFS= read -r f; do [ -f "$f" ] || continue; grep -nE '\bswitch[[:space:]]*\(' "$f" | sed "s|^|$f:|"; done < /tmp/srcfiles.txt
```

(The misplaced-modules sweep for project structure lives in `project-structure.md`.)

Every hit is a candidate, not a confirmed finding: open the file at the line and confirm it actually violates the rule (the sweeps over-match — e.g. a single-line single-level ternary in an assignment, or `if (!(a && b))` which is one logical test, are NOT violations). The sweeps under-match too, so still read each changed file's control flow: the nested-`if` awk is indentation-based, and the single-line dense-condition grep **cannot see a condition split one clause per line** (`a &&\n b &&\n c` has no line with two operators) — that is what the trailing-`&&`/`||` sweep is for, and it is the exact gap that has shipped a "clean" verdict over a 4-clause `Boolean(...)` before. Run every sweep, including that one. The boxes are checked only after you have run these and triaged the output yourself.

**Triage discipline (this section is deterministic, not judgment-based).** A section-F sweep hit may be downgraded to "not a violation" ONLY because it is one of the documented over-match shapes (single-line single-level ternary, `if (!(a && b))`, an OR-chain that reads as one concept inside `Boolean(...)`, etc.). You may NOT drop a genuine hit by calling it "idiomatic", "a common React pattern", "fine as-is", "conventional", or "too minor". Those are the "it works / it's idiomatic" rationalizations this skill forbids, and they do not apply to deterministic readability rules. Concretely: a **multi-line ternary is ALWAYS a violation** no matter how idiomatic it looks — `const x = cond ? createPortal(<JSX/>, body) : null` wrapped across lines must be flagged (remedy: `{cond && <NamedComponent/>}` or an `if`-assignment). The "drop shaky findings / no weak observations" rule (`writing-comments.md`) governs **judgment-based** findings (a possible bug you can't confirm); it does NOT license dropping a confirmed section-F rule violation. **If you are genuinely unsure whether a hit is a real violation or a documented over-match, you MUST surface it to the user and ask — never silently drop it.** Silently glossing a real hit is a review defect, the same as missing a bug.

## Checklist items this backs

- **No nested or multi-line ternaries.** Nested = a ternary in either branch or the test (`a ? b : c ? d : e`, including single-line like `opts?.until ? 'until' : opts?.count ? 'count' : 'never'`). Multi-line = a single ternary the formatter wrapped across 2+ lines, even one level deep. Only a single-level ternary that fits on one line is allowed (`isActive ? 'on' : 'off'`). Remedies: nested/value-selecting → `if`/`else if`/`else` or an early-return guard with a named result var; value-or-`undefined` prop → precomputed named const or `if` assignment (NOT `cond && value`, which yields `false`); className `cond ? 'class' : ''` → `cond && 'class'` in `cn(...)`; fixed value-per-key → module-level lookup object.
- **No dense inline conditions; use named variables.** Flag (a) multi-clause conditions (2+ `&&`/`||`/comparison clauses) inline in an `if`, `&&` JSX gate, ternary test, `return`, or `cn(...)` — e.g. `if (!event?.id || !updates || Object.keys(updates).length === 0)`; (b) array-method predicates (`.find`/`.filter`/`.some`/`.every`/`.findIndex`/`.map`) whose arrow packs computation + comparison + another clause — e.g. `(e) => (e.uid || \`${e.id}@ilamy.calendar\`) === targetUid && e.rrule && !e.recurrenceId`; (c) any single expression that takes more than a couple seconds to parse. **The clause count is what matters, NOT whether it is on one line — a condition wrapped one clause per line is the same violation and is the one most often missed** (e.g. `Boolean(\n  start &&\n  end &&\n  !day.isBefore(start, 'day') &&\n  !day.isAfter(end, 'day')\n)` is a 4-clause dense condition; catch it with the trailing-`&&`/`||` sweep). Remedy: lift each sub-expression into a named `const`/`let` (or, for a multi-line range/guard, narrow with an `if` and name the comparisons inside it: `if (start && end) { const onOrAfterStart = !day.isBefore(start, 'day'); const onOrBeforeEnd = !day.isAfter(end, 'day'); inRange = onOrAfterStart && onOrBeforeEnd }`). A truthiness clause used as a boolean becomes `Boolean(x)`. NOT flagged: single-clause conditions (`if (isOpen)`, `day.isToday && <X/>`); a single-clause `cn(...)` line that merely wrapped because its class string is long (`state.isSelected &&` then a long string); and an OR-chain that reads as one concept inside a named function / `Boolean(...)` (e.g. `Boolean(event.rrule || event.recurrenceId || event.uid)`). An AND-chain that mixes comparisons (`isBefore`/`isAfter`/`===`) is NOT that exempt OR-concept-chain — it is a violation.
- **No nested `if` blocks; prefer maps over `switch`.** An `if` inside an `if` → flatten with early-return guards or named guard variables. Flag **any** `switch` statement (not only nested ones): a `switch`-on-value should be a key-value lookup object (a `Record`/map), even a flat one. When the cases produce argument-dependent values, map keys to builder functions (`Partial<Record<Key, (arg) => Value>>`) and look up + invoke: `MAP[key]?.(arg) ?? fallback`. The map reads as data and has no fall-through footguns. (Genuine exhaustive `switch` over a discriminated union where each branch returns is the rare tolerable case; default to a map unless that exhaustiveness check is the point.)
- **No ternaries in JSX.** `{cond ? <A/> : <B/>}` → an early return for one branch, two `{cond && <A/>}` gates, or a value lifted to a named const above the `return` (`{isEdit ? t('a') : t('b')}` → `const label = isEdit ? t('a') : t('b')` then `{label}`).
- **No prop-drilling of context-provided values.** If a callee can read a value from a context it already consumes (`useSmartCalendarContext`, `useEffectiveBusinessHours`, etc.) but instead takes it as a prop/arg callers plumb through → have it read context directly. Same for refs, settings, callbacks. Tests can wrap the callee in a minimal provider.
- **No code the reader can't understand at a glance.** A changed line that takes more than a couple seconds to parse is a defect, not cleverness. A comment explaining WHAT is a smell; rewrite (named vars, smaller functions) instead of annotating.
- **Readability intermediates protected.** Variables/intermediates that aid readability are NOT suggested for removal just because they create a TS-narrowing tax or look "redundant."
