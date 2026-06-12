# Custom Views — Author Guide

A view is one `PluginView` entry. The four built-ins (day, week, month, year) are
themselves `PluginView` entries resolved exactly like yours — there is no second registry.

## The three knobs, and who owns them

| Field | Audience | One-line meaning |
|---|---|---|
| `layout` | view **author** | The view's shape: which engine renders it when the calendar has **no** resources. |
| `orientation` | calendar **user** | Where the resources go on a resource calendar. Ignored without `resources`. |
| `supportsResources` | view **author** | Whether your `columns()` composes the resource axis when `config.resources` is set. |

> layout = the view's shape, author's choice; orientation = where your resources go,
> user's choice; supportsResources = whether the author built the resource arrangements.

## The two engines

```
layout: 'vertical'                      layout: 'horizontal'
(time flows down; columns across)       (date cells flow across; rows stack)

        Mon    Tue    Wed                       S  M  T  W  T  F  S
  9:00 |      |      |      |           week 1 [ ][ ][ ][ ][ ][ ][ ]
 10:00 |      |      |      |           week 2 [ ][ ][ ][ ][ ][ ][ ]
 11:00 |      |      |      |           week 3 [ ][ ][ ][ ][ ][ ][ ]
```

Day and week are 'vertical'; month is 'horizontal'; year declares neither and renders its
own `component` (the escape hatch).

## The engine rule (what the renderer actually does)

```
engine = resources && view.supportsResources ? calendar.orientation : view.layout
```

With resources present and a resource-capable view, the **user's** `orientation` decides
the arrangement; otherwise your `layout` does:

```
orientation: 'vertical'                 orientation: 'horizontal'
(resources as columns)                  (resources as rows)

        Room A   Room B                          Mon   Tue   Wed
  9:00 |        |        |              Room A  [    ][    ][    ]
 10:00 |        |        |              Room B  [    ][    ][    ]
```

## What breaks without each field

| You omit… | What happens |
|---|---|
| `range` | The event pipeline and `onDateChange` fall back to the month 6x7 grid range — wrong events fetched for your window. |
| `navigationStep` / `navigationUnit` | Prev/next steps a single day. |
| `columns` + `layout` | Your `component` renders everything itself (escape hatch — fine, that's the year view). |
| `renderHeader` | No header row above the grid. |
| `supportsResources` | Your view is hidden from the switcher on resource calendars. |

> Note: `range()` receives only `{ firstDayOfWeek }` as its `config` today; the full
> axis config (`resources`, `orientation`, `hiddenDays`, ...) reaches `columns()` and
> `renderHeader()`.

## Worked example: a 40-day grid

One entry. `range` defines the window, `columns` its rows, `navigationStep` makes
prev/next jump a full window (the event pipeline is range-driven, so events follow free):

```tsx
import type {
	Dayjs,
	HorizontalRowSpec,
	IlamyPlugin,
	PluginView,
	ViewConfig,
} from '@ilamy/calendar'

const WINDOW = 40
const DAYS_PER_ROW = 10

const fortyDayRows = (date: Dayjs, _config: ViewConfig): HorizontalRowSpec[] => {
	const start = date.startOf('day')
	const days = Array.from({ length: WINDOW }, (_, i) => start.add(i, 'day'))
	const rows: HorizontalRowSpec[] = []
	for (let row = 0; row * DAYS_PER_ROW < days.length; row += 1) {
		const rowDays = days.slice(row * DAYS_PER_ROW, (row + 1) * DAYS_PER_ROW)
		rows.push({
			id: `forty-row-${row}`,
			className: 'flex-1',
			showDayNumber: true,
			columns: rowDays.map((day) => ({
				id: `forty-${day.toISOString()}`,
				day,
				gridType: 'day' as const,
			})),
		})
	}
	return rows
}

export const fortyDayView: PluginView = {
	name: 'forty-day',
	label: '40 days',
	layout: 'horizontal',
	navigationStep: { amount: WINDOW, unit: 'day' },
	range: (date) => ({
		start: date.startOf('day'),
		end: date.add(WINDOW - 1, 'day').endOf('day'),
	}),
	columns: fortyDayRows,
	renderHeader: ({ date }) => (
		<div className="flex h-12 items-center justify-center font-semibold">
			{date.format('LL')} — {date.add(WINDOW - 1, 'day').format('LL')}
		</div>
	),
	// Always required. The escape hatch when `columns`/`layout` are absent; for
	// spec-driven views it is unused by the renderer (use `() => null`).
	component: () => null,
}

export const fortyDayPlugin: IlamyPlugin = {
	name: 'forty-day',
	views: [fortyDayView],
}
```

### …and with resources

Declare `supportsResources: true` and compose the resource axis in `columns()` from
`config.resources`. Honor the engine rule: when `config.orientation` is 'horizontal',
return one `HorizontalRowSpec` per resource (set `resource` on the row); when 'vertical',
return one `VerticalColumnSpec` per resource (set `resourceId`/`resource` on the column).
The resource axis multiplies whatever day cells your window declares — the event pipeline
already filters per resource.

```tsx
const fortyDayResourceRows = (
	date: Dayjs,
	config: ViewConfig
): HorizontalRowSpec[] => {
	const start = date.startOf('day')
	const days = Array.from({ length: WINDOW }, (_, i) => start.add(i, 'day'))
	return (config.resources ?? []).map((resource) => ({
		id: `forty-${resource.id}`,
		className: 'flex-1',
		resource,
		columns: days.map((day) => ({
			id: `forty-${resource.id}-${day.toISOString()}`,
			day,
			gridType: 'day' as const,
		})),
	}))
}
```

A view that declares `supportsResources: true` must handle BOTH orientations — that is the
promise the flag makes to the switcher.

---

The built-ins demonstrate every non-resource field in
`packages/calendar/src/features/calendar/components/views/` — read them as worked
reference implementations.
