import type React from 'react'
import { memo, useMemo } from 'react'
import { ResourceEventGrid } from '@/features/resource-calendar/components/resource-event-grid'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { HEADER_ANIMATION, RESOURCE_CORNER } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { getMonthDays } from '@/lib/utils/date-utils'

const NoMemoResourceMonthHorizontal: React.FC = () => {
	const { currentDate, t } = useSmartCalendarContext()

	// Generate calendar grid - days of the month
	const monthDays = useMemo<Dayjs[]>(() => {
		return getMonthDays(currentDate)
	}, [currentDate])

	return (
		<ResourceEventGrid days={monthDays}>
			<div className={RESOURCE_CORNER}>
				<div className="text-sm">{t('resources')}</div>
			</div>

			{monthDays.map((day) => (
				<div
					className="w-20 border-b border-r shrink-0 flex items-center justify-center flex-col"
					key={`resource-month-header-${day.toISOString()}`}
				>
					<div
						className={cn('text-xs font-medium', HEADER_ANIMATION)}
						key={day.toISOString()}
					>
						{day.format('D')}
					</div>
					<div
						className={cn('text-xs text-muted-foreground', HEADER_ANIMATION)}
						key={`${day.toISOString()}-day`}
					>
						{day.format('ddd')}
					</div>
				</div>
			))}
		</ResourceEventGrid>
	)
}

export const ResourceMonthHorizontal = memo(NoMemoResourceMonthHorizontal)
