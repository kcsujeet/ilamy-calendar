---
name: reduce-bundle-size
description: Systematically reduce the shipped bundle size of a JS/TS library without sacrificing code readability or breaking consumer APIs. Use this skill whenever the user mentions bundle size, tree-shaking, code duplication to cut, "reduce size of", "make lighter", "shrink output", looks for wins in `dist/`, or asks to audit a library's heaviest files. Also trigger when the user pastes a `bun run build` / `npm run build` / `bunup` / `tsup` / `rollup` output showing `dist/index.js` size and asks for reductions. Prefer this over vague "refactor to be smaller" answers — it enforces a measure-first loop, concrete opportunity categories, and readability guardrails.
---

# Reduce Bundle Size

A disciplined workflow for shrinking a JavaScript/TypeScript library bundle. The core move is **measure every change, revert anything that regresses, and stay within readability guardrails** — not "shorten the code."

## The measure-first loop

Do this for every change, no exceptions:

1. **Baseline.** Run the production build and record `dist/index.js` size (raw + gzip). For bunup/tsup, the output includes both. Write it down.
2. **Make one focused change.** A single dedup, a single extraction, a single dep removal.
3. **Run CI.** `bun run ci` (or equivalent `npm test && npm run build`). Tests must stay green. If any test fails, fix the test (if the behavior truly changed) or fix the refactor (if the test caught a regression) — never weaken the assertion.
4. **Compare.** New size vs baseline. Both raw and gzip. Gzip is the truth consumers experience; raw matters for budget claims.
5. **Keep or revert.** If the delta is meaningful (≥0.5 KB raw or clear structural win), keep it. If it's a wash AND hurts readability, revert.

Anti-habit to avoid: batching 10 changes then running CI once. You lose signal on which change caused the regression, and you can't cherry-pick.

## Check the bundle's starting assumptions first

Before hunting for wins, verify the mental model:

- **Are deps inlined or externalized?** `head -c 500 dist/index.js`. If you see `import { X } from "some-dep"` at the top, deps are externalized and the bundle is mostly your own source code. Removing a dep won't shrink the bundle much — but it saves install footprint. If deps are inlined, dep removal is a bigger lever.
- **Does the bundler report unused deps?** Most modern bundlers do (bunup's `unused()` plugin, etc.). A reported unused dep may be a false positive (type-only import that still has runtime co-entry) — grep the source for actual runtime usage before removing.
- **Does `sideEffects: false` apply?** If the whole build is one minified file, consumer tree-shaking can't re-split it. Multi-entry bundling (when you're OK with the API impact) enables downstream tree-shaking.

## Opportunities to look for (ranked by typical payoff)

Scan in roughly this order. Each subsection lists the shape of the opportunity and what the cleanup looks like.

### 1. Unused deps and dead files (biggest easy wins)

- Bundler's unused-dep report → grep for each in `src/`. If truly unused, `bun remove <dep>`.
- Components imported only by demo/example code that isn't part of the public entry → those UI components can be deleted along with the demo if the demo is also non-shipping. Confirm by following the import graph from `src/index.ts`.
- Dead `export` statements (re-exports nobody consumes) → remove from the top-level entry.
- An entire heavyweight dep whose only user is one internal component → consider replacing with a lightweight internal implementation. `react-day-picker` (30-50 KB) replaced with ~100 lines of dayjs-based month grid is a typical win.

### 2. Duplicated identical JSX blocks (high dedup value)

When three near-identical `<Button>` (or any element) blocks differ only in `onClick`/`label`/`key`/some prop:

- Extract an array of `{ id, label, ...vars }` objects, map over it, render one element with vars interpolated.
- Prefer module-level `const` arrays over in-render literals when the data doesn't depend on props/state.
- If the data DOES depend on props/state (e.g. derived from `isEdit`), declare the array inside the component right before the return.
- If you need different extras per item (e.g. option A has a child Input, option B has a child DatePicker), keep the per-item conditional block inline — don't force uniformity.

### 3. Duplicated JSX structures → local component

When multiple form fields have identical wrapper/Label/Input markup (title/description/location fields in a form, for example), extract a local component inside the file:

```tsx
const TextField = ({ name, placeholder, required = false }: {...}) => (
  <div className="grid gap-1 sm:gap-2">
    <Label htmlFor={name}>{t(name)}</Label>
    <Input id={name} name={name} value={formValues[name]} ... />
  </div>
)
```

Local-to-the-file first. Promote to a shared component only when 2+ files show the same shape.

### 4. Shared components across features → extract up

When two feature folders (e.g. `day-view/` and `week-view/`) render near-identical sub-structures, extract to a shared module one level up. Example: a `TimeHeaderRow` that both a day view and a week view render with small style/timing differences. Parameterize only the things that actually differ (view name, animation timing), bake the rest into the component.

Watch for: if the shared component's props balloon (8+ visual knobs for two callers), the abstraction is leaking. Better to keep two 20-line variants than one 60-line abstract "configurable" variant.

### 5. Duplicated utility functions → hoist to a shared hook/util

The sniff test: the same 5-10 line function appears in 2+ files with identical logic. Example:

