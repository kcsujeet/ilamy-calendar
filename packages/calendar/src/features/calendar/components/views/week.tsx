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
import {
	gutterColumn,
	RESPONSIVE_GUTTER_WIDTH,
} from '@/components/vertical-grid/gutter'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import {
	collectResourceBusinessHours,
	getViewHours,
} from '@/features/calendar/utils/view-hours'
import { HEADER_STAGGER_DELAY, HOUR_STAGGER_DELAY } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { getWeekDays, isToday } from '@/lib/utils/date-utils'
import { keys } from '@/lib/utils/keys'
import {
	RESOURCE_CELL_WIDTH,
	ResourcesCornerCell,
	resourceHorizontalRows,
	resourceVerticalColumns,
} from './resource-axis'
import { ResourceWeekHorizontalDayHeader } from './resource-week-horizontal-day-header'
import { ResourceWeekVerticalDayHeader } from './resource-week-vertical-day-header'
import { ResourceWeekVerticalResourceHeader } from './resource-week-vertical-resource-header'
import { TimeHeaderRow } from './time-header-row'
import { ViewRenderer } from './view-renderer'

const getVisibleDays = (date: Dayjs, config: ViewConfig): Dayjs[] => {
	const weekDays = getWeekDays(date, config.firstDayOfWeek)
	const { hiddenDays } = config
	if (!hiddenDays) return weekDays
	return weekDays.filter((day) => !hiddenDays.has(day.day()))
}

const isHourlyGranularity = (config: ViewConfig): boolean =>
	(config.weekViewGranularity ?? 'hourly') === 'hourly'

const WeekViewHeader: React.FC<{ date: Dayjs; config: ViewConfig }> = ({
	date,
	config,
}) => {
	const { t, selectDate, openEventForm } = useSmartCalendarContext((c) => ({
		t: c.t,
		selectDate: c.selectDate,
		openEventForm: c.openEventForm,
	}))
	const visibleDays = getVisibleDays(date, config)

	return (
		<div className={'flex h-18 flex-1'} data-testid="week-view-header">
			{/* Corner cell with week number — mirrors the responsive gutter width. */}
			<div
				className={cn(
					RESPONSIVE_GUTTER_WIDTH,
					'h-full shrink-0 items-center justify-center border-r p-2 flex'
				)}
			>
				<div className="flex flex-col items-center justify-center min-w-0 w-full">
					<span className="text-muted-foreground text-xs truncate w-full text-center">
						{t('week')}
					</span>
					<span className="font-medium truncate w-full text-center">
						{date.week()}
					</span>
				</div>
			</div>

			{/* Day header cells */}
			{visibleDays.map((day, index) => {
				const today = isToday(day)
				const key = keys.header.week.day(day)

				return (
					<AnimatedSection
						className={cn(
							'hover:bg-accent flex-1 min-w-0 flex flex-col justify-center cursor-pointer p-1 text-center sm:p-2 border-r last:border-r-0 w-20 h-full',
							today && 'bg-primary/10 font-bold'
						)}
						data-testid={keys.header.weekday('week', day.format('dddd'))}
						delay={index * HEADER_STAGGER_DELAY}
						key={key}
						onClick={() => {
							selectDate(day)
							openEventForm({ start: day })
						}}
						transitionKey={key}
					>
						<div className="text-xs sm:text-sm truncate w-full">
							{day.format('ddd')}
						</div>
						<div
							className={cn(
								'mx-auto mt-1 flex h-6 w-6 items-center justify-center rounded-full text-xs',
								today && 'bg-primary text-primary-foreground'
							)}
						>
							{day.format('D')}
						</div>
					</AnimatedSection>
				)
			})}
		</div>
	)
}

const weekHoursFor = (
	day: Dayjs,
	config: ViewConfig,
	allDates?: Dayjs[]
): Dayjs[] =>
	getViewHours({
		referenceDate: day,
		businessHours: config.businessHours,
		hideNonBusinessHours: config.hideNonBusinessHours,
		allDates,
		resourceBusinessHours: collectResourceBusinessHours(config.resources ?? []),
	})

const resourceWeekVerticalColumns = (
	date: Dayjs,
	config: ViewConfig,
	resources: Resource[]
): VerticalColumnSpec[] => {
	const weekDays = getWeekDays(date, config.firstDayOfWeek)

	if (isHourlyGranularity(config)) {
		const visibleDays = getVisibleDays(date, config)
		return resourceVerticalColumns({
			resources,
			gutter: gutterColumn({
				days: weekHoursFor(date, config, weekDays),
				gridType: 'hour',
			}),
			columnsFor: (resource) =>
				visibleDays.map((day) => ({
					id: keys.col.day(day, resource.id),
					className: RESOURCE_CELL_WIDTH,
					day,
					days: weekHoursFor(day, config, weekDays),
					gridType: 'hour' as const,
				})),
		})
	}

	// Uses `weekDays` (all 7) intentionally, not `visibleDays`. Non-contiguous
	// visible days would break multi-day event positioning, so `hiddenDays` is
	// not supported in daily granularity.
	return resourceVerticalColumns({
		resources,
		gutter: gutterColumn({
			days: weekDays,
			gridType: 'day',
			renderLabel: (day: Dayjs) => (
				<>
					<span>{day.format('ddd')}</span>
					<span>{day.format('D')}</span>
				</>
			),
		}),
		columnsFor: (resource) => ({
			id: keys.col.resource('week', resource.id),
			className: RESOURCE_CELL_WIDTH,
			day: undefined,
			days: weekDays,
			gridType: 'day' as const,
		}),
	})
}

