import type { CalendarPlugin } from '@ilamy/calendar'
import {
	type AgendaViewOptions,
	createAgendaView,
} from './utils/create-agenda-view'

/** Opt-in agenda plugin: registers the `agenda` view. Pass to `IlamyCalendar`'s `plugins`. */
export const agendaPlugin = (
	options: AgendaViewOptions = {}
): CalendarPlugin => ({
	name: 'agenda',
	views: [createAgendaView(options)],
})
