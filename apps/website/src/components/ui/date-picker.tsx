import { dayjs } from '@ilamy/calendar'
import { PopoverClose } from '@radix-ui/react-popover'
import { Calendar as CalendarIcon } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DatePickerProps {
	date: Date | undefined
	setDate: (date: Date | undefined) => void
	label?: string
	className?: string
	closeOnSelect?: boolean
}

export function DatePicker({
	date,
	closeOnSelect,
	setDate,
	label = 'Pick a date',
	className,
}: DatePickerProps) {
	const popOverRef = useRef<HTMLButtonElement | null>(null)

	const onSelect = (date: Date | undefined) => {
		setDate(date)
		if (closeOnSelect) {
			popOverRef.current?.click()
		}
	}

	return (
		<div className={className}>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						className={cn(
							'w-full justify-start text-left font-normal',
							!date && 'text-muted-foreground'
						)}
						variant="outline"
					>
						<CalendarIcon className="mr-2 h-4 w-4" />
						{date ? dayjs(date).format('MMM D, YYYY') : <span>{label}</span>}
					</Button>
				</PopoverTrigger>
				<PopoverContent align="start" className="w-auto p-0">
					<PopoverClose ref={popOverRef} />
					<Calendar
						defaultMonth={date}
						mode="single"
						onSelect={onSelect}
						selected={date}
					/>
				</PopoverContent>
			</Popover>
		</div>
	)
}
