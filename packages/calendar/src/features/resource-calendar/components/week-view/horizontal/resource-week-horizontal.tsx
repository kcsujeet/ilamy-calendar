import type React from 'react'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { ResourceEventGrid } from '@/features/resource-calendar/components/resource-event-grid'
import { TimeHeaderRow } from '@/features/resource-calendar/components/time-header-row'
import { cn } from '@/lib/utils'
import { useResourceWeekViewData } from '../use-resource-week-view-data'
import { ResourceWeekHorizontalDayHeader } from './resource-week-horizontal-day-header'
import { useResourceWeekHorizontalData } from './use-resource-week-horizontal-data'

export const ResourceWeekHorizontal: React.FC = () => {
	const { t } = useSmartCalendarContext()
	const { isHourly, weekDays } = useResourceWeekViewData()
	const { weekHours } = useResourceWeekHorizontalData()

	return (
		<ResourceEventGrid
			classes={{
				header: cn(isHourly ? 'h-24' : 'h-12', 'min-w-full'),
				body: 'min-w-full',
				cell: 'min-w-20 flex-1',
			}}
			days={isHourly ? weekHours : weekDays}
			gridType={isHourly ? 'hour' : 'day'}
		>
			<div className="w-20 sm:w-40 border-b border-r shrink-0 flex justify-center items-center sticky top-0 left-0 bg-background z-20">
				<div className="text-sm truncate px-1 min-w-0">{t('resources')}</div>
			</div>

			<div className="flex-1 flex flex-col">
				<ResourceWeekHorizontalDayHeader days={weekDays} />
				{isHourly && (
					<TimeHeaderRow
						delayStep={0.005}
						hours={weekHours.flat()}
						view="week"
					/>
				)}
			</div>
		</ResourceEventGrid>
	)
}
