import type { IsoDateString } from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import { now, parseDate, resolveZone } from '@ilamy/utils/temporal'
import type React from 'react'
import { CURRENT_HOUR_LABEL_CLASS } from '@/config/constants'
import { HourLabel } from '@/features/calendar/components/hour-label'
import { keys } from '@/features/calendar/utils/keys'
import type { VerticalGridColProps } from './vertical-grid-col'

export const GUTTER_WIDTH = 'w-16 min-w-16 max-w-16'
export const FULL_WIDTH_MINUS_GUTTER = 'w-[calc(100%-4rem)]'
export const RESPONSIVE_GUTTER_WIDTH =
	'w-10 sm:w-16 min-w-10 sm:min-w-16 max-w-10 sm:max-w-16'
export const STICKY_GUTTER_SHADOW =
	'shadow-[1px_0_0_0_color-mix(in_oklch,var(--background),var(--foreground)_10%)]'

interface GutterColumnOptions {
	days: IsoDateString[]
	gridType: 'day' | 'hour'
	timezone?: string
	renderLabel?: (date: IsoDateString) => React.ReactNode
	widthClassName?: string
	showsToday?: boolean
}

export const gutterColumn = ({
	days,
	gridType,
	timezone,
	renderLabel,
	widthClassName = GUTTER_WIDTH,
	showsToday = false,
}: GutterColumnOptions): VerticalGridColProps => {
	const isHourGutter = gridType === 'hour'
	const zone = resolveZone(timezone)

	return {
		id: isHourGutter ? keys.col.time : keys.col.date,
		day: undefined,
		days,
		className: cn(
			'shrink-0',
			widthClassName,
			'sticky left-0 bg-background z-20',
			STICKY_GUTTER_SHADOW
		),
		'data-sticky-inset': 'left',
		gridType,
		noEvents: true,
		renderCell: (dateIso: IsoDateString) => {
			const date = parseDate(dateIso, zone)
			const nowHour = now(zone).hour
			const isNowHourOfDay = Boolean(date && date.hour === nowHour)
			const isCurrentHour = isHourGutter && showsToday && isNowHourOfDay
			const labelColorClass = isCurrentHour
				? CURRENT_HOUR_LABEL_CLASS
				: 'text-muted-foreground'
			const currentMarker = isCurrentHour ? 'time' : undefined
			const label = renderLabel
				? renderLabel(dateIso)
				: date && <HourLabel date={date} />

			return (
				<div
					aria-current={currentMarker}
					className={cn(
						'h-full p-2 text-right text-[10px] sm:text-xs flex flex-col items-center',
						labelColorClass
					)}
				>
					{label}
				</div>
			)
		},
	}
}
