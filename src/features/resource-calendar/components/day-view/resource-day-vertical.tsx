import type React from 'react'
import { AllDayCell } from '@/components/all-day-row/all-day-cell'
import { AllDayRow } from '@/components/all-day-row/all-day-row'
import { ResourceCell } from '@/components/resource-cell'
import { VerticalGrid } from '@/components/vertical-grid/vertical-grid'
import { useResourceCalendarContext } from '@/features/resource-calendar/contexts/resource-calendar-context'
import type dayjs from '@/lib/configs/dayjs-config'
import { getDayHours } from '@/lib/utils/date-utils'
import { ids } from '@/lib/utils/ids'

export const ResourceDayVertical: React.FC = () => {
	const { currentDate, getVisibleResources, currentLocale, timeFormat } =
		useResourceCalendarContext()

	const resources = getVisibleResources()
	const hours = getDayHours({ referenceDate: currentDate })

	const firstCol = {
		id: 'time-col',
		day: undefined,
		days: hours,
		className:
			'shrink-0 w-16 min-w-16 max-w-16 sticky left-0 bg-background z-20',
		gridType: 'hour' as const,
		noEvents: true,
		renderCell: (date: dayjs.Dayjs) => (
			<div
				className="text-muted-foreground p-2 text-right text-[10px] sm:text-xs flex flex-col items-center"
				data-testid={ids.resourceView.timeLabel(date.format('HH'))}
			>
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
		days: hours,
		day: currentDate,
		gridType: 'hour' as const,
	}))

	return (
		<VerticalGrid
			allDayRow={
				<div className="flex">
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
			columns={[firstCol, ...columns]}
			data-testid={ids.resourceView.day}
			gridType="hour"
		>
			{/* Header */}
			<div
				className={'flex border-b h-12'}
				data-testid={ids.resourceView.monthHeader}
			>
				<div className="shrink-0 border-r w-16 sticky top-0 left-0 bg-background z-20" />
				{resources.map((resource) => (
					<ResourceCell
						className="min-w-50"
						key={`resource-cell-${resource.id}`}
						resource={resource}
					/>
				))}
			</div>
		</VerticalGrid>
	)
}
