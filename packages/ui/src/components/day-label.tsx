import type React from 'react'
import { cn } from '../lib/utils'

interface DayLabelProps {
	/**
	 * True when this day is today: fills the number circle, tints the weekday,
	 * and exposes `data-today="true"` as a styling/selection hook.
	 */
	today: boolean
	/** Day-of-month, e.g. "13". */
	dayNumber: React.ReactNode
	/** Weekday label, e.g. "Mon". Omit to render the number alone (grid cells). */
	weekday?: React.ReactNode
	/**
	 * Extra classes for the outer flex-col wrapper. Pass `flex-col-reverse` to
	 * stack the number above the weekday (e.g. month / agenda headers).
	 */
	className?: string
	/** Omit default Tailwind visual styling when the calendar is in unstyled mode. */
	unstyled?: boolean
	/** Test id forwarded to the number badge. */
	'data-testid'?: string
}

/**
 * Context-free, today-aware day label: a fixed-size round number badge (filled
 * with the primary color when `today`), optionally stacked with a muted weekday
 * label (primary-colored when `today`). The single source of truth for today
 * highlighting across calendar views and plugins. Order is weekday-above-number
 * by default; pass `className="flex-col-reverse"` to put the number on top (no
 * markup change), so the styling stays identical at every call site.
 */
export const DayLabel = ({
	today,
	dayNumber,
	weekday,
	className,
	unstyled = false,
	'data-testid': dataTestId,
}: DayLabelProps) => {
	return (
		<div
			className={cn('flex flex-col items-center', className)}
			data-testid={dataTestId}
			data-today={today ? 'true' : undefined}
		>
			{weekday != null && (
				<div
					className={cn(
						'w-full truncate text-center',
						!unstyled && 'text-xs text-muted-foreground',
						!unstyled && today && 'text-primary'
					)}
				>
					{weekday}
				</div>
			)}
			<div
				className={cn(
					'flex shrink-0 items-center justify-center',
					!unstyled && 'h-5 w-5 rounded-full text-xs font-medium',
					!unstyled && today && 'bg-primary text-primary-foreground'
				)}
			>
				{dayNumber}
			</div>
		</div>
	)
}
