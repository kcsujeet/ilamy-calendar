import type {
	Dayjs,
	HorizontalRowSpec,
	PluginView,
	Resource,
	VerticalColumnSpec,
	ViewConfig,
} from '@ilamy/types'
import { Grid3x3 } from 'lucide-react'
import type React from 'react'
import { gutterColumn } from '@/features/calendar/components/vertical-grid/gutter'
import { keys } from '@/features/calendar/utils/keys'
import {
	getMonthDays,
	getMonthGridRange,
	getMonthWeeks,
	withoutHiddenDays,
} from '@/utils/date-utils'
import { DayHeaderLabel } from './day-header-label'
import { MonthHeader } from './month-header'
import {
	ResourceColumnsHeader,
	ResourcesCornerCell,
	resourceHorizontalRows,
	resourceVerticalColumns,
} from './resource-axis'

const resourceMonthVerticalColumns = (
	date: Dayjs,
	resources: Resource[],
	hiddenDays: Set<number> | undefined
): VerticalColumnSpec[] => {
	const daysInMonth = withoutHiddenDays(getMonthDays(date), hiddenDays)
	return resourceVerticalColumns({
		resources,
		gutter: gutterColumn({
			days: daysInMonth,
			gridType: 'day',
			renderLabel: (day: Dayjs) => (
				<DayHeaderLabel animated className="flex-col-reverse" day={day} />
			),
		}),
		columnsFor: (resource) => ({
			id: keys.col.resource('month', resource.id),
			day: undefined,
			days: daysInMonth,
			gridType: 'day' as const,
		}),
	})
}

const ResourceMonthHorizontalHeader: React.FC<{
	date: Dayjs
	hiddenDays: Set<number> | undefined
}> = ({ date, hiddenDays }) => {
	const monthDays = withoutHiddenDays(getMonthDays(date), hiddenDays)

	return (
		<>
			<ResourcesCornerCell />
			<div className="flex flex-1 gap-px bg-border border-b">
				{monthDays.map((day, index) => {
					// Keyed by position, not by date. Most columns head the same day
					// number from one month to the next, and those should sit still.
					const key = keys.listKey('resource-month-day', index)

					return (
						<div
							className="flex-1 w-20 bg-background shrink-0 flex items-center justify-center flex-col"
							key={key}
						>
							<DayHeaderLabel animated className="flex-col-reverse" day={day} />
						</div>
					)
				})}
			</div>
		</>
	)
}

const monthRows = (
	date: Dayjs,
	config: ViewConfig
): VerticalColumnSpec[] | HorizontalRowSpec[] => {
	const resources = config.resources ?? []

	if (resources.length) {
		if (config.orientation === 'vertical') {
			return resourceMonthVerticalColumns(date, resources, config.hiddenDays)
		}
		return resourceHorizontalRows({
			resources,
			days: withoutHiddenDays(getMonthDays(date), config.hiddenDays),
			gridType: 'day',
		})
	}

	return getMonthWeeks(date, config.firstDayOfWeek).map((days, weekIndex) => ({
		id: keys.listKey('week', weekIndex),
		columns: withoutHiddenDays(days, config.hiddenDays).map((day) => ({
			id: keys.col.day(day),
			day,
			className: 'w-auto',
			gridType: 'day' as const,
		})),
		className: 'flex-1',
		showDayNumber: true,
		showWeekNumber: true,
	}))
}

export const monthView: PluginView = {
	name: 'month',
	label: 'month',
	icon: Grid3x3,
	navigationUnit: 'month',
	layout: 'horizontal',
	supportsResources: true,
	range: (date, config) => getMonthGridRange(date, config.firstDayOfWeek),
	columns: monthRows,
	renderHeader: ({ date, config }) => {
		const resources = config.resources ?? []
		if (!resources.length) {
			return <MonthHeader className="h-12" />
		}
		if (config.orientation === 'vertical') {
			return <ResourceColumnsHeader resources={resources} />
		}
		return (
			<ResourceMonthHorizontalHeader
				date={date}
				hiddenDays={config.hiddenDays}
			/>
		)
	},
}
