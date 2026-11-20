import { add, endOf, startOf, type ZonedDate } from '@ilamy/utils/temporal'

export type AgendaWindow = 'day' | 'week' | 'month' | number

type NamedWindow = Exclude<AgendaWindow, number>
export type AgendaZonedRange = { start: ZonedDate; end: ZonedDate }
type Step = { amount: number; unit: 'day' | 'week' | 'month' }

const namedRange: Record<
	NamedWindow,
	(date: ZonedDate, firstDayOfWeek: number) => AgendaZonedRange
> = {
	day: (date) => ({ start: startOf(date, 'day'), end: endOf(date, 'day') }),
	week: (date, firstDayOfWeek) => {
		const start = startOf(date, 'week', firstDayOfWeek)
		return { start, end: endOf(add(start, 6, 'day'), 'day') }
	},
	month: (date) => ({
		start: startOf(date, 'month'),
		end: endOf(date, 'month'),
	}),
}

const namedStep: Record<NamedWindow, Step> = {
	day: { amount: 1, unit: 'day' },
	week: { amount: 1, unit: 'week' },
	month: { amount: 1, unit: 'month' },
}

export const windowRange = (
	date: ZonedDate,
	window: AgendaWindow,
	firstDayOfWeek = 0
): AgendaZonedRange => {
	if (typeof window === 'number') {
		return {
			start: startOf(date, 'day'),
			end: endOf(add(date, window - 1, 'day'), 'day'),
		}
	}
	return namedRange[window](date, firstDayOfWeek)
}

export const windowStep = (window: AgendaWindow): Step => {
	if (typeof window === 'number') {
		return { amount: window, unit: 'day' }
	}
	return namedStep[window]
}
