import type React from 'react'
import { AllDayCell } from '@/components/all-day-row/all-day-cell'
import { AllDayRow } from '@/components/all-day-row/all-day-row'
import { ResourceCell } from '@/components/resource-cell'
import { VerticalGrid } from '@/components/vertical-grid/vertical-grid'
import { getViewHours } from '@/features/calendar/utils/view-hours'
import { useResourceCalendarContext } from '@/features/resource-calendar/contexts/resource-calendar-context'
import type dayjs from '@/lib/configs/dayjs-config'

export const ResourceDayVertical: React.FC = () => {
	const {
		currentDate,
		getVisibleResources,
		currentLocale,
		timeFormat,
		businessHours,
		hideNonBusinessHours,
		renderResource,
	} = useResourceCalendarContext()

	const resources = getVisibleResources()
	const hours = getViewHours({
		referenceDate: currentDate,
		businessHours,
		hideNonBusinessHours,
		allDates: [currentDate],
	})

	const firstCol = {
		id: 'time-col',
		day: undefined,
		days: hours,
		className:
			'shrink-0 w-16 min-w-16 max-w-16 sticky left-0 bg-background z-20',
		gridType: 'hour' as const,
		noEvents: true,
		renderCell: (date: dayjs.Dayjs) => (
			<div className="text-muted-foreground p-2 text-right text-[10px] sm:text-xs flex flex-col items-center">
				{Intl.DateTimeFormat(currentLocale, {
					hour: 'numeric',
					hour12: timeFormat === '12-hour',
				}).format(date.toDate())}
			</div>
		),
	}

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
				<div className="flex w-full">
					<AllDayCell />
					{resources.map((resource) => (
						<AllDayRow
							classes={{ cell: 'min-w-50' }}
							days={[currentDate]}
							key={`resource-allday-row-${resource.id}`}
							resource={resource}
							showSpacer={false}
						/>
					))}
				</div>
			}
			cellSlots={[0, 15, 30, 45]}
			classes={{ body: 'w-full', header: 'w-full' }}
			columns={[firstCol, ...columns]}
			data-testid="resource-day"
			gridType="hour"
		>
			{/* Header */}
			<div
				className={'flex border-b h-12 flex-1'}
				data-testid="resource-month-header"
			>
				<div className="shrink-0 border-r w-16 sticky top-0 left-0 bg-background z-20" />
				{resources.map((resource) => (
					<ResourceCell
						className="min-w-50 flex-1"
						key={`resource-cell-${resource.id}`}
						renderResource={renderResource}
						resource={resource}
					>
						<div className="ext-sm font-medium truncate">{resource?.title}</div>
					</ResourceCell>
				))}
			</div>
		</VerticalGrid>
	)
}
