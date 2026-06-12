import { AllDayCell } from '@/components/all-day-row/all-day-cell'
import { AllDayRow } from '@/components/all-day-row/all-day-row'
import { ResourceCell } from '@/components/resource-cell'
import type { BusinessHours } from '@/components/types'
import { gutterColumn } from '@/components/vertical-grid/gutter'
import { VerticalGrid } from '@/components/vertical-grid/vertical-grid'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { getViewHours } from '@/features/calendar/utils/view-hours'
import { keys } from '@/lib/utils/keys'

export const ResourceDayVertical: React.FC = () => {
	const {
		currentDate,
		resources = [],
		businessHours,
		hideNonBusinessHours,
		slotDuration,
	} = useSmartCalendarContext()
	const hours = getViewHours({
		referenceDate: currentDate,
		businessHours,
		hideNonBusinessHours,
		allDates: [currentDate],
		resourceBusinessHours: resources
			.map((r) => r.businessHours)
			.filter(Boolean) as (BusinessHours | BusinessHours[])[],
	})

	const firstCol = gutterColumn({ days: hours, gridType: 'hour' })

	const columns = resources.map((resource) => ({
		id: keys.col.day(currentDate, resource.id),
		resourceId: resource.id,
		resource,
		days: hours,
		day: currentDate,
		gridType: 'hour' as const,
	}))

	return (
		<VerticalGrid
			allDayRow={
				<div className="flex w-full">
					<AllDayCell />
					{resources.map((resource) => (
						<AllDayRow
							classes={{ cell: 'min-w-20 border-r!' }}
							days={[currentDate]}
							key={keys.allDayRow(resource.id)}
							resource={resource}
							showSpacer={false}
						/>
					))}
				</div>
			}
			classes={{ body: 'w-full', header: 'w-full' }}
			columns={[firstCol, ...columns]}
			data-testid="resource-day"
			gridType="hour"
			slotDurationMinutes={slotDuration}
		>
			{/* Header */}
			<div
				className={'flex border-b h-12 flex-1'}
				data-testid="resource-month-header"
			>
				<div className="shrink-0 border-r w-16 sticky top-0 left-0 bg-background z-20" />
				{resources.map((resource) => (
					<ResourceCell
						className="min-w-20 flex-1"
						key={keys.listKey('resource-cell', resource.id)}
						resource={resource}
					/>
				))}
			</div>
		</VerticalGrid>
	)
}
