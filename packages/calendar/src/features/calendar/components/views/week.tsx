import type {
	Dayjs,
	HorizontalRowSpec,
	PluginView,
	Resource,
	VerticalColumnSpec,
	ViewConfig,
} from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import { Columns3 } from 'lucide-react'
import type React from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import {
	gutterColumn,
	RESPONSIVE_GUTTER_WIDTH,
	STICKY_GUTTER_SHADOW,
} from '@/features/calendar/components/vertical-grid/gutter'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { keys } from '@/features/calendar/utils/keys'
import { viewHasResourceAxis } from '@/features/calendar/utils/resource-list'
import {
	collectResourceBusinessHours,
	getViewHours,
} from '@/features/calendar/utils/view-hours'
import { getWeekNumber } from '@/features/calendar/utils/week-number'
import { getWeekDays, isToday, withoutHiddenDays } from '@/utils/date-utils'
import { DayHeaderLabel } from './day-header-label'
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

const getVisibleDays = (date: Dayjs, config: ViewConfig): Dayjs[] => {
	const weekDays = getWeekDays(date, config.firstDayOfWeek)
	return withoutHiddenDays(weekDays, config.hiddenDays)
}

const isHourlyGranularity = (config: ViewConfig): boolean =>
	(config.weekViewGranularity ?? 'hourly') === 'hourly'

const WeekViewHeader: React.FC<{ date: Dayjs; config: ViewConfig }> = ({
	date,
	config,
}) => {
	const { t, selectDate, openEventForm, weekNumbers, weekNumberCalculation } =
		useSmartCalendarContext((c) => ({
			t: c.t,
			selectDate: c.selectDate,
			openEventForm: c.openEventForm,
			weekNumbers: c.weekNumbers,
			weekNumberCalculation: c.weekNumberCalculation,
		}))
	const visibleDays = getVisibleDays(date, config)
	const showsWeekNumber = weekNumbers !== false
	const weekNumber = String(getWeekNumber(date, weekNumberCalculation))

	return (
		<div
			className={'flex h-18 flex-1 gap-px bg-border'}
			data-testid="week-view-header"
		>
			{/* Corner cell with week number — mirrors the responsive gutter width. */}
			<div
				className={cn(
					RESPONSIVE_GUTTER_WIDTH,
					'h-full shrink-0 items-center justify-center bg-background p-2 flex',
					STICKY_GUTTER_SHADOW
				)}
			>
				{showsWeekNumber && (
					<div className="flex flex-col items-center justify-center min-w-0 w-full">
						<span className="text-muted-foreground text-xs truncate w-full text-center">
							{t('week')}
						</span>
						{/* Same rule as the day numbers beside it: the word stays put and
						    the number animates, so the fade plays on the one part that
						    moved. */}
						<AnimatedSection
							className="font-medium truncate w-full text-center"
							data-testid="week-number"
							transitionKey={weekNumber}
						>
							{weekNumber}
						</AnimatedSection>
					</div>
				)}
			</div>

			{/* Day header cells */}
			{visibleDays.map((day, index) => {
				// A column heads the same weekday in every week, so the cell is
				// keyed by its position. Keying it by the date remounted the whole
				// label on every navigation, replaying the fade over a weekday
				// that had not changed; only the number moves, and it animates
				// itself (see AnimatedDayLabel).
				const key = keys.listKey('week-header-day', index)

				return (
					// biome-ignore lint/a11y/noStaticElementInteractions: day header is clickable, unchanged behavior
					// biome-ignore lint/a11y/useKeyWithClickEvents: keyboard access is handled by the day cells
					<div
						className={cn(
							'hover:bg-accent bg-background flex-1 min-w-0 flex flex-col justify-center cursor-pointer p-1 text-center sm:p-2 w-20 h-full'
						)}
						data-testid={keys.header.weekday('week', day.format('dddd'))}
						key={key}
						onClick={() => {
							selectDate(day)
							openEventForm({ start: day })
						}}
					>
						<DayHeaderLabel animated day={day} />
					</div>
				)
			})}
		</div>
	)
}

/**
 * The hour rows of one day. The caller collects the resources' business hours
 * ONCE per render and passes them in: collecting them here would walk every
 * resource for every day of every resource column.
 */
const weekHoursFor = (
	day: Dayjs,
	config: ViewConfig,
	resourceBusinessHours: ReturnType<typeof collectResourceBusinessHours>,
	allDates?: Dayjs[]
): Dayjs[] =>
	getViewHours({
		referenceDate: day,
		businessHours: config.businessHours,
		hideNonBusinessHours: config.hideNonBusinessHours,
		slotMinTime: config.slotMinTime,
		slotMaxTime: config.slotMaxTime,
		allDates,
		resourceBusinessHours,
	})

