# Architecture: package and feature boundaries

## Shared code lives in the shared packages, not in features or sibling packages

- **A component used by more than one feature or package belongs in `@ilamy/ui`.** Do not keep a shared component inside a feature folder (`features/calendar/components/...`) or a plugin package and have another consumer import it from there.
- **Shared helpers belong in `@ilamy/utils`; shared types in `@ilamy/types`.** Same rule: if two packages/features need it, it moves to the shared package.
- The published `@ilamy/calendar` package re-exports its own public API for consumers. It is **not** a dumping ground for cross-package sharing: a plugin package (e.g. `@ilamy/calendar-recurrence`, `@ilamy/calendar-agenda`) should reach shared building blocks through `@ilamy/ui` / `@ilamy/utils` / `@ilamy/types`, not by importing the core's feature internals.

## Features and packages should not share logic with each other

- **Minimize logic sharing between features and between packages.** A feature owns its own logic; a plugin package owns its own logic. When two of them need the same thing, that thing is shared infrastructure and moves to a shared package (`@ilamy/ui`/`@ilamy/utils`/`@ilamy/types`), not copied or cross-imported.
- **Do not widen a feature/core package's public API just to let another package reuse an implementation detail.** If a plugin needs a component the core also uses, extract that component to `@ilamy/ui` so both consume it from the shared package. Widening `@ilamy/calendar`'s public surface to share an internal is the wrong direction.
- A plugin package consumes the host only through its **public** API (`@ilamy/calendar`), never its `@/features/...` internals.

## Why

This keeps packages decoupled, keeps the published API surface intentional (not accidental sharing), and means a shared building block has exactly one home. When you reach for "export this from the core so the plugin can use it," stop: if it is genuinely shared, relocate it to `@ilamy/ui`/`@ilamy/utils`/`@ilamy/types` instead.
