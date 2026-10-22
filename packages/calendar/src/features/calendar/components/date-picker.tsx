import { Button } from '@ilamy/ui/components/button'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@ilamy/ui/components/popover'
import { cn } from '@ilamy/ui/lib/utils'
import dayjs from '@ilamy/utils/dayjs'
import { PopoverClose } from '@radix-ui/react-popover'
import { Calendar as CalendarIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Calendar } from '@/features/calendar/components/calendar'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'

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
	const { firstDayOfWeek, t } = useSmartCalendarContext((context) => ({
		firstDayOfWeek: context.firstDayOfWeek,
		t: context.t,
	}))
	const popOverRef = useRef<HTMLButtonElement | null>(null)
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(date)

	useEffect(() => {
		setSelectedDate(date)
	}, [date])

	const handleDateSelect = (date: Date | undefined) => {
		setSelectedDate(date)
		if (closeOnSelect) {
			popOverRef.current?.click()
		}
		onChange?.(date)
	}

	const valueId = useId()

	return (
		<div className={className}>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						aria-labelledby={`${labelId} ${valueId}`}
						className={cn(
							'data-[empty=true]:text-muted-foreground w-full justify-start text-left font-normal'
						)}
						data-empty={!date}
						id={id}
						variant="outline"
					>
						<CalendarIcon />
						<span id={valueId}>
							{selectedDate ? dayjs(selectedDate).format('ll') : t('pickDate')}
						</span>
					</Button>
				</PopoverTrigger>
				<PopoverContent align="start" className="w-auto p-0">
					<PopoverClose ref={popOverRef} style={{ display: 'none' }} />
					<Calendar
						defaultMonth={selectedDate}
						disabled={disabled}
						firstDayOfWeek={firstDayOfWeek}
						onSelect={handleDateSelect}
						selected={selectedDate}
					/>
				</PopoverContent>
			</Popover>
		</div>
	)
}
