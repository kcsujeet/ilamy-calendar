import { isToday } from '@ilamy/core'
import { dayKey, toUtcIso, type ZonedDate } from '@ilamy/utils/temporal'
import type { CalendarView } from '@/types'

type Id = string | number

const pad2 = (n: number | string): string => String(n).padStart(2, '0')
const padHourIfNumber = (hour: number | string): string =>
	typeof hour === 'number' ? pad2(hour) : hour

/** Centralized factory for React keys, ids, and data-testids. */
export const keys = {
	col: {
		time: 'time-col',
		date: 'date-col',
		day: (day: ZonedDate, resourceId?: Id) => {
			const base = `day-col-${dayKey(day)}`
			return resourceId != null ? `${base}-resource-${resourceId}` : base
		},
		resource: (scope: 'week' | 'month', resourceId: Id) =>
			`${scope}-col-resource-${resourceId}`,
		allDay: (day: ZonedDate, index: number) =>
			`all-day-col-${dayKey(day)}-${index}`,
	},

	cell: {
		day: (
			day: ZonedDate,
			hour?: number | string,
			minute: number | string = 0
		) => {
			const k = dayKey(day)
			return hour != null
				? `day-cell-${k}-${pad2(hour)}-${pad2(minute)}`
				: `day-cell-${k}`
		},
		verticalTime: (hour: number | string) => `vertical-time-${pad2(hour)}`,
		vertical: (
			day: ZonedDate,
			hour: number | string,
			minute: number | string,
			resourceId?: Id
		) => {
			const base = `vertical-cell-${dayKey(day)}-${pad2(hour)}-${pad2(minute)}`
			return resourceId != null ? `${base}-resource-${resourceId}` : base
		},
	},

	container: {
		vertical: {
			col: (id: Id) => `vertical-col-${id}`,
		},
		horizontal: {
			row: (id: Id) => `horizontal-row-${id}`,
			rowLabel: (resourceId: Id) => `horizontal-row-label-${resourceId}`,
			event: (eventId: Id) => `horizontal-event-${eventId}`,
		},
		verticalEvent: (eventId: Id) => `vertical-event-${eventId}`,
		eventsLayer: (orientation: 'vertical' | 'horizontal', id: Id) =>
			`${orientation}-events-${id}`,
	},

	header: {
		resource: {
			weekDay: 'resource-week-day-header',
			columnsHeader: 'resource-columns-header',
			monthDay: (day: ZonedDate) => `resource-month-header-${toUtcIso(day)}`,
			timeLabel: (view: 'week' | 'day', hour: number | string) =>
				`resource-${view}-time-label-${padHourIfNumber(hour)}`,
		},
		weekday: (view: 'week' | 'month', name: string) =>
			`${view}-header-weekday-${name.toLowerCase()}`,
		week: {
			day: (day: ZonedDate) => `week-header-day-${toUtcIso(day)}`,
			hour: (day: ZonedDate, ref: Id) =>
				`week-header-hour-${toUtcIso(day)}-${ref}`,
			resource: (resourceId: Id) => `week-header-resource-${resourceId}`,
		},
		year: {
			month: (monthKey: string, part?: 'title' | 'count' | 'mini') =>
				part ? `year-month-${part}-${monthKey}` : `year-month-${monthKey}`,
			day: (monthKey: string, dayStr: string) =>
				`year-day-${monthKey}-${dayStr}`,
		},
	},

	allDayRow: (resourceId?: Id) => `allday-row-${resourceId ?? 'main'}`,

	listKey: (...parts: Array<string | number>) => parts.join('-'),

	dayNumber: (date: ZonedDate) =>
		isToday(date) ? 'day-number-today' : `day-number-${date.day}`,

	stickyInsets: (
		view: CalendarView,
		date: ZonedDate | string,
		isHeaderSticky: boolean,
		laneCount: number
	) => {
		const datePart = typeof date === 'string' ? date.slice(0, 10) : dayKey(date)
		return `sticky-insets-${view}-${datePart}-${isHeaderSticky ? 'sticky' : 'static'}-${laneCount}`
	},

	dragPreview: (orientation: 'vertical' | 'horizontal') =>
		`event-drag-preview-${orientation}`,

	timePicker: (name: string | undefined) => `time-picker-${name ?? ''}`,

	fieldLabel: (field: string) => `${field}-label`,
} as const
