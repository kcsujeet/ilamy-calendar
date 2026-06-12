import type {
	Dayjs,
	HorizontalRowSpec,
	PluginView,
	Resource,
	VerticalColumnSpec,
	ViewConfig,
} from '@ilamy/types'
import type React from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { gutterColumn } from '@/components/vertical-grid/gutter'
import { HEADER_STAGGER_DELAY } from '@/lib/constants'
import {
	getMonthDays,
	getMonthGridRange,
	getMonthWeeks,
} from '@/lib/utils/date-utils'
import { keys } from '@/lib/utils/keys'
import { MonthHeader } from './month-header'
import {
	ResourceColumnsHeader,
	ResourcesCornerCell,
	resourceHorizontalRows,
	resourceVerticalColumns,
} from './resource-axis'
import { ViewRenderer } from './view-renderer'

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
				<>
					<span>{day.format('D')}</span>
					<span>{day.format('ddd')}</span>
				</>
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
			{monthDays.map((day, index) => {
				const key = keys.header.resource.monthDay(day)

				return (
					<AnimatedSection
						className="w-20 border-b border-r shrink-0 flex items-center justify-center flex-col"
						delay={index * HEADER_STAGGER_DELAY}
						key={keys.listKey(key, 'animated')}
						transitionKey={keys.listKey(key, 'motion')}
					>
						<div className="text-xs font-medium">{day.format('D')}</div>
						<div className="text-xs text-muted-foreground">
							{day.format('ddd')}
						</div>
					</AnimatedSection>
				)
			})}
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
		})),
		className: 'flex-1',
		showDayNumber: true,
	}))
}

export const MonthView: React.FC = () => <ViewRenderer view={monthView} />

export const monthView: PluginView = {
	name: 'month',
	label: 'month',
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
		return <ResourceMonthHorizontalHeader date={date} />
	},
}
