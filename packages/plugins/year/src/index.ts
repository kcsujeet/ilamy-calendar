import type { IlamyPlugin } from '@ilamy/calendar'
import {
	createYearView,
	type YearPluginOptions,
	yearView,
} from './create-year-view'

export { YearView } from './year-view'
export { createYearView, type YearPluginOptions, yearView }

/**
 * Adds the 12-month year overview view to `<IlamyCalendar>`.
 * Pass via `plugins={[yearPlugin()]}`.
 */
export const yearPlugin = (options?: YearPluginOptions): IlamyPlugin => ({
	name: 'year',
	views: [createYearView(options)],
})
