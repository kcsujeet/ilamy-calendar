import type { IlamyPlugin } from '@ilamy/calendar/react'
import { createYearView, type YearPluginOptions } from './create-year-view'

export {
	createYearView,
	type YearPluginOptions,
	yearView,
} from './create-year-view'
export { YearView } from './year-view'

/**
 * Adds the 12-month year overview view to `<IlamyCalendar>`.
 * Pass via `plugins={[yearPlugin()]}`.
 */
export const yearPlugin = (options?: YearPluginOptions): IlamyPlugin => ({
	name: 'year',
	views: [createYearView(options)],
})
