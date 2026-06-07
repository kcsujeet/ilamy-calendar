# @ilamy/types

> **Internal package — not published.** It is bundled into [`@ilamy/calendar`](https://www.npmjs.com/package/@ilamy/calendar) at build time. Consumers import these types from `@ilamy/calendar`, not from here.

Shared, runtime-free TypeScript types — the plugin-contract surface, kept in its own workspace package so the core and plugins depend on a lightweight contract without circular imports.

## What's here

- `CalendarEvent`, `WeekDays`, `BusinessHours` — the event model.
- `IlamyPlugin`, `PluginMutationArgs`, `PluginDateRange`, `PluginView` — the plugin SDK contract.
- `EventFormSlotContext`, `EventMutationScopeSlotContext` — host slot context shapes.
- `Dayjs`, `ManipulateType` — re-exported from `dayjs`.

This package ships types only (no runtime). The configured dayjs **instance** lives in `@ilamy/utils`.

## License

MIT
