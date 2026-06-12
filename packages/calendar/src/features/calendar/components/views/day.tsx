import type {
	Dayjs,
	PluginView,
	VerticalColumnSpec,
	ViewConfig,
} from '@ilamy/types'
import type React from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { gutterColumn } from '@/components/vertical-grid/gutter'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { getViewHours } from '@/features/calendar/utils/view-hours'
import { cn } from '@/lib/utils'
import { getDayKey, isToday } from '@/lib/utils/date-utils'
import { keys } from '@/lib/utils/keys'
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

const dayColumns = (date: Dayjs, config: ViewConfig): VerticalColumnSpec[] => {
	const hours = getViewHours({
		referenceDate: date,
		businessHours: config.businessHours,
		hideNonBusinessHours: config.hideNonBusinessHours,
		allDates: [date],
	})

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

export const DayView: React.FC = () => <ViewRenderer view={dayView} />

export const dayView: PluginView = {
	name: 'day',
	label: 'day',
	navigationUnit: 'day',
	layout: 'vertical',
	// Phase 4 flips this when the built-ins compose the resource axis.
	supportsResources: false,
	range: (date) => ({ start: date.startOf('day'), end: date.endOf('day') }),
	columns: dayColumns,
	renderHeader: ({ date }) => <DayViewHeader date={date} />,
	component: DayView,
}
