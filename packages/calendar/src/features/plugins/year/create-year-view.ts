import {
	type CalendarPluginView,
	endOf,
	formatDate,
	now,
	type PluginViewContext,
	parseDate,
	resolveZone,
	startOf,
	toOffsetIso,
} from '@ilamy/calendar'
import { h } from 'preact'
import { mountPreactSlot } from '../../../lib/renderer/utils/preact-slot.utils'
import { YearView } from './year-view'

export interface YearPluginOptions {
	/** Custom translation key or label for the view switcher. Defaults to `'year'`. */
	label?: string
}

/** Builds the year `CalendarPluginView` spec. */
export const createYearView = (
	options: YearPluginOptions = {}
): CalendarPluginView => ({
	name: 'year',
	label: options.label ?? 'year',
	navigationUnit: 'year',
	supportsResources: false,
	range: (dateIso, config) => {
		const zone = resolveZone(config.timezone)
		const zoned = parseDate(dateIso, zone) ?? now(zone)
		return {
			start: toOffsetIso(startOf(zoned, 'year')),
			end: toOffsetIso(endOf(zoned, 'year')),
		}
	},
	headerTitle: (dateIso, config) => {
		const zone = resolveZone(config.timezone)
		const zoned = parseDate(dateIso, zone) ?? now(zone)
		return formatDate(zoned, { year: 'numeric' }, config.locale ?? 'en-US')
	},
	mountView: {
		mount: (host, initialContext) =>
			mountPreactSlot<PluginViewContext>(
				host,
				(ctx) => h(YearView, { context: ctx }),
				initialContext
			),
	},
})

/** Default year view specification. */
export const yearView: CalendarPluginView = createYearView()
