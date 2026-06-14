import type { Dayjs } from '@ilamy/calendar'

/**
 * The date window the agenda lists (and that prev/next steps over).
 *
 * A named period is the calendar period *containing* the reference date, so it
 * can extend backward to the period's start (e.g. 'month' on the 14th lists from
 * the 1st) and stays aligned with the matching grid view and header label. A
 * number is a rolling window of that many days starting *at* the reference date
 * and counting forward (e.g. 8 on the 14th lists the 14th–21st) — there is no
 * calendar boundary to anchor it to, so it does not look backward.
 */
export type AgendaWindow = 'day' | 'week' | 'month' | number

type NamedWindow = Exclude<AgendaWindow, number>
type Range = { start: Dayjs; end: Dayjs }
type Step = { amount: number; unit: 'day' | 'week' | 'month' }

const namedRange: Record<
	NamedWindow,
	(date: Dayjs, firstDayOfWeek: number) => Range
> = {
	day: (date) => ({ start: date.startOf('day'), end: date.endOf('day') }),
	week: (date, firstDayOfWeek) => {
		const offset = (date.day() - firstDayOfWeek + 7) % 7
		const start = date.subtract(offset, 'day').startOf('day')
		return { start, end: start.add(6, 'day').endOf('day') }
	},
	month: (date) => ({ start: date.startOf('month'), end: date.endOf('month') }),
}

const namedStep: Record<NamedWindow, Step> = {
	day: { amount: 1, unit: 'day' },
	week: { amount: 1, unit: 'week' },
	month: { amount: 1, unit: 'month' },
}

/**
 * The date window the agenda lists, derived from the reference date.
 * `firstDayOfWeek` aligns the 'week' window; ignored for other windows.
 */
export const windowRange = (
	date: Dayjs,
	window: AgendaWindow,
	firstDayOfWeek = 0
): Range => {
	if (typeof window === 'number') {
		return {
			start: date.startOf('day'),
			end: date.add(window - 1, 'day').endOf('day'),
		}
	}
	return namedRange[window](date, firstDayOfWeek)
}

/** How far prev/next steps for the window. */
export const windowStep = (window: AgendaWindow): Step => {
	if (typeof window === 'number') {
		return { amount: window, unit: 'day' }
	}
	return namedStep[window]
}
