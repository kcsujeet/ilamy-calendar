import type { PluginView } from '@ilamy/calendar'
import { now, parseDate, resolveZone, toOffsetIso } from '@ilamy/utils/temporal'
import { List } from 'lucide-react'
import { createElement } from 'react'
import { AgendaView } from '../components/agenda-view'
import { type AgendaWindow, windowRange, windowStep } from './agenda-window'

export interface AgendaViewOptions {
	window?: AgendaWindow
}

export const createAgendaView = ({
	window = 'month',
}: AgendaViewOptions = {}): PluginView => ({
	name: 'agenda',
	label: 'agenda',
	icon: List,
	navigationStep: windowStep(window),
	range: (dateIso, config) => {
		const zone = resolveZone(config.timezone)
		const zoned = parseDate(dateIso, zone) ?? now(zone)
		const { start, end } = windowRange(zoned, window, config.firstDayOfWeek)
		return { start: toOffsetIso(start), end: toOffsetIso(end) }
	},
	supportsResources: false,
	component: () => createElement(AgendaView, { window }),
})
