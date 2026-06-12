import type { PluginView } from '@ilamy/types'
import { YearView } from '../year-view/year-view'

// The 12-mini-calendar layout fits neither shared engine, so the year view is
// the canonical `component` escape hatch: no `columns`/`layout`, full custom
// rendering — but range/navigation/label resolve through the one contract.
export const yearView: PluginView = {
	name: 'year',
	label: 'year',
	navigationUnit: 'year',
	// Stays false in Phase 4 too: the switcher keeps hiding year on resource
	// calendars (generalizes today's hardcoded year-view suppression).
	supportsResources: false,
	range: (date) => ({ start: date.startOf('year'), end: date.endOf('year') }),
	component: YearView,
}
