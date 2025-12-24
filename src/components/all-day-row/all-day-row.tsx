import type dayjs from 'dayjs'
import { memo } from 'react'
import { HorizontalGridRow } from '@/components/horizontal-grid/horizontal-grid-row'
import type { Resource } from '@/features/resource-calendar/types'
import { cn } from '@/lib/utils'
import { AllDayCell } from './all-day-cell'

interface AllDayRowProps {
	days: dayjs.Dayjs[]
	classes?: { row?: string; cell?: string; spacer?: string }
	resource?: Resource
	showSpacer?: boolean
}

const NoMemoAllDayRow: React.FC<AllDayRowProps> = ({
	days,
	classes,
	resource,
	showSpacer = true,
}) => {
	const columns = days.map((day, index) => ({
		id: `allday-col-${day.toISOString()}-${index}`,
		day,
		gridType: 'day' as const,
		className: cn('h-full min-h-12 border-r last:border-r-0', classes?.cell),
	}))

	return (
		<div className={cn('flex w-full', classes?.row)} data-testid="all-day-row">
			{/* Time col spacer */}
			{showSpacer && <AllDayCell className={classes?.spacer} />}

			{/* Day all day cell */}
			<HorizontalGridRow
				allDay
				className="flex-1 min-h-fit"
				columns={columns}
				gridType="day"
				id={`all-day-row-${resource?.id ?? 'main'}`}
				isLastRow
				resource={resource}
			/>
		</div>
	)
}

export const AllDayRow = memo(NoMemoAllDayRow)
