import type { Dayjs, PluginView } from '@ilamy/calendar'
import { AgendaView } from '../components/agenda-view'

/** 'month' = the calendar month containing the date; a number = that many days from the date. */
export type AgendaWindow = 'month' | number

export interface AgendaViewOptions {
	/** The date window the agenda lists and that prev/next steps over. Default 'month'. */
	window?: AgendaWindow
}

const windowRange = (
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

const windowStep = (
	window: AgendaWindow
): { amount: number; unit: 'month' | 'day' } =>
	window === 'month'
		? { amount: 1, unit: 'month' }
		: { amount: window, unit: 'day' }

/** Builds the agenda `PluginView` for the given window. */
export const createAgendaView = ({
	window = 'month',
}: AgendaViewOptions = {}): PluginView => ({
	name: 'agenda',
	label: 'agenda',
	navigationStep: windowStep(window),
	range: (date) => windowRange(date, window),
	supportsResources: false,
	component: AgendaView,
})
