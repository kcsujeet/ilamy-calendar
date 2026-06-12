import type React from 'react'
import { HourLabel } from '@/components/hour-label/hour-label'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'
import { keys } from '@/lib/utils/keys'
import type { VerticalGridColProps } from './vertical-grid-col'

/** Fixed gutter width (day view, the resource vertical views). */
export const GUTTER_WIDTH = 'w-16 min-w-16 max-w-16'
/**
 * The lone event column beside the fixed gutter: 100% minus the gutter's
 * 4rem (`w-16`). The `4rem` here and `GUTTER_WIDTH` above encode the same
 * width — change them together.
 */
export const FULL_WIDTH_MINUS_GUTTER = 'w-[calc(100%-4rem)]'
/** Responsive gutter width (week view + its all-day spacer). */
export const RESPONSIVE_GUTTER_WIDTH =
	'w-10 sm:w-16 min-w-10 sm:min-w-16 max-w-10 sm:max-w-16'

interface GutterColumnOptions {
	/** Cells of the gutter: hour slots for time gutters, dates for date gutters. */
	days: Dayjs[]
	gridType: 'day' | 'hour'
	/** Per-cell label. Defaults to `<HourLabel />` for 'hour' gutters. */
	renderLabel?: (date: Dayjs) => React.ReactNode
	/** Width utilities; defaults to the fixed `GUTTER_WIDTH`. */
	widthClassName?: string
}

/**
 * The sticky left gutter column (time or date labels), defined once.
 * Replaces the column literal previously pasted into every vertical view.
 */
export const gutterColumn = ({
	days,
	gridType,
	renderLabel,
	widthClassName = GUTTER_WIDTH,
}: GutterColumnOptions): VerticalGridColProps => ({
	id: gridType === 'hour' ? keys.col.time : keys.col.date,
	day: undefined,
	days,
	className: cn(
		'shrink-0',
		widthClassName,
		'sticky left-0 bg-background z-20 border-r-0'
	),
	gridType,
	noEvents: true,
	renderCell: (date: Dayjs) => (
		<div className="text-muted-foreground p-2 text-right text-[10px] sm:text-xs flex flex-col items-center">
			{renderLabel ? renderLabel(date) : <HourLabel date={date} />}
		</div>
	),
})
