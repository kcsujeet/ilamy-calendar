import type React from 'react'
import { getViewHours } from '@/features/calendar/utils/view-hours'
import { ResourceEventGrid } from '@/features/resource-calendar/components/resource-event-grid'
import { TimeHeaderRow } from '@/features/resource-calendar/components/shared'
import { getResourceBusinessHours } from '@/features/resource-calendar/hooks/use-stable-resources'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { RESOURCE_CORNER } from '@/lib/constants'

export const ResourceDayHorizontal: React.FC = () => {
	const {
		currentDate,
		t,
		timeFormat,
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
		resourceBusinessHours: getResourceBusinessHours(resources),
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
			<div className={RESOURCE_CORNER}>
				<div className="text-sm">{t('resources')}</div>
			</div>

			<div className="flex-1 flex flex-col">
				<TimeHeaderRow
					hours={dayHours}
					testIdPrefix="resource-day"
					timeFormat={timeFormat}
				/>
			</div>
		</ResourceEventGrid>
	)
}