- `const effectiveBusinessHours = useMemo(() => resourceId && getResourceById(resourceId)?.businessHours || fallback, ...)` appearing in both `grid-cell.tsx` and `event-form.tsx` → extract to `useEffectiveBusinessHours(resourceId)`.
- A `toHiddenDaysSet(days?: WeekDays[])` helper duplicated in both library entry components → hoist to `lib/utils`.

### 6. Duplicated algorithm steps within one function → named helpers

Long algorithmic functions (positioning code, layout code) often have 2-3 near-identical inner loops. Extract each step as a locally-declared closure:

```ts
const findAvailableRow = (startCol, endCol) => { ... }
const place = (row, startCol, endCol, event, ...flags) => { ... }
```

Then the main logic becomes a short sequence of `place(findAvailableRow(...), ...)` calls. Big line savings, usually small bundle savings (minifiers handle token-level duplication), but maintenance wins compound.

### 7. Context providers that re-list every engine field

When `contextValue = useMemo(() => ({ field1: engine.field1, field2: engine.field2, ...23 more }), [...])`, replace with `...engine` spread:

```ts
const contextValue = useMemo(() => ({ ...engine, override1: handler1, ...extras }), [engine, ...])
```

Saves 15-25 lines per provider, no behavior change.

### 8. Repeated reset/initial state literals → module constants

If `{ isOpen: false, event: null, updates: null }` appears as both initial state AND 3 reset points, lift to `const CLOSED_DIALOG = { isOpen: false, event: null, updates: null } as const`. Small win but cleaner.

### 9. Compress verbose data literals

`COLOR_OPTIONS = [{ value: '...', label: 'Blue' }, { value: '...', label: 'Green' }, ...]` on 3-line blocks → one line each. The data is visual and repetitive; vertical density helps readability here.

### 10. Non-overlapping sibling functions with identical structure

Two exported functions like `buildDateTime` and `buildEndDateTime` differing only in an `allDay` branch — merge if the merged signature stays clear; keep separate if one argument disambiguates poorly. Err on the side of keeping two named functions over one confusing parameterized one.

## What NOT to do (readability guardrails)

These will reduce lines and usually reduce bundle, but they destroy readability. Don't.

- **Nested ternaries** (2+ levels) inside return values. A 4-way `a && b ? ... : a ? ... : b ? ... : ...` is unreadable. Use if/else cascade.
- **Wide `cn(...)` stacks** with multi-clause conditionals:
  ```
  cn(base, a && b && !c && 'x', !a && b && 'y', ...)
  ```
  — the reader can't parse what each condition means. Extract each conditional class into a named intermediate variable, then pass the named vars into `cn()`.
- **Dropping JSDoc or inline explanations** to save lines. Doc lines pay for themselves in future maintenance.
- **Eliminating intermediate variables** whose name documents intent (`const isCurrentWeek = ...` is better than inlining the expression 3 lines later).
- **Breaking the public API** for a small win. Splitting a library into multiple entry points for 10-15% bundle savings is a major-version event — don't ship it without explicit agreement.
- **Micro-dedup that trips minifiers**. Modern minifiers already dedup identical string literals, function bodies, and object shapes. Extracting a helper for 3 identical 2-line bodies may ADD bytes (the helper has a name and a call site overhead). Measure.

## Things that rarely work (skip unless measured)

- **Replacing already-well-tree-shaken deps**. Library authors often assume `motion/react` or `framer-motion` is heavy. Measure it first — stub the relevant component with a plain `<div>` and rebuild. Modern ESM libs often ship only 2-5 KB of their code into your bundle. If the empirical delta is small, the swap isn't worth the complexity.
- **`"sideEffects": false` on a single-file bundled output**. Consumer bundlers can't re-split a single minified file. This flag mostly helps multi-file ESM distributions.
- **Externalizing a dep that's already externalized**. Check `head -c 500 dist/index.js` — if you see `from "rrule"`, it's already external.

## The verification commands you actually run

The loop in practice (for a bunup-based library — adapt to the local bundler):

```bash
# Baseline
bun run build 2>&1 | grep "index.js"

# After each change
bun run ci              # lint + type-check + tests + build
bun run build | grep "index.js"   # just the size line

# Occasional deeper check when suspicious
head -c 500 dist/index.js   # verify deps are still externalized
grep -c "some-dep-name" dist/index.js   # confirm a dep was removed
```

If a test fails, **investigate the failure** before deciding whether to revert. Often the test caught a real behavior change you didn't intend (e.g., you removed a check that guarded an edge case). That's the test doing its job.

## When to stop

A session has diminishing returns. Stop when:

- The next candidate file has no visible duplication (subjective — if you're squinting, it's not worth it).
- Two consecutive changes each save < 0.2 KB raw. The curve has flattened.
- You're starting to consider architectural rewrites (lazy-loading, multi-entry) that carry consumer-facing risk — these need an explicit go-ahead, not a quiet ship.

Before you stop, update the session's dev log (if the project keeps one) with: final bundle size, total delta, files touched, and any deferred opportunities. Future sessions start from that context.

## Tone for the user

Be concrete about numbers. "This saved 2.77 KB raw, 0.87 KB gzip" beats "this should help". Report both raw and gzip — they diverge (gzip handles text-level duplication well; raw doesn't). When a change fails to shrink the bundle but removed real duplication, say so honestly: "line count −53, bundle unchanged — the minifier already handled this one. Keeping it for maintenance value."
