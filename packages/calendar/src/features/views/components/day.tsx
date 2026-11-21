import {
	collectResourceBusinessHours,
	getViewHours,
	getVisibleDateRange,
	isToday,
} from '@ilamy/core'
import type {
	HorizontalRowSpec,
	IsoDateString,
	PluginView,
	VerticalColumnSpec,
	ViewConfig,
} from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import {
	dayKey,
	formatDate,
	now,
	parseDate,
	resolveZone,
	toOffsetIso,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import { Square } from 'lucide-react'
import type React from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import {
	FULL_WIDTH_MINUS_GUTTER,
	gutterColumn,
} from '@/features/views/components/vertical-grid/gutter'
import { useDateTimeFormatters } from '@/hooks/use-date-time-formatters'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { useSlotProps } from '@/stores/calendar-theme-context'
import { keys } from '@/utils/keys.utils'
import { viewHasResourceAxis } from '@/utils/resource-list.utils'
import {
	RESOURCE_CELL_WIDTH,
	ResourceColumnsHeader,
	ResourcesCornerCell,
	resourceHorizontalRows,
	resourceVerticalColumns,
} from './resource-axis'
import { TimeHeaderRow } from './time-header-row'

const parseViewDate = (
	dateIso: IsoDateString,
	timezone?: string
): ZonedDate => {
	const zone = resolveZone(timezone)
	return parseDate(dateIso, zone) ?? now(zone)
}

const DayViewHeader: React.FC<{ date: ZonedDate }> = ({ date }) => {
	const { t, currentLocale, hasDayHeaderFormat } = useSmartCalendarContext(
		(c) => ({
			t: c.t,
			currentLocale: c.currentLocale,
			hasDayHeaderFormat: Boolean(c.dayHeaderFormat),
		})
	)
	const { formatDayHeader } = useDateTimeFormatters()
	const headerSlot = useSlotProps('dayHeader', {
		structuralClassName: 'flex flex-1 justify-center items-center min-h-12',
	})
	const today = isToday(date)
	let headerText: string
	if (hasDayHeaderFormat) {
		headerText = formatDayHeader(date)
	} else {
		headerText = formatDate(
			date,
			{
				weekday: 'long',
				month: 'long',
				day: 'numeric',
				year: 'numeric',
			},
			currentLocale
		)
	}

	return (
		<div
			className={headerSlot.className}
			data-testid="day-view-header"
			style={headerSlot.style}
		>
			<AnimatedSection
				className={cn(
					'flex justify-center items-center text-center text-sm font-semibold sm:text-xl',
					today && 'text-primary'
				)}
				transitionKey={dayKey(date)}
			>
				{headerText}
				{today && (
					<span className="bg-primary text-primary-foreground ml-2 rounded-full px-1 py-0.5 text-xs sm:px-2 sm:text-sm">
						{t('today')}
					</span>
				)}
			</AnimatedSection>
		</div>
	)
}

const dayHours = (date: ZonedDate, config: ViewConfig): ZonedDate[] =>
	getViewHours({
		referenceDate: date,
		businessHours: config.businessHours,
		hideNonBusinessHours: config.hideNonBusinessHours,
		slotMinTime: config.slotMinTime,
		slotMaxTime: config.slotMaxTime,
		allDates: [date],
		resourceBusinessHours: collectResourceBusinessHours(config.resources ?? []),
	})

const ResourceDayHorizontalHeader: React.FC<{
	date: ZonedDate
	config: ViewConfig
}> = ({ date, config }) => {
	const hours = dayHours(date, config)

	return (
		<>
			<ResourcesCornerCell />
			<div className="flex-1 flex flex-col">
				<TimeHeaderRow hours={hours} view="day" />
			</div>
		</>
	)
}

const dayColumns = (
	dateIso: IsoDateString,
	config: ViewConfig
): VerticalColumnSpec[] | HorizontalRowSpec[] => {
	const date = parseViewDate(dateIso, config.timezone)
	const resources = config.resources ?? []
	const hours = dayHours(date, config)
	const hourIsos = hours.map(toOffsetIso)
	const isDayToday = isToday(date)

	if (!viewHasResourceAxis(config)) {
		return [
			gutterColumn({
				days: hourIsos,
				gridType: 'hour',
				timezone: config.timezone,
				showsToday: isDayToday,
			}),
			{
				id: keys.col.day(date),
				day: dateIso,
				days: hourIsos,
				className: cn(FULL_WIDTH_MINUS_GUTTER, 'flex-1'),
				gridType: 'hour',
			},
		]
	}

	if (config.orientation === 'vertical') {
		return resourceVerticalColumns({
			resources,
			gutter: gutterColumn({
				days: hourIsos,
				gridType: 'hour',
				timezone: config.timezone,
				showsToday: isDayToday,
			}),
			columnsFor: (resource) => ({
				id: keys.col.day(date, resource.id),
				days: hourIsos,
				day: dateIso,
				gridType: 'hour' as const,
			}),
		})
	}

	return resourceHorizontalRows({
		resources,
		days: hours,
		gridType: 'hour',
		cellClassName: RESOURCE_CELL_WIDTH,
	})
}

export const dayView: PluginView = {
	name: 'day',
	label: 'day',
	icon: Square,
	navigationUnit: 'day',
	layout: 'vertical',
	supportsResources: true,
	range: (dateIso, config) => {
		const zoned = parseViewDate(dateIso, config.timezone)
		const { start, end } = getVisibleDateRange(
			zoned,
			'day',
			config.firstDayOfWeek,
			config.hiddenDays
		)
		return { start: toOffsetIso(start), end: toOffsetIso(end) }
	},
	columns: dayColumns,
	renderHeader: ({ date: dateIso, config }) => {
		const date = parseViewDate(dateIso, config.timezone)
		const resources = config.resources ?? []
		if (!viewHasResourceAxis(config)) {
			return <DayViewHeader date={date} />
		}
		if (config.orientation === 'vertical') {
			return <ResourceColumnsHeader resources={resources} />
		}
		return <ResourceDayHorizontalHeader config={config} date={date} />
	},
}
