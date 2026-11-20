import { useIlamyCalendarContext } from '@ilamy/calendar'
import { cn } from '@ilamy/ui/lib/utils'
import { dayKey, parseDate, resolveZone, toDate } from '@ilamy/utils/temporal'
import type * as React from 'react'

interface DateInputProps {
	date: Date | undefined
	onChange?: (date: Date | undefined) => void
	className?: string
}

export const DateInput: React.FC<DateInputProps> = ({
	date,
	onChange,
	className,
}) => {
	const { timezone } = useIlamyCalendarContext()
	const zone = resolveZone(timezone)
	const parsedDate = date ? parseDate(date, zone) : undefined
	const inputValue = parsedDate ? dayKey(parsedDate) : ''

	const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
		const raw = event.target.value
		if (!raw) {
			onChange?.(undefined)
			return
		}
		const parsed = parseDate(raw, zone)
		onChange?.(parsed ? toDate(parsed) : undefined)
	}

	return (
		<input
			className={cn(
				'flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-shadow focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
				className
			)}
			onChange={handleChange}
			type="date"
			value={inputValue}
		/>
	)
}
