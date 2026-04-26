- Prefer `.at()` over `[]` for array access (e.g. `days.at(0)` not `days[0]`, `days.at(-1)` not `days[days.length - 1]`).
- Never use non-null assertions (`!`). Use proper guards, type narrowing, or optional chaining instead.
- Prefer `Boolean(variable)` over `!!variable` or `!variable` for boolean coercion.
- Never use `any`. Use proper types, `unknown`, or type predicates instead.
- Don't sacrifice readability for fewer lines. A flat `if/else` cascade is preferred over a nested ternary. Single ternaries are fine (`isActive ? 'on' : 'off'`); two levels of nested ternaries in a return value is a code smell — keep the explicit form.
- For class-name concatenation with `cn(...)`: when a condition has a single clause, inline it (`day.isToday && 'bg-primary'`). When a condition has multiple clauses (e.g. `A && !B && !C && 'some-class'`), extract each conditional class to a named intermediate variable and pass those into `cn()` — the variable name documents what the condition means, which is hard to read inline.
- Reduce repetition in tests. When multiple tests share the same input-construction boilerplate (e.g. `dayjs('2025-01-13T09:00:00.000Z')`, full event literals, repeated call shapes like `getX({ days: allDays, events: [...] })`), extract compact helpers at the top of the file:
  - An input-builder helper for datetimes (e.g. `at(hour, minute=0)`).
  - A factory for the domain object being tested (e.g. `mkEvent(id, startH, endH, extra?)`).
  - A call wrapper that supplies sensible defaults (e.g. `run(events, opts?)`).
  - Collapse per-index `expect` chains into single array assertions: `result.map(e => e.left).toEqual([0, 25, 50])` instead of three separate `expect(result[i].left).toBe(...)`.

  Each test should read as a direct "input → expected output" statement. Keep helpers local to the test file unless they're obviously shared across multiple.
