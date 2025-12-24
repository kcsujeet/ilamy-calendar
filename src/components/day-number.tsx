import type React from 'react'
import dayjs from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'
import { ids } from '@/lib/utils/ids'

interface DayNumberProps {
	date: dayjs.Dayjs
	locale?: string
	className?: string
}

/**
 * Renders the day number for a calendar cell, highlighting 'today' with a primary background.
 */
export const DayNumber: React.FC<DayNumberProps> = ({
	date,
	locale = 'en',
	className,
}) => {
	const isToday = date.isSame(dayjs(), 'day')

	return (
		<div
			className={cn(
				'flex h-5 w-5 items-center justify-center rounded-full text-xs shrink-0',
				isToday && 'bg-primary text-primary-foreground font-medium',
				className
			)}
			data-testid={isToday ? ids.dayNumber.today : ids.dayNumber.root(date)}
		>
			{Intl.DateTimeFormat(locale, { day: 'numeric' }).format(date.toDate())}
		</div>
	)
}
