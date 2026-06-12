import type {
	Dayjs,
	HorizontalRowSpec,
	PluginView,
	ViewConfig,
} from '@ilamy/types'
import type React from 'react'
import { getMonthGridRange, getMonthWeeks } from '@/lib/utils/date-utils'
import { keys } from '@/lib/utils/keys'
import { MonthHeader } from './month-header'
import { ViewRenderer } from './view-renderer'

const monthRows = (date: Dayjs, config: ViewConfig): HorizontalRowSpec[] =>
	getMonthWeeks(date, config.firstDayOfWeek).map((days, weekIndex) => ({
		id: keys.listKey('week', weekIndex),
		columns: days.map((day) => ({
			id: keys.col.day(day),
			day,
			className: 'w-auto',
			gridType: 'day' as const,
		})),
		className: 'flex-1',
		showDayNumber: true,
	}))

export const MonthView: React.FC = () => <ViewRenderer view={monthView} />

export const monthView: PluginView = {
	name: 'month',
	label: 'month',
	navigationUnit: 'month',
	layout: 'horizontal',
	// Phase 4 flips this when the built-ins compose the resource axis.
	supportsResources: false,
	range: (date, config) => getMonthGridRange(date, config.firstDayOfWeek),
	columns: monthRows,
	renderHeader: () => <MonthHeader className="h-12" />,
	component: MonthView,
}