const resourceWeekVerticalColumns = (
	date: Dayjs,
	config: ViewConfig,
	resources: Resource[]
): VerticalColumnSpec[] => {
	const weekDays = getWeekDays(date, config.firstDayOfWeek)
	const visibleDays = getVisibleDays(date, config)

	if (isHourlyGranularity(config)) {
		const isTodayVisible = visibleDays.some((day) => isToday(day))
		const resourceBusinessHours = collectResourceBusinessHours(resources)
		// One hour list per visible day, shared by every resource's column.
		const hoursOfVisibleDays = visibleDays.map((day) =>
			weekHoursFor(day, config, resourceBusinessHours, weekDays)
		)
		return resourceVerticalColumns({
			resources,
			gutter: gutterColumn({
				days: weekHoursFor(date, config, resourceBusinessHours, weekDays),
				gridType: 'hour',
				showsToday: isTodayVisible,
			}),
			columnsFor: (resource) =>
				visibleDays.map((day, dayIndex) => ({
					id: keys.col.day(day, resource.id),
					className: RESOURCE_CELL_WIDTH,
					day,
					days: hoursOfVisibleDays[dayIndex],
					gridType: 'hour' as const,
				})),
		})
	}

	return resourceVerticalColumns({
		resources,
		gutter: gutterColumn({
			days: visibleDays,
			gridType: 'day',
			renderLabel: (day: Dayjs) => (
				<DayHeaderLabel animated={false} day={day} />
			),
		}),
		columnsFor: (resource) => ({
			id: keys.col.resource('week', resource.id),
			className: RESOURCE_CELL_WIDTH,
			day: undefined,
			days: visibleDays,
			gridType: 'day' as const,
		}),
	})
}

const resourceWeekHorizontalRows = (
	date: Dayjs,
	config: ViewConfig,
	resources: Resource[]
): HorizontalRowSpec[] => {
	const visibleDays = getVisibleDays(date, config)

	if (isHourlyGranularity(config)) {
		const resourceBusinessHours = collectResourceBusinessHours(resources)
		const weekHours = visibleDays.map((day) =>
			weekHoursFor(day, config, resourceBusinessHours)
		)
		return resourceHorizontalRows({
			resources,
			days: weekHours,
			gridType: 'hour',
			cellClassName: RESOURCE_CELL_WIDTH,
		})
	}

	return resourceHorizontalRows({
		resources,
		days: visibleDays,
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
	const visibleDays = getVisibleDays(date, config)
	const isHourly = isHourlyGranularity(config)
	const resourceBusinessHours = collectResourceBusinessHours(resources)
	const hoursOfVisibleDays = visibleDays.flatMap((day) =>
		weekHoursFor(day, config, resourceBusinessHours)
	)
	const weekHours = isHourly ? hoursOfVisibleDays : []

	return (
		<>
			<ResourcesCornerCell />
			<div className="flex-1 flex flex-col">
				<ResourceWeekHorizontalDayHeader days={visibleDays} />
				{isHourly && <TimeHeaderRow hours={weekHours} view="week" />}
			</div>
		</>
	)
}

const weekColumns = (
	date: Dayjs,
	config: ViewConfig
): VerticalColumnSpec[] | HorizontalRowSpec[] => {
	const resources = config.resources ?? []

	if (viewHasResourceAxis(config)) {
		if (config.orientation === 'vertical') {
			return resourceWeekVerticalColumns(date, config, resources)
		}
		return resourceWeekHorizontalRows(date, config, resources)
	}

	const weekDays = getWeekDays(date, config.firstDayOfWeek)
	const visibleDays = getVisibleDays(date, config)
	const isTodayVisible = visibleDays.some((day) => isToday(day))
	// This branch has no resources, so there are no resource business hours.
	const noResourceBusinessHours = collectResourceBusinessHours([])

	return [
		gutterColumn({
			days: weekHoursFor(date, config, noResourceBusinessHours, weekDays),
			gridType: 'hour',
			widthClassName: RESPONSIVE_GUTTER_WIDTH,
			showsToday: isTodayVisible,
		}),
		// Each day column gets its own hours on the correct date.
		...visibleDays.map((day) => ({
			id: keys.col.day(day),
			day,
			days: weekHoursFor(day, config, noResourceBusinessHours, weekDays),
			className: 'flex-1 min-w-0',
			gridType: 'hour' as const,
		})),
	]
}

export const weekView: PluginView = {
	name: 'week',
	label: 'week',
	icon: Columns3,
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
		if (!viewHasResourceAxis(config)) {
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
