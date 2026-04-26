# Coding Patterns

## Array Access
- **Preferred Pattern**: Use `.at(0)` and `.at(-1)` for accessing the first and last elements of an array. The user prefers these patterns and considers them valid.
- **Example**: 
  - `days.at(0).startOf('day')`
  - `dayEnd = days.at(-1)`

## TypeScript 6.0 Migration Patterns
- **Optional Dates**: Favor `undefined` over `null` for optional date props and state.
- **Null safety**: While working with strict null checks in TypeScript 6.0, always prefer the patterns mentioned above for array access.

## Mandatory Verification
- **Post-Modification Workflow**: After modifying ANY file, ALWAYS run the following validation suite to ensure no regressions:
  - `bun run type-check` (TypeScript validation)
  - `bun run check:fix` (Combined linting and formatting fixes via Biome)
  - `bun test` (Unit and integration tests)

## Type Safety
- **Avoid 'any'**: NEVER use the `any` type unless there is absolutely no other alternative (e.g., interacting with a poorly typed third-party library without available @types). 
- **Preferred Alternatives**: Use `unknown` with type guards, specific interfaces, or generics to maintain full type safety across the application.
- **No Non-Null Assertions**: NEVER use the non-null assertion operator (`!`). Always use explicit null guards, optional chaining (`?.`), or default values. This ensures that the code handles unexpected null/undefined values gracefully at runtime.

## Export Patterns
- **Named Exports Only**: NEVER use `export default`. Always use named exports for all components, hooks, utilities, and types. This improves IDE discoverability, refactoring safety, and consistency across the codebase.
