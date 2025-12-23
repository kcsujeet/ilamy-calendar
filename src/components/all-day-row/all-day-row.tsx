import type dayjs from 'dayjs'
import { memo } from 'react'
import type { Resource } from '@/features/resource-calendar/types'
import { cn } from '@/lib/utils'
import { GridCell } from '../grid-cell'
import { HorizontalGridEventsLayer } from '../horizontal-grid/horizontal-grid-events-layer'
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
	return (
		<div className={cn('flex w-full', classes?.row)} data-testid="all-day-row">
			{/* Time col spacer */}
			{showSpacer && <AllDayCell className={classes?.spacer} />}

			{/* Day all day cell */}
			<div className="w-full relative flex">
				{days.map((day, index) => (
					<GridCell
						allDay
						className={cn(
							'h-full min-h-12 border-r last:border-r-0 w-full',
							classes?.cell
						)}
						day={day}
						gridType="day"
						index={0}
						key={`allday-cell-${day.toISOString()}-${index}`}
						resourceId={resource?.id}
					/>
				))}

				<div className="absolute inset-0 pointer-events-none">
					<HorizontalGridEventsLayer
						allDay
						days={days}
						gridType="day"
						resourceId={resource?.id}
					/>
				</div>
			</div>
		</div>
	)
}

export const AllDayRow = memo(NoMemoAllDayRow)
