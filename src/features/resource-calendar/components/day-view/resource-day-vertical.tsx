import { VerticalGrid } from '@/components/vertical-grid/vertical-grid'
import { getViewHours } from '@/features/calendar/utils/view-hours'
import {
	ResourceAllDaySection,
	ResourceVerticalHeader,
} from '@/features/resource-calendar/components/shared'
import { getResourceBusinessHours } from '@/features/resource-calendar/hooks/use-stable-resources'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { createTimeColumn } from '@/lib/utils/create-time-column'

export const ResourceDayVertical: React.FC = () => {
	const {
		currentDate,
		getVisibleResources,
		timeFormat,
		businessHours,
		hideNonBusinessHours,
	} = useSmartCalendarContext()

	const resources = getVisibleResources()
	const hours = getViewHours({
		referenceDate: currentDate,
		businessHours,
		hideNonBusinessHours,
		allDates: [currentDate],
		resourceBusinessHours: getResourceBusinessHours(resources),
	})

	const firstCol = createTimeColumn(hours, timeFormat)

	const columns = resources.map((resource) => ({
		id: `day-col-${currentDate.format('YYYY-MM-DD')}-resource-${resource.id}`,
		resourceId: resource.id,
		resource,
		days: hours,
		day: currentDate,
		gridType: 'hour' as const,
	}))

	return (
		<VerticalGrid
			allDayRow={
				<ResourceAllDaySection days={[currentDate]} resources={resources} />
			}
			cellSlots={[0, 15, 30, 45]}
			classes={{ body: 'w-full', header: 'w-full' }}
			columns={[firstCol, ...columns]}
			data-testid="resource-day"
			gridType="hour"
		>
			<ResourceVerticalHeader resources={resources} />
		</VerticalGrid>
	)
}
