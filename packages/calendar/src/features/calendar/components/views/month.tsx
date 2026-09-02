import type {
	Dayjs,
	HorizontalRowSpec,
	PluginView,
	Resource,
	VerticalColumnSpec,
	ViewConfig,
} from '@ilamy/types'
import { DayLabel } from '@ilamy/ui/components/day-label'
import { Grid3x3 } from 'lucide-react'
import type React from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { gutterColumn } from '@/components/vertical-grid/gutter'
import {
	getMonthDays,
	getMonthGridRange,
	getMonthWeeks,
	isToday,
} from '@/lib/utils/date-utils'
import { keys } from '@/lib/utils/keys'
import { MonthHeader } from './month-header'
import {
	ResourceColumnsHeader,
	ResourcesCornerCell,
	resourceHorizontalRows,
	resourceVerticalColumns,
} from './resource-axis'

const resourceMonthVerticalColumns = (
	date: Dayjs,
	resources: Resource[]
): VerticalColumnSpec[] => {
	const daysInMonth = getMonthDays(date)
	return resourceVerticalColumns({
		resources,
		gutter: gutterColumn({
			days: daysInMonth,
			gridType: 'day',
			renderLabel: (day: Dayjs) => (
				<DayLabel
					className="flex-col-reverse"
					dayNumber={day.format('D')}
					today={isToday(day)}
					weekday={day.format('ddd')}
				/>
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

const ResourceMonthHorizontalHeader: React.FC<{ date: Dayjs }> = ({ date }) => {
	const monthDays = getMonthDays(date)

	return (
		<>
			<ResourcesCornerCell />
			<div className="flex flex-1 gap-px bg-border border-b">
				{monthDays.map((day, index) => {
					const key = keys.header.resource.monthDay(day)
					const today = isToday(day)

					return (
						<div
							className="flex-1 w-20 bg-background shrink-0 flex items-center justify-center flex-col"
							key={key}
						>
							<AnimatedSection transitionKey={key}>
								<DayLabel
									className="flex-col-reverse"
									dayNumber={day.format('D')}
									today={today}
									weekday={day.format('ddd')}
								/>
							</AnimatedSection>
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
			return resourceMonthVerticalColumns(date, resources)
		}
		return resourceHorizontalRows({
			resources,
			days: getMonthDays(date),
			gridType: 'day',
		})
	}

	return getMonthWeeks(date, config.firstDayOfWeek).map((days, weekIndex) => ({
		id: keys.listKey('week', weekIndex),
		columns: days.map((day) => ({
			id: keys.col.day(day),
			day,
			className: 'w-auto',
			gridType: 'day' as const,
			// The grid runs whole weeks, so the first and last rows reach into
			// the neighbouring months. Those days are context, not part of the
			// month being edited — the only place in the calendar where that is
			// true, and the reason this flag exists.
			outsidePeriod: day.month() !== date.month(),
		})),
		className: 'flex-1',
		showDayNumber: true,
	}))
}

export const monthView: PluginView = {
	name: 'month',
	label: 'month',
	icon: Grid3x3,
	navigationUnit: 'month',
	// What the month grid has always done with its padding. Consumers who want
	// those days bookable, or want them to page into the neighbouring month,
	// override it with the calendar's `outsidePeriodBehavior`.
	outsidePeriodBehavior: 'disabled',
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
		return <ResourceMonthHorizontalHeader date={date} />
	},
}
