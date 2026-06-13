import type { Dayjs } from '@ilamy/calendar'

/** 'month' = the calendar month containing the date; a number = that many days from the date. */
export type AgendaWindow = 'month' | number

/** The date window the agenda lists, derived from the reference date. */
export const windowRange = (
	date: Dayjs,
	window: AgendaWindow
): { start: Dayjs; end: Dayjs } => {
	if (window === 'month') {
		return { start: date.startOf('month'), end: date.endOf('month') }
	}
	return {
		start: date.startOf('day'),
		end: date.add(window - 1, 'day').endOf('day'),
	}
}

/** How far prev/next steps for the window. */
export const windowStep = (
	window: AgendaWindow
): { amount: number; unit: 'month' | 'day' } => {
	if (window === 'month') {
		return { amount: 1, unit: 'month' }
	}
	return { amount: window, unit: 'day' }
}
