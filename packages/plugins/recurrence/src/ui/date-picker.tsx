import { cn } from '@ilamy/ui/lib/utils'
import dayjs from '@ilamy/utils/dayjs'
import type * as React from 'react'

interface DatePickerProps {
	date: Date | undefined
	/**
	 * Receives start of day in the calendar's configured timezone, which east of
	 * UTC is the previous UTC day. Callers that need a whole-day boundary must
	 * normalize (`dayjs(value).endOf('day')`) rather than use the instant as-is.
	 */
	onChange?: (date: Date | undefined) => void
	className?: string
}

/**
 * `<input type="date">` both renders and reports its value in this shape, so it
 * is used for display formatting only — never as a parse format. The configured
 * dayjs (`@ilamy/utils/dayjs`) forwards extra constructor arguments to
 * `dayjs.tz()`, whose second parameter is a TIMEZONE, so passing this as a parse
 * format throws `RangeError: invalid time zone`.
 */
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
		// `raw` is already an ISO date ('YYYY-MM-DD') from the native date input, so
		// the single-argument constructor parses it correctly and honours the
		// calendar's configured timezone.
		const parsed = dayjs(raw)
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
