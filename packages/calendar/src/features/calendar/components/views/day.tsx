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
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import {
	collectResourceBusinessHours,
	getViewHours,
} from '@/features/calendar/utils/view-hours'
import { HEADER_STAGGER_DELAY } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { getDayKey, isToday } from '@/lib/utils/date-utils'
import { keys } from '@/lib/utils/keys'
import {
	ResourceColumnsHeader,
	ResourcesCornerCell,
	resourceHorizontalRows,
} from './resource-axis'
import { TimeHeaderRow } from './time-header-row'
import { ViewRenderer } from './view-renderer'

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

const dayHours = (date: Dayjs, config: ViewConfig, resources: Resource[]) =>
	getViewHours({
		referenceDate: date,
		businessHours: config.businessHours,
		hideNonBusinessHours: config.hideNonBusinessHours,
		allDates: [date],
		resourceBusinessHours: collectResourceBusinessHours(resources),
	})

const ResourceDayHorizontalHeader: React.FC<{
	date: Dayjs
	config: ViewConfig
}> = ({ date, config }) => {
	const hours = dayHours(date, config, config.resources ?? [])

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
	const hours = dayHours(date, config, resources)

	if (!resources.length) {
		return [
			gutterColumn({ days: hours, gridType: 'hour' }),
			{
				id: keys.col.day(date),
				day: date,
				days: hours,
				className: 'w-[calc(100%-4rem)] flex-1',
				gridType: 'hour',
			},
		]
	}

	// Engine rule: with resources, the user's orientation picks the arrangement.
	if (config.orientation === 'vertical') {
		return [
			gutterColumn({ days: hours, gridType: 'hour' }),
			...resources.map((resource) => ({
				id: keys.col.day(date, resource.id),
				resourceId: resource.id,
				resource,
				days: hours,
				day: date,
				gridType: 'hour' as const,
			})),
		]
	}

	return resourceHorizontalRows({
		resources,
		days: hours,
		gridType: 'hour',
		cellClassName: 'min-w-20 flex-1',
	})
}

export const DayView: React.FC = () => <ViewRenderer view={dayView} />

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
	component: DayView,
}
