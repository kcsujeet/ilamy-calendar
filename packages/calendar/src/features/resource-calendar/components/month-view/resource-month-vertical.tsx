import type React from 'react'
import { ResourceCell } from '@/components/resource-cell'
import { gutterColumn } from '@/components/vertical-grid/gutter'
import { VerticalGrid } from '@/components/vertical-grid/vertical-grid'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { keys } from '@/lib/utils/keys'

export const ResourceMonthVertical: React.FC = () => {
	const { currentDate, resources = [] } = useSmartCalendarContext()
	const startOfMonth = currentDate.startOf('month')
	const daysInMonth = Array.from(
		{ length: currentDate.daysInMonth() },
		(_, i) => startOfMonth.add(i, 'day')
	)

	const firstCol = gutterColumn({
		days: daysInMonth,
		gridType: 'day',
		renderLabel: (date: Dayjs) => (
			<>
				<span>{date.format('D')}</span>
				<span>{date.format('ddd')}</span>
			</>
		),
	})

	const columns = resources.map((resource) => ({
		id: keys.col.resource('month', resource.id),
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
						className="min-w-20 flex-1"
						key={keys.listKey('resource-cell', resource.id)}
						resource={resource}
					/>
				))}
			</div>
		</VerticalGrid>
	)
}
