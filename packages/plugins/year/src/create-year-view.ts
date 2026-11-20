import type { PluginView } from '@ilamy/calendar'
import {
	endOf,
	now,
	parseDate,
	resolveZone,
	startOf,
	toOffsetIso,
} from '@ilamy/utils/temporal'
import { Grid2x2 } from 'lucide-react'
import { YearView } from './year-view'

export interface YearPluginOptions {
	/** Custom translation key or label for the view switcher. Defaults to `'year'`. */
	label?: string
}

/** Builds the year `PluginView` spec. */
export const createYearView = (
	options: YearPluginOptions = {}
): PluginView => ({
	name: 'year',
	label: options.label ?? 'year',
	icon: Grid2x2,
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
	component: YearView,
})

/** Default year view specification. */
export const yearView: PluginView = createYearView()
