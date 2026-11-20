import {
	collectResourceBusinessHours,
	getViewHours,
	getVisibleDateRange,
	getWeekDays,
	isToday,
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
import { cn } from '@ilamy/ui/lib/utils'
import {
	formatDate,
	getWeekNumber,
	now,
	parseDate,
	resolveZone,
	toOffsetIso,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import { Columns3 } from 'lucide-react'
import type React from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import {
	gutterColumn,
	RESPONSIVE_GUTTER_WIDTH,
	STICKY_GUTTER_SHADOW,
} from '@/features/calendar/components/vertical-grid/gutter'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { useSlotProps } from '@/features/calendar/stores/calendar-theme-context'
import type { WeekNumberCalculation } from '@/features/calendar/types'
import { keys } from '@/features/calendar/utils/keys'
import { viewHasResourceAxis } from '@/features/calendar/utils/resource-list'
import { DayHeaderLabel } from './day-header-label'
import {
	RESOURCE_CELL_WIDTH,
	ResourcesCornerCell,
	resolveResourceLayout,
	resourceHorizontalRows,
	resourceVerticalColumns,
} from './resource-axis'
import { ResourceWeekHorizontalDayHeader } from './resource-week-horizontal-day-header'
import { ResourceWeekVerticalDayHeader } from './resource-week-vertical-day-header'
import { ResourceWeekVerticalResourceHeader } from './resource-week-vertical-resource-header'
import { TimeHeaderRow } from './time-header-row'

const parseViewDate = (
	dateIso: IsoDateString,
	timezone?: string
): ZonedDate => {
	const zone = resolveZone(timezone)
	return parseDate(dateIso, zone) ?? now(zone)
}

const getVisibleDays = (date: ZonedDate, config: ViewConfig): ZonedDate[] => {
	const weekDays = getWeekDays(date, config.firstDayOfWeek)
	return withoutHiddenDays(weekDays, config.hiddenDays)
}

const getDrawnWeekNumber = (
	date: ZonedDate,
	config: ViewConfig,
	calculation: WeekNumberCalculation,
	locale?: string
): number => {
	const firstDrawnDay = getVisibleDays(date, config).at(0) ?? date
	return getWeekNumber(firstDrawnDay, calculation, locale)
}

const isHourlyGranularity = (config: ViewConfig): boolean =>
	(config.weekViewGranularity ?? 'hourly') === 'hourly'

const WeekViewHeader: React.FC<{ date: ZonedDate; config: ViewConfig }> = ({
	date,
	config,
}) => {
	const {
		t,
		selectDate,
		openEventForm,
		weekNumbers,
		weekNumberCalculation,
		currentLocale,
	} = useSmartCalendarContext((c) => ({
		t: c.t,
		selectDate: c.selectDate,
		openEventForm: c.openEventForm,
		weekNumbers: c.weekNumbers,
		weekNumberCalculation: c.weekNumberCalculation,
		currentLocale: c.currentLocale,
	}))
	const dayHeaderSlot = useSlotProps('dayHeader', {
		structuralClassName:
			'flex-1 min-w-0 flex flex-col justify-center cursor-pointer p-1 text-center sm:p-2 w-20 h-full',
		defaultClassName: 'hover:bg-accent bg-background',
	})
	const visibleDays = getVisibleDays(date, config)
	const showsWeekNumber = weekNumbers !== false
	const weekNumber = String(
		getDrawnWeekNumber(date, config, weekNumberCalculation, currentLocale)
	)

	return (
		<div
			className={'flex h-18 flex-1 gap-px bg-border'}
			data-testid="week-view-header"
		>
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

			{visibleDays.map((day, index) => {
				const key = keys.listKey('week-header-day', index)
				const dayIso = toOffsetIso(day)
				const englishWeekday = formatDate(day, { weekday: 'long' }, 'en')

				return (
					// biome-ignore lint/a11y/noStaticElementInteractions: day header is clickable, unchanged behavior
					// biome-ignore lint/a11y/useKeyWithClickEvents: keyboard access is handled by the day cells
					<div
						className={dayHeaderSlot.className}
						data-testid={keys.header.weekday('week', englishWeekday)}
						key={key}
						onClick={() => {
							selectDate(dayIso)
							openEventForm({ start: dayIso })
						}}
						style={dayHeaderSlot.style}
					>
						<DayHeaderLabel animated day={day} />
					</div>
				)
			})}
		</div>
	)
}

const weekHoursFor = (
	day: ZonedDate,
	config: ViewConfig,
	resourceBusinessHours: ReturnType<typeof collectResourceBusinessHours>,
	allDates?: ZonedDate[]
): ZonedDate[] =>
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
	date: ZonedDate,
	config: ViewConfig,
	resources: Resource[]
): VerticalColumnSpec[] => {
	const weekDays = getWeekDays(date, config.firstDayOfWeek)
	const visibleDays = getVisibleDays(date, config)

	if (isHourlyGranularity(config)) {
		const isTodayVisible = visibleDays.some((day) => isToday(day))
		const resourceBusinessHours = collectResourceBusinessHours(resources)
		const hoursOfVisibleDays = visibleDays.map((day) =>
			weekHoursFor(day, config, resourceBusinessHours, weekDays).map(
				toOffsetIso
			)
		)
		const gutterDays = weekHoursFor(
			date,
			config,
			resourceBusinessHours,
			weekDays
		).map(toOffsetIso)

		return resourceVerticalColumns({
			resources,
			gutter: gutterColumn({
				days: gutterDays,
				gridType: 'hour',
				timezone: config.timezone,
				showsToday: isTodayVisible,
			}),
			columnsFor: (resource) =>
				visibleDays.map((day, dayIndex) => ({
					id: keys.col.day(day, resource.id),
					className: RESOURCE_CELL_WIDTH,
					day: toOffsetIso(day),
					days: hoursOfVisibleDays.at(dayIndex) ?? [],
					gridType: 'hour' as const,
				})),
		})
	}

	const visibleDayIsos = visibleDays.map(toOffsetIso)
	const zone = resolveZone(config.timezone)

	return resourceVerticalColumns({
		resources,
		gutter: gutterColumn({
			days: visibleDayIsos,
			gridType: 'day',
			timezone: config.timezone,
			renderLabel: (dayIso: IsoDateString) => {
				const parsed = parseDate(dayIso, zone)
				return parsed ? <DayHeaderLabel animated={false} day={parsed} /> : null
			},
		}),
		columnsFor: (resource) => ({
			id: keys.col.resource('week', resource.id),
			className: RESOURCE_CELL_WIDTH,
			day: undefined,
			days: visibleDayIsos,
			gridType: 'day' as const,
		}),
	})
}

const resourceWeekHorizontalRows = (
	date: ZonedDate,
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
	date: ZonedDate
	config: ViewConfig
	resources: Resource[]
}> = ({ date, config, resources }) => {
	const { weekNumberCalculation, currentLocale } = useSmartCalendarContext(
		(c) => ({
			weekNumberCalculation: c.weekNumberCalculation,
			currentLocale: c.currentLocale,
		})
	)
	const visibleDays = getVisibleDays(date, config)
	const isHourly = isHourlyGranularity(config)
	const weekNumber = getDrawnWeekNumber(
		date,
		config,
		weekNumberCalculation,
		currentLocale
	)
	const dayHeaderColumns = isHourly
		? resources.flatMap((resource) =>
				visibleDays.map((day) => ({ day, resourceId: resource.id }))
			)
		: []

	return (
		<div className="flex-1 flex flex-col">
			<ResourceWeekVerticalResourceHeader
				resources={resources}
				weekNumber={weekNumber}
			/>
			{isHourly && (
				<ResourceWeekVerticalDayHeader
					columns={dayHeaderColumns}
					weekNumber={weekNumber}
				/>
			)}
		</div>
	)
}

const ResourceWeekHorizontalHeader: React.FC<{
	date: ZonedDate
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
	dateIso: IsoDateString,
	config: ViewConfig
): VerticalColumnSpec[] | HorizontalRowSpec[] => {
	const date = parseViewDate(dateIso, config.timezone)
	const resourceLayout = resolveResourceLayout(config, {
		vertical: (resources) =>
			resourceWeekVerticalColumns(date, config, resources),
		horizontal: (resources) =>
			resourceWeekHorizontalRows(date, config, resources),
	})
	if (resourceLayout) {
		return resourceLayout
	}

	const weekDays = getWeekDays(date, config.firstDayOfWeek)
	const visibleDays = getVisibleDays(date, config)
	const isTodayVisible = visibleDays.some((day) => isToday(day))
	const noResourceBusinessHours = collectResourceBusinessHours([])

	return [
		gutterColumn({
			days: weekHoursFor(date, config, noResourceBusinessHours, weekDays).map(
				toOffsetIso
			),
			gridType: 'hour',
			timezone: config.timezone,
			widthClassName: RESPONSIVE_GUTTER_WIDTH,
			showsToday: isTodayVisible,
		}),
		...visibleDays.map((day) => ({
			id: keys.col.day(day),
			day: toOffsetIso(day),
			days: weekHoursFor(day, config, noResourceBusinessHours, weekDays).map(
				toOffsetIso
			),
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
	range: (dateIso, config) => {
		const zoned = parseViewDate(dateIso, config.timezone)
		const { start, end } = getVisibleDateRange(
			zoned,
			'week',
			config.firstDayOfWeek,
			config.hiddenDays
		)
		return { start: toOffsetIso(start), end: toOffsetIso(end) }
	},
	columns: weekColumns,
	renderHeader: ({ date: dateIso, config }) => {
		const date = parseViewDate(dateIso, config.timezone)
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
