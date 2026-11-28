import type { CalendarPlugin } from '@ilamy/calendar'
import { createYearView, type YearPluginOptions } from './create-year-view'

export {
	createYearView,
	type YearPluginOptions,
	yearView,
} from './create-year-view'

/**
 * Adds the 12-month year overview view to `@ilamy/calendar`.
 * Pass via `plugins={[yearPlugin()]}`.
 */
export const yearPlugin = (options?: YearPluginOptions): CalendarPlugin => ({
	name: 'year',
	views: [createYearView(options)],
})
