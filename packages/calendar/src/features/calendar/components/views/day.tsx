import type {
	Dayjs,
	HorizontalRowSpec,
	PluginView,
	VerticalColumnSpec,
	ViewConfig,
} from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import type React from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import {
	FULL_WIDTH_MINUS_GUTTER,
	gutterColumn,
} from '@/components/vertical-grid/gutter'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import {
	collectResourceBusinessHours,
	getViewHours,
} from '@/features/calendar/utils/view-hours'
import { HEADER_STAGGER_DELAY } from '@/lib/constants'
import { getDayKey, isToday } from '@/lib/utils/date-utils'
import { keys } from '@/lib/utils/keys'
import {
	RESOURCE_CELL_WIDTH,
	ResourceColumnsHeader,
	ResourcesCornerCell,
	resourceHorizontalRows,
	resourceVerticalColumns,
} from './resource-axis'
import { TimeHeaderRow } from './time-header-row'

const DayViewHeader: React.FC<{ date: Dayjs }> = ({ date }) => {
	const { t } = useSmartCalendarContext((c) => ({ t: c.t }))
	const today = isToday(date)

	return (
		<div
			className={'flex flex-1 justify-center items-center min-h-12'}
			data-testid="day-view-header"
		>
			<AnimatedSection
				className={cn(
					'flex justify-center items-center text-center text-sm font-semibold sm:text-xl',
					today && 'text-primary'
				)}
				transitionKey={getDayKey(date)}
			>
				{date.format('dddd, LL')}
				{today && (
					<span className="bg-primary text-primary-foreground ml-2 rounded-full px-1 py-0.5 text-xs sm:px-2 sm:text-sm">
						{t('today')}
					</span>
				)}
			</AnimatedSection>
		</div>
	)
}

const dayHours = (date: Dayjs, config: ViewConfig) =>
	getViewHours({
		referenceDate: date,
		businessHours: config.businessHours,
		hideNonBusinessHours: config.hideNonBusinessHours,
		allDates: [date],
		resourceBusinessHours: collectResourceBusinessHours(config.resources ?? []),
	})

const ResourceDayHorizontalHeader: React.FC<{
	date: Dayjs
	config: ViewConfig
}> = ({ date, config }) => {
	const hours = dayHours(date, config)

	return (
		<>
			<ResourcesCornerCell />
			<div className="flex-1 flex flex-col">
				<TimeHeaderRow
					delayStep={HEADER_STAGGER_DELAY}
					hours={hours}
					view="day"
				/>
			</div>
		</>
	)
}

const dayColumns = (
	date: Dayjs,
	config: ViewConfig
): VerticalColumnSpec[] | HorizontalRowSpec[] => {
	const resources = config.resources ?? []
	const hours = dayHours(date, config)

	if (!resources.length) {
		return [
			gutterColumn({ days: hours, gridType: 'hour' }),
			{
				id: keys.col.day(date),
				day: date,
				days: hours,
				className: cn(FULL_WIDTH_MINUS_GUTTER, 'flex-1'),
				gridType: 'hour',
			},
		]
	}

	if (config.orientation === 'vertical') {
		return resourceVerticalColumns({
			resources,
			gutter: gutterColumn({ days: hours, gridType: 'hour' }),
			columnsFor: (resource) => ({
				id: keys.col.day(date, resource.id),
				days: hours,
				day: date,
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
	navigationUnit: 'day',
	layout: 'vertical',
	supportsResources: true,
	range: (date) => ({ start: date.startOf('day'), end: date.endOf('day') }),
	columns: dayColumns,
	renderHeader: ({ date, config }) => {
		const resources = config.resources ?? []
		if (!resources.length) {
			return <DayViewHeader date={date} />
		}
		if (config.orientation === 'vertical') {
			return <ResourceColumnsHeader resources={resources} />
		}
		return <ResourceDayHorizontalHeader config={config} date={date} />
	},
}
