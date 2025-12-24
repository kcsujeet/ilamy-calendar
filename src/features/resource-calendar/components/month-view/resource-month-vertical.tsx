import type React from 'react'
import { ResourceCell } from '@/components/resource-cell'
import { VerticalGrid } from '@/components/vertical-grid/vertical-grid'
import { useResourceCalendarContext } from '@/features/resource-calendar/contexts/resource-calendar-context'
import type dayjs from '@/lib/configs/dayjs-config'
import { ids } from '@/lib/utils/ids'

export const ResourceMonthVertical: React.FC = () => {
	const { currentDate, getVisibleResources } = useResourceCalendarContext()

	const resources = getVisibleResources()
	const startOfMonth = currentDate.startOf('month')
	const daysInMonth = Array.from(
		{ length: currentDate.daysInMonth() },
		(_, i) => startOfMonth.add(i, 'day')
	)

	const firstCol = {
		id: 'date-col',
		days: daysInMonth,
		day: undefined,
		className:
			'shrink-0 w-16 min-w-16 max-w-16 sticky left-0 bg-background z-20',
		gridType: 'day' as const,
		noEvents: true,
		renderCell: (date: dayjs.Dayjs) => (
			<div className="text-muted-foreground p-2 text-right text-[10px] sm:text-xs flex flex-col items-center">
				<span>{date.format('D')}</span>
				<span>{date.format('ddd')}</span>
			</div>
		),
	}

	const columns = resources.map((resource) => ({
		id: `month-col-resource-${resource.id}`,
		day: undefined,
		resourceId: resource.id,
		days: daysInMonth,
		gridType: 'day' as const,
	}))

	return (
		<VerticalGrid
			columns={[firstCol, ...columns]}
			data-testid={ids.resourceView.month}
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