const resourceWeekHorizontalRows = (
	date: Dayjs,
	config: ViewConfig,
	resources: Resource[]
): HorizontalRowSpec[] => {
	const weekDays = getWeekDays(date, config.firstDayOfWeek)

	if (isHourlyGranularity(config)) {
		const weekHours = weekDays.map((day) => weekHoursFor(day, config))
		return resourceHorizontalRows({
			resources,
			days: weekHours,
			gridType: 'hour',
			cellClassName: RESOURCE_CELL_WIDTH,
		})
	}

	return resourceHorizontalRows({
		resources,
		days: weekDays,
		gridType: 'day',
		cellClassName: RESOURCE_CELL_WIDTH,
	})
}

const ResourceWeekVerticalHeader: React.FC<{
	date: Dayjs
	config: ViewConfig
	resources: Resource[]
}> = ({ date, config, resources }) => {
	const visibleDays = getVisibleDays(date, config)
	const isHourly = isHourlyGranularity(config)
	const dayHeaderColumns = isHourly
		? resources.flatMap((resource) =>
				visibleDays.map((day) => ({ day, resourceId: resource.id }))
			)
		: []

	return (
		<div className="flex-1 flex flex-col">
			<ResourceWeekVerticalResourceHeader resources={resources} />
			{isHourly && <ResourceWeekVerticalDayHeader columns={dayHeaderColumns} />}
		</div>
	)
}

const ResourceWeekHorizontalHeader: React.FC<{
	date: Dayjs
	config: ViewConfig
	resources: Resource[]
}> = ({ date, config, resources }) => {
	const weekDays = getWeekDays(date, config.firstDayOfWeek)
	const isHourly = isHourlyGranularity(config)
	const weekHours = isHourly
		? weekDays.flatMap((day) => weekHoursFor(day, config))
		: []

	return (
		<>
			<ResourcesCornerCell />
			<div className="flex-1 flex flex-col">
				<ResourceWeekHorizontalDayHeader days={weekDays} />
				{isHourly && (
					<TimeHeaderRow
						delayStep={HOUR_STAGGER_DELAY}
						hours={weekHours}
						view="week"
					/>
				)}
			</div>
		</>
	)
}

const weekColumns = (
	date: Dayjs,
	config: ViewConfig
): VerticalColumnSpec[] | HorizontalRowSpec[] => {
	const resources = config.resources ?? []

	if (resources.length) {
		if (config.orientation === 'vertical') {
			return resourceWeekVerticalColumns(date, config, resources)
		}
		return resourceWeekHorizontalRows(date, config, resources)
	}

	const weekDays = getWeekDays(date, config.firstDayOfWeek)
	const visibleDays = getVisibleDays(date, config)

	return [
		gutterColumn({
			days: weekHoursFor(date, config, weekDays),
			gridType: 'hour',
			widthClassName: RESPONSIVE_GUTTER_WIDTH,
		}),
		// Each day column gets its own hours on the correct date.
		...visibleDays.map((day) => ({
			id: keys.col.day(day),
			day,
			days: weekHoursFor(day, config, weekDays),
			className: 'flex-1 min-w-0',
			gridType: 'hour' as const,
		})),
	]
}

export const WeekView: React.FC = () => <ViewRenderer view={weekView} />

export const weekView: PluginView = {
	name: 'week',
	label: 'week',
	navigationUnit: 'week',
	layout: 'vertical',
	supportsResources: true,
	range: (date, config) => {
		const days = getWeekDays(date, config.firstDayOfWeek)
		const weekStart = days.at(0) ?? date
		const weekEnd = days.at(-1) ?? date
		return { start: weekStart.startOf('day'), end: weekEnd.endOf('day') }
	},
	columns: weekColumns,
	renderHeader: ({ date, config }) => {
		const resources = config.resources ?? []
		if (!resources.length) {
			return <WeekViewHeader config={config} date={date} />
		}
		if (config.orientation === 'vertical') {
			return (
				<ResourceWeekVerticalHeader
					config={config}
					date={date}
					resources={resources}
				/>
			)
		}
		return (
			<ResourceWeekHorizontalHeader
				config={config}
				date={date}
				resources={resources}
			/>
		)
	},
}
