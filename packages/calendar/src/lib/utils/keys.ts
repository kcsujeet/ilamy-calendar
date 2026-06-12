import type { Dayjs } from '@/lib/configs/dayjs-config'
import { getDayKey, isToday } from './date-utils'

type Id = string | number

const pad2 = (n: number | string): string => String(n).padStart(2, '0')
const padHourIfNumber = (hour: number | string): string =>
	typeof hour === 'number' ? pad2(hour) : hour

/**
 * Centralized factory for keys, ids, and data-testids. Each entry returns a
 * semantic string identified by its concept prefix (e.g. `day-col-`,
 * `day-cell-`, `week-header-day-`). The call site chooses the role — the
 * same string can serve as a React `key=`, an `id`, or a `data-testid`.
 *
 * Inspired by https://tkdodo.eu/blog/effective-react-query-keys#use-query-key-factories.
 * Prevents ad-hoc string concatenation so cross-cutting changes (prefix,
 * separator, format) are one-point.
 */
export const keys = {
	// Grid column configuration ids
	col: {
		time: 'time-col',
		date: 'date-col',
		day: (day: Dayjs, resourceId?: Id) => {
			const base = `day-col-${getDayKey(day)}`
			return resourceId != null ? `${base}-resource-${resourceId}` : base
		},
		resource: (scope: 'week' | 'month', resourceId: Id) =>
			`${scope}-col-resource-${resourceId}`,
		allDay: (day: Dayjs, index: number) =>
			`all-day-col-${getDayKey(day)}-${index}`,
	},

	// Grid cell identifiers
	cell: {
		day: (day: Dayjs, hour?: number | string, minute: number | string = 0) => {
			const k = getDayKey(day)
			return hour != null
				? `day-cell-${k}-${pad2(hour)}-${pad2(minute)}`
				: `day-cell-${k}`
		},
		verticalTime: (hour: number | string) => `vertical-time-${pad2(hour)}`,
		vertical: (
			day: Dayjs,
			hour: number | string,
			minute: number | string,
			resourceId?: Id
		) => {
			const base = `vertical-cell-${getDayKey(day)}-${pad2(hour)}-${pad2(minute)}`
			return resourceId != null ? `${base}-resource-${resourceId}` : base
		},
	},

	// Container (wrapper) identifiers
	container: {
		vertical: {
			col: (id: Id) => `vertical-col-${id}`,
		},
		horizontal: {
			row: (id: Id) => `horizontal-row-${id}`,
			rowLabel: (resourceId: Id) => `horizontal-row-label-${resourceId}`,
			event: (eventId: Id) => `horizontal-event-${eventId}`,
		},
		eventsLayer: (orientation: 'vertical' | 'horizontal', id: Id) =>
			`${orientation}-events-${id}`,
	},

	// Header identifiers
	header: {
		resource: {
			weekDay: 'resource-week-day-header',
			// The vertical-arrangement resource header (day AND month views).
			columnsHeader: 'resource-columns-header',
			monthDay: (day: Dayjs) => `resource-month-header-${day.toISOString()}`,
			timeLabel: (view: 'week' | 'day', hour: number | string) =>
				`resource-${view}-time-label-${padHourIfNumber(hour)}`,
		},
		weekday: (view: 'week' | 'month', name: string) =>
			`${view}-header-weekday-${name.toLowerCase()}`,
		week: {
			day: (day: Dayjs) => `week-header-day-${day.toISOString()}`,
			hour: (day: Dayjs, ref: Id) =>
				`week-header-hour-${day.toISOString()}-${ref}`,
			resource: (resourceId: Id) => `week-header-resource-${resourceId}`,
		},
		year: {
			month: (monthKey: string, part?: 'title' | 'count' | 'mini') =>
				part ? `year-month-${part}-${monthKey}` : `year-month-${monthKey}`,
			day: (monthKey: string, dayKey: string) =>
				`year-day-${monthKey}-${dayKey}`,
		},
	},

	// Resource-scoped all-day row id (falls back to 'main' when unscoped).
	allDayRow: (resourceId?: Id) => `allday-row-${resourceId ?? 'main'}`,

	// Generic iteration key composer for React `key=` props, list markers,
	// and suffixed wrapper keys (e.g. `listKey(base, 'animated')`).
	listKey: (...parts: Array<string | number>) => parts.join('-'),

	// DayNumber component testid — `day-number-today` when the date is today,
	// otherwise `day-number-{D}`.
	dayNumber: (date: Dayjs) =>
		isToday(date) ? 'day-number-today' : `day-number-${date.format('D')}`,

	// Form element testid for time pickers (name = 'start' / 'end' etc.)
	timePicker: (name: string | undefined) => `time-picker-${name ?? ''}`,

	// Droppable ids (dnd-kit registry — ISO for per-slot uniqueness).
	// `drop-` prefix avoids colliding with `cell.day` testids.
	droppable: {
		dayCell: (day: Dayjs, options?: { allDay?: boolean; resourceId?: Id }) => {
			const iso = day.toISOString()
			const allDayPart = options?.allDay ? '-allday' : ''
			const resourcePart =
				options?.resourceId != null ? `-resource-${options.resourceId}` : ''
			return `drop-day-cell-${iso}${allDayPart}${resourcePart}`
		},
	},
} as const
