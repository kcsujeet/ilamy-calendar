/** @jsxImportSource preact */
import {
	dayKey,
	parseDate,
	resolveZone,
	toDate,
} from '../../../../utils/temporal'

interface DateInputProps {
	date: Date | undefined
	timezone?: string
	onChange?: (date: Date | undefined) => void
	testId?: string
}

export const DateInput = ({
	date,
	timezone,
	onChange,
	testId,
}: DateInputProps) => {
	const zone = resolveZone(timezone)
	const parsedDate = date ? parseDate(date, zone) : undefined
	const inputValue = parsedDate ? dayKey(parsedDate) : ''

	const handleChange = (event: Event) => {
		const raw = (event.target as HTMLInputElement).value
		if (!raw) {
			onChange?.(undefined)
			return
		}
		const parsed = parseDate(raw, zone)
		onChange?.(parsed ? toDate(parsed) : undefined)
	}

	return (
		<input
			data-ilamy-slot="input"
			data-testid={testId}
			onChange={handleChange}
			type="date"
			value={inputValue}
		/>
	)
}
