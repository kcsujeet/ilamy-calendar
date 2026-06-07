# @ilamy/types

Shared, runtime-free TypeScript types for the [`@ilamy/calendar`](https://www.npmjs.com/package/@ilamy/calendar) ecosystem — the plugin-contract surface a plugin depends on without pulling in the whole calendar.

## What's here

- `CalendarEvent`, `WeekDays`, `BusinessHours` — the event model.
- `IlamyPlugin`, `PluginMutationArgs`, `PluginDateRange`, `PluginView` — the plugin SDK contract.
- `EventFormSlotContext`, `EventMutationScopeSlotContext` — host slot context shapes.
- `Dayjs`, `ManipulateType` — re-exported from `dayjs`.

This package ships types only (no runtime). The configured dayjs **instance** lives in [`@ilamy/utils`](https://www.npmjs.com/package/@ilamy/utils).

## Install

```sh
bun add @ilamy/types
```

> Most consumers don't depend on this directly — it comes transitively via `@ilamy/calendar`. Plugin authors may depend on it for a lightweight type-only contract.

## License

MIT
