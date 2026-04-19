import type React from 'react'
import type { BusinessHours } from '@/components/types'
import { getViewHours } from '@/features/calendar/utils/view-hours'
import { ResourceEventGrid } from '@/features/resource-calendar/components/resource-event-grid'
import { TimeHeaderRow } from '@/features/resource-calendar/components/time-header-row'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'

export const ResourceDayHorizontal: React.FC = () => {
	const {
		currentDate,
		t,
		businessHours,
		hideNonBusinessHours,
		getVisibleResources,
	} = useSmartCalendarContext()
	const resources = getVisibleResources()
	const dayHours = getViewHours({
		referenceDate: currentDate,
		businessHours,
		hideNonBusinessHours,
		allDates: [currentDate],
		resourceBusinessHours: resources
			.map((r) => r.businessHours)
			.filter(Boolean) as (BusinessHours | BusinessHours[])[],
	})

	return (
		<ResourceEventGrid
			classes={{
				header: 'min-w-full',
				body: 'min-w-full',
				cell: 'min-w-20 flex-1',
			}}
			days={dayHours}
			gridType="hour"
		>
			<div className="w-20 sm:w-40 border-b border-r shrink-0 flex justify-center items-center sticky top-0 left-0 bg-background z-20">
				<div className="text-sm">{t('resources')}</div>
			</div>

			<div className="flex-1 flex flex-col">
				<TimeHeaderRow delayStep={0.05} hours={dayHours} view="day" />
			</div>
		</ResourceEventGrid>
	)
}
