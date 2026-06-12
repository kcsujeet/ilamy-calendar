import type {
	Dayjs,
	PluginView,
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
import { getViewHours } from '@/features/calendar/utils/view-hours'
import { HEADER_STAGGER_DELAY } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { getWeekDays, isToday } from '@/lib/utils/date-utils'
import { keys } from '@/lib/utils/keys'
import { ViewRenderer } from './view-renderer'

const getVisibleDays = (date: Dayjs, config: ViewConfig): Dayjs[] => {
	const weekDays = getWeekDays(date, config.firstDayOfWeek)
	const { hiddenDays } = config
	if (!hiddenDays) return weekDays
	return weekDays.filter((day) => !hiddenDays.has(day.day()))
}

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
			{/* Corner cell with week number */}
			<div className="w-10 sm:w-16 min-w-10 sm:min-w-16 h-full shrink-0 items-center justify-center border-r p-2 flex">
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

const weekColumns = (date: Dayjs, config: ViewConfig): VerticalColumnSpec[] => {
	const weekDays = getWeekDays(date, config.firstDayOfWeek)
	const visibleDays = getVisibleDays(date, config)
	const gutterHours = getViewHours({
		referenceDate: date,
		businessHours: config.businessHours,
		hideNonBusinessHours: config.hideNonBusinessHours,
		allDates: weekDays,
	})

	return [
		gutterColumn({
			days: gutterHours,
			gridType: 'hour',
			widthClassName: RESPONSIVE_GUTTER_WIDTH,
		}),
		// Each day column gets its own hours on the correct date.
		...visibleDays.map((day) => ({
			id: keys.col.day(day),
			day,
			days: getViewHours({
				referenceDate: day,
				businessHours: config.businessHours,
				hideNonBusinessHours: config.hideNonBusinessHours,
				allDates: weekDays,
			}),
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
	// Phase 4 flips this when the built-ins compose the resource axis.
	supportsResources: false,
	range: (date, config) => {
		const days = getWeekDays(date, config.firstDayOfWeek)
		const weekStart = days.at(0) ?? date
		const weekEnd = days.at(-1) ?? date
		return { start: weekStart.startOf('day'), end: weekEnd.endOf('day') }
	},
	columns: weekColumns,
	renderHeader: ({ date, config }) => (
		<WeekViewHeader config={config} date={date} />
	),
	component: WeekView,
}
