import { PopoverClose } from '@radix-ui/react-popover'
import { Calendar as CalendarIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { cn } from '@/lib/utils'
import { formatLocaleDate } from '@/lib/utils/date-locale-format'

interface DatePickerProps {
	date: Date | undefined
	onChange?: (date: Date | undefined) => void
	label?: string
	className?: string
	closeOnSelect?: boolean
	disabled?: (date: Date) => boolean
	locale?: string
	firstDayOfWeek?: number
}

export function DatePicker({
	date,
	closeOnSelect,
	onChange,
	label,
	className,
	disabled,
	locale: localeProp,
	firstDayOfWeek: firstDayOfWeekProp,
}: DatePickerProps) {
	const { currentLocale, firstDayOfWeek, t, currentDate } =
		useSmartCalendarContext((ctx) => ({
			currentLocale: ctx.currentLocale,
			firstDayOfWeek: ctx.firstDayOfWeek,
			t: ctx.t,
			currentDate: ctx.currentDate,
		}))

	const locale = localeProp ?? currentLocale ?? currentDate.locale()
	const weekStart = firstDayOfWeekProp ?? firstDayOfWeek ?? 0
	const emptyLabel = label ?? t('pickADate')

	const popOverRef = useRef<HTMLButtonElement | null>(null)
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(date)

	useEffect(() => {
		setSelectedDate(date)
	}, [date])

	const handleDateSelect = (nextDate: Date | undefined) => {
		setSelectedDate(nextDate)
		if (closeOnSelect) {
			popOverRef.current?.click()
		}
		onChange?.(nextDate)
	}

	const formattedDate = selectedDate
		? formatLocaleDate(selectedDate, locale, {
				month: 'short',
				day: 'numeric',
				year: 'numeric',
			})
		: null

	return (
		<div className={className}>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						className={cn(
							'data-[empty=true]:text-muted-foreground w-full justify-start text-left font-normal'
						)}
						data-empty={!date}
						variant="outline"
					>
						<CalendarIcon />
						{formattedDate ? (
							<span>{formattedDate}</span>
						) : (
							<span>{emptyLabel}</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent align="start" className="w-auto p-0">
					<PopoverClose ref={popOverRef} style={{ display: 'none' }} />
					<Calendar
						defaultMonth={selectedDate}
						disabled={disabled}
						firstDayOfWeek={weekStart}
						locale={locale}
						nextMonthLabel={t('nextMonth')}
						onSelect={handleDateSelect}
						previousMonthLabel={t('previousMonth')}
						selected={selectedDate}
					/>
				</PopoverContent>
			</Popover>
		</div>
	)
}
