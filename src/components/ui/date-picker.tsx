import { PopoverClose } from '@radix-ui/react-popover'
import { Calendar as CalendarIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Matcher } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import dayjs from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'

interface DatePickerProps {
	date: Date | undefined
	onChange?: (date: Date | undefined) => void
	label?: string
	className?: string
	closeOnSelect?: boolean
	disabled?: Matcher | Matcher[]
}

export function DatePicker({
	date,
	closeOnSelect,
	onChange,
	label = 'Pick a date',
	className,
	disabled,
}: DatePickerProps) {
	const popOverRef = useRef<HTMLButtonElement | null>(null)
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(date)

	// Sync date state with date prop
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

	return (
		<div className={className}>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						data-empty={!date}
						className={cn(
							'data-[empty=true]:text-muted-foreground w-full justify-start text-left font-normal'
						)}
					>
						<CalendarIcon />
						{selectedDate ? (
							dayjs(selectedDate).format('MMM D, YYYY')
						) : (
							<span>{label}</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<PopoverClose ref={popOverRef} />
					<Calendar
						mode="single"
						selected={selectedDate}
						defaultMonth={selectedDate}
						onSelect={handleDateSelect}
						captionLayout="dropdown"
						disabled={disabled}
					/>
				</PopoverContent>
			</Popover>
		</div>
	)
}
