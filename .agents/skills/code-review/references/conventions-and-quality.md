# Conventions, efficiency, tests, naming, comments

Part of the code-review skill (`SKILL.md`). Detail behind section E.

## Checklist items this backs

- **Project conventions enforced** (`.agents/rules/code-style.md`, `.agents/rules/coding-patterns.md`): `.at(0)`/`.at(-1)` over `[0]`/`[len-1]`; no `!` non-null assertions (use guards / optional chaining / defaults); `Boolean(x)` over `!!x`; no `any` (use `unknown` + guards, interfaces, generics); no `export default` (named only); `cn(...)` multi-clause conditions extracted to named consts.
- **Efficiency checked.** Unnecessary work (`useMemo`/loops running in modes where the result is unused → guard with early return); missed memoization (inline object/callback in deps breaking child memo); stale deps (function refs in dep arrays instead of underlying data); redundant recomputation of an already-memoized value; repeated call shapes inside a memo varying one arg (→ `useCallback`); conditional memos that recompute on every change (→ split into narrower-dep memos + selector).
- **Test coverage checked.** New prop/feature added without tests. Tests asserting CSS classes (brittle in JSDOM) flagged. Gating logic (e.g. `gridType === 'hour'`) has an integration test that the feature mounts under the condition and not otherwise.
- **Naming checked.** Each file name uniquely identifies the file across the whole codebase (names appear path-less in tabs, grep, stack traces). `day-header.tsx` deep under `features/calendar/components/views/` is too generic → `resource-week-horizontal-day-header.tsx`.
- **Helper functions have a verb prefix.** A function (declaration, arrow const, or object method) named with a bare noun phrase reads like a variable, not a callable. Flag `const samePattern = (...) =>`, `function weekdayKey(...)`, `presetLabel`, `refOf`, etc. Remedies: boolean predicates → `is`/`has` (`samePattern` → `isSamePattern`); value-returning helpers → `get` (`weekdayKey` → `getWeekdayKey`, `presetToRRule` → `getPresetRRule`, `refOf` → `getReferenceDate`); mutators/handlers → `set`/`handle`/`toggle`. NOT flagged: functions already led by a clear action verb (`detectPreset`, `resolveByweekday`, `parseNum`, `renderRow`), React components (PascalCase), and hooks (`use*`). Sweep for candidates (matches arrow-function consts and function declarations, not plain value consts):

  ```bash
  while IFS= read -r f; do grep -nE '(const [a-z][A-Za-z0-9]+ = (async )?\(|function [a-z][A-Za-z0-9]+ *\()' "$f" | grep -vE '\b(is|has|get|set|should|can|handle|toggle|render|use|parse|resolve|detect|create|build|make|format|map|filter|find|compute|ensure|validate|normalize|to|on|with|add|remove|update|select|apply|run|init|load|save|read|write|sort|merge|wrap)[A-Z]' | sed "s|^|$f:|"; done < /tmp/srcfiles.txt
  ```

  then read each hit and confirm it is a noun-phrase helper, not a plain value const (an IIFE assigned to a value `const x = (() => {...})()` is a value, not a callable) or an already-verbed name the exclude list missed.
- **Comments checked.** No comments narrating WHAT the code does or referencing the current task; no `TODO` without a ticket. Comments explain WHY.
