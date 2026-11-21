import { cn } from '@ilamy/ui/lib/utils'
import { formatDate, parseDate, resolveZone } from '@ilamy/utils/temporal'
import { Calendar as CalendarIcon } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { Calendar } from '@/features/calendar/components/calendar'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { useCalendarComponents } from '@/features/calendar/stores/calendar-theme-context'

interface DatePickerProps {
	date: Date | undefined
	onChange?: (date: Date | undefined) => void
	/** Id of the trigger, so a `<label htmlFor>` can point at it. */
	id?: string
	/** Id of the visible label; the trigger is named by it plus the date it shows. */
	labelId: string
	className?: string
	closeOnSelect?: boolean
	disabled?: (date: Date) => boolean
}

export function DatePicker({
	date,
	closeOnSelect,
	onChange,
	id,
	labelId,
	className,
	disabled,
}: DatePickerProps) {
	const { firstDayOfWeek, currentLocale, t, timezone } =
		useSmartCalendarContext((context) => ({
			firstDayOfWeek: context.firstDayOfWeek,
			currentLocale: context.currentLocale,
			t: context.t,
			timezone: context.timezone,
		}))
	const { Button, Popover } = useCalendarComponents()
	const [open, setOpen] = useState(false)
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(date)

	useEffect(() => {
		setSelectedDate(date)
	}, [date])

	const handleDateSelect = (nextDate: Date | undefined) => {
		setSelectedDate(nextDate)
		if (closeOnSelect) {
			setOpen(false)
		}
		onChange?.(nextDate)
	}

	const valueId = useId()
	const zone = resolveZone(timezone)
	let parsedSelected: ReturnType<typeof parseDate>
	if (selectedDate) {
		parsedSelected = parseDate(selectedDate, zone)
	}
	let formattedDate: string
	if (parsedSelected) {
		formattedDate = formatDate(
			parsedSelected,
			{ dateStyle: 'medium' },
			currentLocale
		)
	} else {
		formattedDate = t('pickDate')
	}

	const trigger = (
		<Button
			aria-labelledby={`${labelId} ${valueId}`}
			className={cn(
				'data-[empty=true]:text-muted-foreground w-full justify-start text-left font-normal'
			)}
			data-empty={!date}
			id={id}
			type="button"
			variant="outline"
		>
			<CalendarIcon />
			<span id={valueId}>{formattedDate}</span>
		</Button>
	)

	const content = (
		<Calendar
			defaultMonth={selectedDate}
			disabled={disabled}
			firstDayOfWeek={firstDayOfWeek}
			onSelect={handleDateSelect}
			selected={selectedDate}
		/>
	)

	return (
		<div className={className}>
			<Popover
				align="start"
				className="w-auto p-0"
				content={content}
				onOpenChange={setOpen}
				open={open}
				trigger={trigger}
			/>
		</div>
	)
}
