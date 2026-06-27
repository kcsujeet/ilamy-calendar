# DRY and reuse

Part of the code-review skill (`SKILL.md`). Detail behind section D's DRY/reuse checklist items. (YAGNI/simplest-form lives in `yagni-simplest-form.md`.)

DRY is a primary lens, and it cuts two ways:
1. **Reuse what already exists** — never add a function, component, hook, type, or constant the codebase already provides. This is the most-missed DRY violation: the diff hand-rolls something that already lives in a shared package or an adjacent file.
2. **Extract repetition within the diff** — when the same shape of code (test boilerplate, condition, JSX wrapper, setup block) appears 2-3+ times, propose extracting it.

The goal is not zealous dedup (three similar lines can beat a premature abstraction), but identical shapes with no real variance get named once, and nothing gets re-implemented when it already exists.

## Checklist items this backs

- **Reuse of existing code checked (DRY: don't re-implement).** For every new function, component, hook, type, constant, or util the diff ADDS, grepped the codebase for an existing equivalent before accepting it as new. Searched the shared packages first (`@ilamy/ui` components + `@ilamy/ui/lib/utils` for `cn`, `@ilamy/utils` helpers + the configured `dayjs`, `@ilamy/types`), then `lib/`, `utils/`, `hooks/`, and the files adjacent to the change. If an equivalent exists, flagged the duplicate with the exact name/path to call instead (a re-declared `cn`/`safeDate`/date helper; a new component that duplicates an `@ilamy/ui` primitive; a hook that re-implements an existing one; a type that restates `CellInfo`/`CalendarEvent`/a shared shape). Per `.agents/rules/architecture.md`, if the thing is genuinely shared, it belongs in `@ilamy/ui`/`@ilamy/utils`/`@ilamy/types`, not copied into a feature or plugin. Grep recipe: search by likely **name fragments AND by signature/shape**, not just the exact name (a duplicate usually has a different name); for a new component, grep its core JSX/props; for a new type, grep its field set.
- **Repeated test setup checked.** Multiple tests with the same `render(<Provider>...<X/></Provider>)` boilerplate varying one prop → propose a `renderX(overrides?)` helper. Same for repeated event literals / datetime construction (`at(hour, minute)`, `buildEvent`).
- **Repeated inline checks / computations checked.** The same condition or derived value appearing 3+ times → extract to a named const or a shared hook (e.g. a repeated `locale = currentLocale || currentDate.locale()` pattern).
- **Scope creep checked.** Props added to shared components for a single caller's use case → should it live closer to the caller? Over-parameterized components (6+ props where some are derivable from context).
- **Over-engineering checked.** A custom utility/module where a one-line library call would do (e.g. `formatLocaleDate.ts` vs `dayjs.extend(localizedFormat)` + `format('LL')`). For **every new helper in the diff**, asked: "what does this do that the underlying library / plugin / standard token does not already do?" If the answer is "nothing meaningful", flagged for deletion. Verified equivalence before claiming it.
- **Useless `useMemo` checked.** Empty deps + no inputs from component scope (it's a module constant in disguise → hoist). Deps that change every render (cache never hits → drop, inline). Every "drop this memo" comment includes the reason ("empty deps", "deps change every render", "7 cheap ops").
- **JSX / structure checked.** JSX blocks >30 lines that should be standalone components; useless wrapper divs duplicating parent styling; template-literal classNames where `cn()` is the convention.
