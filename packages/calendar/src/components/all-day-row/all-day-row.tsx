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
		className: cn('h-full min-h-12 border-r last:border-r-0', classes?.cell),
	}))

	return (
		<div
			className={cn('flex w-full bg-background', classes?.row)}
			data-testid="all-day-row"
		>
			{/* Time col spacer */}
			{showSpacer && <AllDayCell className={classes?.spacer} />}

			{/* Not isLastRow: the time grid follows, so cells keep border-b. */}
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
