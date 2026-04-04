import type React from 'react'
import { memo } from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { VerticalGrid } from '@/components/vertical-grid/vertical-grid'
import { ResourceVerticalHeader } from '@/features/resource-calendar/components/shared'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { TIME_COLUMN, TIME_COLUMN_CELL } from '@/lib/constants'

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
			<AnimatedSection
				className={TIME_COLUMN_CELL}
				transitionKey={date.toISOString()}
			>
				<span>{date.format('D')}</span>
				<span>{date.format('ddd')}</span>
			</AnimatedSection>
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
			<ResourceVerticalHeader
				data-testid="resource-month-header"
				resources={resources}
			/>
		</VerticalGrid>
	)
}

export const ResourceMonthVertical = memo(NoMemoResourceMonthVertical)
