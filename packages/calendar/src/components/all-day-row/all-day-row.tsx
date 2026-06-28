import type { Resource } from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { memo } from 'react'
import { HorizontalGridRow } from '@/components/horizontal-grid/horizontal-grid-row'
import { keys } from '@/lib/utils/keys'
import { AllDayCell } from './all-day-cell'

interface AllDayRowProps {
	days: Dayjs[]
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
		id: keys.col.allDay(day, index),
		day,
		gridType: 'day' as const,
		className: cn('h-full min-h-12 bg-background', classes?.cell),
	}))

	return (
		<div
			// gap-px + bg-border draws the spacer/grid + inter-day separators,
			// matching the header and body. The bottom border is owned by the
			// all-day container in VerticalGridHeaderContainer.
			className={cn('flex w-full gap-px bg-border', classes?.row)}
			data-testid="all-day-row"
		>
			{/* Time col spacer */}
			{showSpacer && <AllDayCell className={classes?.spacer} />}

			<HorizontalGridRow
				allDay
				className="flex-1 min-h-fit"
				columns={columns}
				dayNumberHeight={0}
				gridType="day"
				id={keys.allDayRow(resource?.id)}
				resource={resource}
				variant="regular"
			/>
		</div>
	)
}

export const AllDayRow = memo(NoMemoAllDayRow)
