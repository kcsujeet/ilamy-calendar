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
import dayjs from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'

interface DatePickerProps {
	date: Date | undefined
	onChange?: (date: Date | undefined) => void
	label?: string
	className?: string
	closeOnSelect?: boolean
	disabled?: (date: Date) => boolean
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
						className={cn(
							'data-[empty=true]:text-muted-foreground w-full justify-start text-left font-normal'
						)}
						data-empty={!date}
						variant="outline"
					>
						<CalendarIcon />
						{selectedDate ? (
							dayjs(selectedDate).format('MMM D, YYYY')
						) : (
							<span>{label}</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent align="start" className="w-auto p-0">
					<PopoverClose ref={popOverRef} style={{ display: 'none' }} />
					<Calendar
						defaultMonth={selectedDate}
						disabled={disabled}
						onSelect={handleDateSelect}
						selected={selectedDate}
					/>
				</PopoverContent>
			</Popover>
		</div>
	)
}
