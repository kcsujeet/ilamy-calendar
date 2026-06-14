import type { PluginView } from '@ilamy/calendar'
import { List } from 'lucide-react'
import { createElement } from 'react'
import { AgendaView } from '../components/agenda-view'
import { type AgendaWindow, windowRange, windowStep } from './agenda-window'

export interface AgendaViewOptions {
	/** The date window the agenda lists and that prev/next steps over. Default 'month'. */
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
	range: (date) => windowRange(date, window),
	supportsResources: false,
	component: () => createElement(AgendaView, { window }),
})
