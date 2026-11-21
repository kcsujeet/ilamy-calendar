import type { Resource } from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import { toOffsetIso, type ZonedDate } from '@ilamy/utils/temporal'
import { memo, useMemo } from 'react'
import { HorizontalGridRow } from '@/features/calendar/components/horizontal-grid/horizontal-grid-row'
import { useSlotProps } from '@/features/calendar/stores/calendar-theme-context'
import { keys } from '@/features/calendar/utils/keys'
import { AllDayCell } from './all-day-cell'

interface AllDayRowProps {
	days: ZonedDate[]
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
	const rowSlot = useSlotProps('allDayRow', {
		structuralClassName: 'flex w-full',
		defaultClassName: 'gap-px bg-border',
		extraClassName: classes?.row,
	})

	const cellClassName = classes?.cell
	const columns = useMemo(
		() =>
			days.map((day, index) => ({
				id: keys.col.allDay(day, index),
				day: toOffsetIso(day),
				gridType: 'day' as const,
				className: cn('h-full min-h-12 bg-background', cellClassName),
			})),
		[days, cellClassName]
	)

	return (
		<div
			className={rowSlot.className}
			data-testid="all-day-row"
			style={rowSlot.style}
		>
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
