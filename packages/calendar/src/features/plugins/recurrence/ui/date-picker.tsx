import { dayjs } from '@ilamy/calendar'
import type * as React from 'react'
import { cn } from './cn'

interface DatePickerProps {
	date: Date | undefined
	onChange?: (date: Date | undefined) => void
	className?: string
}

const DATE_INPUT_FORMAT = 'YYYY-MM-DD'

export const DatePicker: React.FC<DatePickerProps> = ({
	date,
	onChange,
	className,
}) => {
	const inputValue = date ? dayjs(date).format(DATE_INPUT_FORMAT) : ''

	const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
		const raw = event.target.value
		if (!raw) {
			onChange?.(undefined)
			return
		}
		const parsed = dayjs(raw, DATE_INPUT_FORMAT)
		onChange?.(parsed.isValid() ? parsed.toDate() : undefined)
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
