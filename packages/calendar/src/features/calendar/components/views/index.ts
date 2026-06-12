import type { PluginView } from '@ilamy/types'
import { dayView } from './day'
import { monthView } from './month'
import { weekView } from './week'
import { yearView } from './year'

export { DayView } from './day'
export { MonthView } from './month'
export { ViewRenderer } from './view-renderer'
export { WeekView } from './week'

/** The core's own views, resolved exactly like plugin views (prepended first). */
export const builtInViews: PluginView[] = [
	dayView,
	weekView,
	monthView,
	yearView,
]
