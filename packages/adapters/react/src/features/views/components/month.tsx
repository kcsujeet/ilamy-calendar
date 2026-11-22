import {
	getMonthDays,
	getMonthGridRange,
	getMonthWeeks,
	withoutHiddenDays,
} from '@ilamy/core'
import type {
	HorizontalRowSpec,
	IsoDateString,
	PluginView,
	Resource,
	VerticalColumnSpec,
	ViewConfig,
} from '@ilamy/types'
import {
	now,
	parseDate,
	resolveZone,
	toOffsetIso,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import { Grid3x3 } from 'lucide-react'
import type React from 'react'
import { gutterColumn } from '@/features/views/components/vertical-grid/gutter'
import { keys } from '@/utils/keys.utils'
import { viewHasResourceAxis } from '@/utils/resource-list.utils'
import { DayHeaderLabel } from './day-header-label'
import { MonthHeader } from './month-header'
import {
	ResourceColumnsHeader,
	ResourcesCornerCell,
	resolveResourceLayout,
	resourceHorizontalRows,
	resourceVerticalColumns,
} from './resource-axis'

const parseViewDate = (
	dateIso: IsoDateString,
	timezone?: string
): ZonedDate => {
	const zone = resolveZone(timezone)
	return parseDate(dateIso, zone) ?? now(zone)
}

const resourceMonthVerticalColumns = (
	date: ZonedDate,
	resources: Resource[],
	hiddenDays: Set<number> | undefined,
	timezone?: string
): VerticalColumnSpec[] => {
	const daysInMonth = withoutHiddenDays(getMonthDays(date), hiddenDays)
	const dayIsos = daysInMonth.map(toOffsetIso)
	const zone = resolveZone(timezone)
	return resourceVerticalColumns({
		resources,
		gutter: gutterColumn({
			days: dayIsos,
			gridType: 'day',
			timezone,
			renderLabel: (dayIso: IsoDateString) => {
				const parsed = parseDate(dayIso, zone)
				if (!parsed) {
					return null
				}
				return (
					<DayHeaderLabel animated className="flex-col-reverse" day={parsed} />
				)
			},
		}),
		columnsFor: (resource) => ({
			id: keys.col.resource('month', resource.id),
			day: undefined,
			days: dayIsos,
			gridType: 'day' as const,
		}),
	})
}

const ResourceMonthHorizontalHeader: React.FC<{
	date: ZonedDate
	hiddenDays: Set<number> | undefined
}> = ({ date, hiddenDays }) => {
	const monthDays = withoutHiddenDays(getMonthDays(date), hiddenDays)

	return (
		<>
			<ResourcesCornerCell />
			<div className="flex flex-1 gap-px bg-border border-b">
				{monthDays.map((day, index) => {
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
	dateIso: IsoDateString,
	config: ViewConfig
): VerticalColumnSpec[] | HorizontalRowSpec[] => {
	const date = parseViewDate(dateIso, config.timezone)
	const resourceLayout = resolveResourceLayout(config, {
		vertical: (resources) =>
			resourceMonthVerticalColumns(
				date,
				resources,
				config.hiddenDays,
				config.timezone
			),
		horizontal: (resources) =>
			resourceHorizontalRows({
				resources,
				days: withoutHiddenDays(getMonthDays(date), config.hiddenDays),
				gridType: 'day',
			}),
	})
	if (resourceLayout) {
		return resourceLayout
	}

	return getMonthWeeks(date, config.firstDayOfWeek).map((days, weekIndex) => ({
		id: keys.listKey('week', weekIndex),
		columns: withoutHiddenDays(days, config.hiddenDays).map((day) => ({
			id: keys.col.day(day),
			day: toOffsetIso(day),
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
	range: (dateIso, config) => {
		const zoned = parseViewDate(dateIso, config.timezone)
		const { start, end } = getMonthGridRange(
			zoned,
			config.firstDayOfWeek,
			config.hiddenDays
		)
		return { start: toOffsetIso(start), end: toOffsetIso(end) }
	},
	columns: monthRows,
	renderHeader: ({ date: dateIso, config }) => {
		const date = parseViewDate(dateIso, config.timezone)
		const resources = config.resources ?? []
		if (!viewHasResourceAxis(config)) {
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
