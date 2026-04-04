import type React from 'react'
import { memo } from 'react'
import { ResourceCell } from '@/components/resource-cell'
import { VerticalGrid } from '@/components/vertical-grid/vertical-grid'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import {
	HEADER_ANIMATION,
	TIME_COLUMN,
	TIME_COLUMN_CELL,
} from '@/lib/constants'
import { cn } from '@/lib/utils'

const NoMemoResourceMonthVertical: React.FC = () => {
	const { currentDate, getVisibleResources } = useSmartCalendarContext()

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
		className: TIME_COLUMN,
		gridType: 'day' as const,
		noEvents: true,
		renderCell: (date: Dayjs) => (
			<div
				className={cn(HEADER_ANIMATION, TIME_COLUMN_CELL)}
				key={date.toISOString()}
			>
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
			classes={{ header: 'w-full', body: 'w-full' }}
			columns={[firstCol, ...columns]}
			data-testid="resource-month-vertical-grid"
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
						resource={resource}
					/>
				))}
			</div>
		</VerticalGrid>
	)
}

export const ResourceMonthVertical = memo(NoMemoResourceMonthVertical)
