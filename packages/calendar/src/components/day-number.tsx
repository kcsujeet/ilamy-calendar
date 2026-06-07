import type React from 'react'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'
import { isToday } from '@/lib/utils/date-utils'
import { keys } from '@/lib/utils/keys'

interface DayNumberProps {
	date: Dayjs
	locale?: string
	className?: string
}

/**
 * Renders the day number for a calendar cell, highlighting 'today' with a primary background.
 */
export const DayNumber: React.FC<DayNumberProps> = ({ date, className }) => {
	const today = isToday(date)

	return (
		<div
			className={cn(
				'flex h-5 w-5 items-center justify-center rounded-full text-xs shrink-0',
				today && 'bg-primary text-primary-foreground font-medium',
				className
			)}
			data-testid={keys.dayNumber(date)}
		>
			{date.format('D')}
		</div>
	)
}
