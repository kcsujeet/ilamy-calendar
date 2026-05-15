import { memo } from 'react'
import { HorizontalGridRow } from '@/components/horizontal-grid/horizontal-grid-row'
import type { Resource } from '@/features/resource-calendar/types'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'
import { keys } from '@/lib/utils/keys'
import { AllDayCell } from './all-day-cell'

interface AllDayRowProps {
	days: Dayjs[]
	classes?: { row?: string; cell?: string; spacer?: string }
	resource?: Resource
	showSpacer?: boolean
	/** When set with `showSpacer`, row uses CSS Grid so day cells align with the week time grid. */
	columnTemplate?: string
}

const NoMemoAllDayRow: React.FC<AllDayRowProps> = ({
	days,
	classes,
	resource,
	showSpacer = true,
	columnTemplate,
}) => {
	const columns = days.map((day, index) => ({
		id: keys.col.allDay(day, index),
		day,
		gridType: 'day' as const,
		className: cn('h-full min-h-12 border-r last:border-r-0', classes?.cell),
	}))

	if (columnTemplate && showSpacer) {
		const dayBandTemplate = `repeat(${days.length}, minmax(0, 1fr))`

		return (
			<div
				className={cn(
					'grid min-h-12 w-full min-w-0 border-b bg-background',
					classes?.row
				)}
				data-testid="all-day-row"
				style={{ gridTemplateColumns: columnTemplate }}
			>
				<AllDayCell className={classes?.spacer} />
				<div
					className="relative min-h-12 min-w-0"
					style={{ gridColumn: '2 / -1' }}
				>
					<HorizontalGridRow
						allDay
						className="flex h-full min-h-12 min-w-0 w-full flex-none border-0"
						columns={columns}
						dayCellsGridTemplate={dayBandTemplate}
						dayNumberHeight={0}
						gridType="day"
						id={keys.allDayRow(resource?.id)}
						isLastRow
						resource={resource}
						variant="regular"
					/>
				</div>
			</div>
		)
	}

	return (
		<div
			className={cn('flex w-full bg-background', classes?.row)}
			data-testid="all-day-row"
		>
			{/* Time col spacer */}
			{showSpacer && <AllDayCell className={classes?.spacer} />}

			{/* Day all day cell */}
			<HorizontalGridRow
				allDay
				className="flex-1 min-h-fit border-b"
				columns={columns}
				dayNumberHeight={0}
				gridType="day"
				id={keys.allDayRow(resource?.id)}
				isLastRow
				resource={resource}
				variant="regular"
			/>
		</div>
	)
}

export const AllDayRow = memo(NoMemoAllDayRow)
