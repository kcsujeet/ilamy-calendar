# Architecture: package and feature boundaries

## Shared code lives in the shared packages, not in features or sibling packages

- **A component used by more than one feature or package belongs in `@ilamy/ui`.** Do not keep a shared component inside a feature folder (`features/calendar/components/...`) or a plugin package and have another consumer import it from there.
- **Shared helpers belong in `@ilamy/utils`; shared types in `@ilamy/types`.** Same rule: if two packages/features need it, it moves to the shared package.
- The published `@ilamy/calendar` package re-exports its own public API for consumers. It is **not** a dumping ground for cross-package sharing: a plugin package (e.g. `@ilamy/calendar-recurrence`, `@ilamy/calendar-agenda`) should reach shared building blocks through `@ilamy/ui` / `@ilamy/utils` / `@ilamy/types`, not by importing the core's feature internals.

## Features and packages should not share logic with each other

- **Minimize logic sharing between features and between packages.** A feature owns its own logic; a plugin package owns its own logic. When two of them need the same thing, that thing is shared infrastructure and moves to a shared package (`@ilamy/ui`/`@ilamy/utils`/`@ilamy/types`), not copied or cross-imported.
- **Do not widen a feature/core package's public API just to let another package reuse an implementation detail.** If a plugin needs a component the core also uses, extract that component to `@ilamy/ui` so both consume it from the shared package. Widening `@ilamy/calendar`'s public surface to share an internal is the wrong direction.
- A plugin package consumes the host only through its **public** API (`@ilamy/calendar`), never its `@/features/...` internals.

## Inside a package: Bulletproof React layout

Each package's `src/` follows [Bulletproof React's project structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md): imports flow one way, **shared -> features -> app**.

- `features/<name>/` holds everything specific to that feature (its `components/`, `hooks/`, `stores/`, `utils/`, `types/`). In `@ilamy/calendar` that is `features/calendar/`: the views, header, form, grids, drag and drop, stores, hooks and utils.
- Shared folders (`components/`, `hooks/`, `lib/`, `config/`, `utils/`, `types/`) hold only code another feature could use unchanged. They never import from `features/`; `biome.json` rejects a `@/features/*` import there.
- The app layer is the package's entries: `index.ts`, `testing/`, `plugins/`.
- State lives in `stores/`, one file or folder per context with its provider. No barrel files: import each file directly.

When a shared file needs feature code, it belongs in the feature: move it there rather than importing upward.

## Why

This keeps packages decoupled, keeps the published API surface intentional (not accidental sharing), and means a shared building block has exactly one home. When you reach for "export this from the core so the plugin can use it," stop: if it is genuinely shared, relocate it to `@ilamy/ui`/`@ilamy/utils`/`@ilamy/types` instead.
