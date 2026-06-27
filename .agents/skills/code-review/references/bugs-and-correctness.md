# Bugs and correctness

Part of the code-review skill (`SKILL.md`). Detail behind section C.

## Checklist items this backs

- **Logic bugs checked.** Off-by-one, wrong operator, inverted conditions, stale state, wrong dependency arrays.
- **Leftover / dead code checked.** Duplicate JSX from incomplete refactors, dead imports, props threaded through that aren't used, commented-out blocks.
- **Breaking changes checked.** Modified shared components, changed prop shapes, removed/renamed exports. Grepped for who imports them. Removing a field or making an optional field required on a public type is a breaking change even if the PR description says it isn't.
- **Data-shape mismatches checked.** API contract drift, type assertions (`as`) that hide real errors, `any` smuggling a wrong type through.
- **Edge cases checked.** Empty arrays, null/undefined, boundary values. Timezone: this codebase uses dayjs with a configured `timezone` prop; `Intl.DateTimeFormat` without a `timeZone` option formats in the system timezone, which is wrong here.
- **Regression of a previously-fixed bug checked** against `docs/logs/`. Don't trust the PR description; check the logs.

## Notes

- For each finding, open the actual file at the actual line and confirm the bug exists before drafting it (see the "Sources of truth" checks in `scope-and-gathering.md`). No findings from a subagent report alone.
- Any claim about external-library behavior (dayjs, rrule, React, Intl, Tailwind, GitHub API) needs a WebFetch backing it, cited inline. Cached knowledge drifts.
