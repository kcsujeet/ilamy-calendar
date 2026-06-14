import type { PluginView } from '@ilamy/types'
import { Grid2x2 } from 'lucide-react'
import { YearView } from '../year-view/year-view'

// The 12-mini-calendar layout fits neither shared engine, so the year view is
// the canonical `component` escape hatch: no `columns`/`layout`, full custom
// rendering — but range/navigation/label resolve through the one contract.
export const yearView: PluginView = {
	name: 'year',
	label: 'year',
	icon: Grid2x2,
	navigationUnit: 'year',
	// The year view does not compose the resource axis, so the switcher hides
	// it on resource calendars.
	supportsResources: false,
	range: (date) => ({ start: date.startOf('year'), end: date.endOf('year') }),
	component: YearView,
}
