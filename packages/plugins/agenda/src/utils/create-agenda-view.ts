import type { PluginView } from '@ilamy/calendar'
import { List } from 'lucide-react'
import { createElement } from 'react'
import { AgendaView } from '../components/agenda-view'
import { type AgendaWindow, windowRange, windowStep } from './agenda-window'

export interface AgendaViewOptions {
	/**
	 * The date window the agenda lists and that prev/next steps over. Default 'month'.
	 * A named period ('day' | 'week' | 'month') is the calendar period *containing*
	 * the current date, so it can include earlier days of that period (and aligns
	 * with the matching grid view + header label). A number is a rolling window of
	 * that many days starting *at* the current date and counting forward.
	 */
	window?: AgendaWindow
}

/** Builds the agenda `PluginView` for the given window. */
export const createAgendaView = ({
	window = 'month',
}: AgendaViewOptions = {}): PluginView => ({
	name: 'agenda',
	label: 'agenda',
	icon: List,
	navigationStep: windowStep(window),
	range: (date, config) => windowRange(date, window, config.firstDayOfWeek),
	supportsResources: false,
	component: () => createElement(AgendaView, { window }),
})
