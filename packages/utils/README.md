# @ilamy/utils

Shared runtime utilities for the [`@ilamy/calendar`](https://www.npmjs.com/package/@ilamy/calendar) ecosystem.

## Exports

### `@ilamy/utils/dayjs`

The single, pre-configured `dayjs` instance the calendar and its plugins share. It extends dayjs with `utc`, `timezone`, `isBetween`, `isSameOrBefore`, `isSameOrAfter`, `localizedFormat`, `weekday`, `weekOfYear`, `minMax`, `localeData`, plus a timezone-offset fix for DST-boundary `startOf`/`endOf`. `dayjs()` is timezone-aware (honors `dayjs.tz.setDefault(...)`).

```ts
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
```

> Plugins should import dayjs from here (not from `dayjs` directly) so they share one instance and inherit these plugin augmentations — the augmentations don't survive a bundler's `.d.ts` boundary otherwise.

### `@ilamy/utils/helpers`

```ts
import { safeDate, omitKeys, listKey } from '@ilamy/utils/helpers'
```

- `safeDate(date)` — coerce a date-ish value to `Dayjs | undefined`.
- `omitKeys(obj, keys)` — shallow copy without the given keys.
- `listKey(...parts)` — compose a stable string key/id (`listKey('day', 3)` → `'day-3'`).

## Install

```sh
bun add @ilamy/utils
```

## License

MIT
