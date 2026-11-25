import {
	type CalendarPluginView,
	formatDate,
	formatDateRange,
	getWeekDays,
	now,
	type PluginViewContext,
	parseDate,
	resolveZone,
	toOffsetIso,
} from '@ilamy/calendar'
import { h } from 'preact'
import { mountPreactSlot } from '../../../../lib/renderer/utils/preact-slot.utils'
import { AgendaView } from '../components/agenda-view'
import { type AgendaWindow, windowRange, windowStep } from './agenda-window'

export interface AgendaViewOptions {
	window?: AgendaWindow
}

const LONG_DATE: Intl.DateTimeFormatOptions = {
	weekday: 'short',
	month: 'short',
	day: 'numeric',
	year: 'numeric',
}

const COMPACT_DATE: Intl.DateTimeFormatOptions = {
	month: 'short',
	day: 'numeric',
	year: 'numeric',
}

const formatAgendaHeaderTitle = (
	dateIso: string,
	window: AgendaWindow,
	firstDayOfWeek: number,
	timezone: string | undefined,
	locale: string
): string => {
	const zone = resolveZone(timezone)
	const current = parseDate(dateIso, zone) ?? now(zone)
	if (window === 'day') {
		return formatDate(current, LONG_DATE, locale)
	}
	if (window === 'month') {
		return formatDate(current, { month: 'short', year: 'numeric' }, locale)
	}
	if (typeof window === 'number') {
		const { start, end } = windowRange(current, window, firstDayOfWeek)
		return formatDateRange(start, end, COMPACT_DATE, locale)
	}
	const days = getWeekDays(current, firstDayOfWeek)
	const start = days.at(0) ?? current
	const end = days.at(-1) ?? current
	return formatDateRange(start, end, COMPACT_DATE, locale)
}

export const createAgendaView = ({
	window = 'month',
}: AgendaViewOptions = {}): CalendarPluginView => ({
	name: 'agenda',
	label: 'agenda',
	navigationStep: windowStep(window),
	supportsResources: false,
	range: (dateIso, config) => {
		const zone = resolveZone(config.timezone)
		const zoned = parseDate(dateIso, zone) ?? now(zone)
		const { start, end } = windowRange(zoned, window, config.firstDayOfWeek)
		return { start: toOffsetIso(start), end: toOffsetIso(end) }
	},
	headerTitle: (dateIso, config) =>
		formatAgendaHeaderTitle(
			dateIso,
			window,
			config.firstDayOfWeek,
			config.timezone,
			config.locale ?? 'en-US'
		),
	mountView: {
		mount: (host, initialContext) =>
			mountPreactSlot<PluginViewContext>(
				host,
				(ctx) => h(AgendaView, { context: ctx, window }),
				initialContext
			),
	},
})
