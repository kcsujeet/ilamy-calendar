import { Clock } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAutocompleteTimepicker } from '@/hooks/use-autocomplete-timepicker'
import { cn } from '@/lib/utils'
import { ids } from '@/lib/utils/ids'
import type { TimeFormat } from '@/types'

const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
	// Prevent event from bubbling to prevent Popover from closing
	e.stopPropagation()
}

interface TimePickerProps {
	value: string
	onChange: (value: string) => void
	minTime?: string
	maxTime?: string
	timeFormat?: TimeFormat
	placeholder?: string
	className?: string
	disabled?: boolean
	name?: string
}

export function TimePicker({
	value,
	onChange,
	minTime = '00:00',
	maxTime = '23:45',
	timeFormat = '12-hour',
	placeholder = 'Select time...',
	className,
	disabled = false,
	name,
}: TimePickerProps) {
	const [open, setOpen] = useState(false)
	const [search, setSearch] = useState('')
	const inputRef = useRef<HTMLInputElement>(null)
	const triggerRef = useRef<HTMLButtonElement>(null)
	const [triggerWidth, setTriggerWidth] = useState<number>(0)

	const { timeOptions, formatTime } = useAutocompleteTimepicker({
		timeFormat,
		minTime,
		maxTime,
	})

	// Filter time options based on search
	const filteredOptions = timeOptions.filter((time) => {
		const formattedTime = formatTime(time)
		return formattedTime.toLowerCase().includes(search.toLowerCase())
	})

	const handleSelect = (time: string) => {
		onChange(time)
		setOpen(false)
		setSearch('')
	}

	// Measure trigger width and focus input when popover opens
	useEffect(() => {
		if (open) {
			if (triggerRef.current) {
				setTriggerWidth(triggerRef.current.offsetWidth)
			}
			setTimeout(() => {
				inputRef.current?.focus()
			}, 0)
		}
	}, [open])

	const currentTimeString = value ? formatTime(value) : placeholder

	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger asChild>
				<Button
					aria-controls="time-picker-listbox"
					aria-expanded={open}
					className={cn('w-full justify-start', className)}
					data-testid={ids.timePicker(name || '')}
					disabled={disabled}
					ref={triggerRef}
					role="combobox"
					variant="outline"
				>
					<Clock className="mr-2 h-4 w-4" />
					{currentTimeString}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="p-0"
				style={{ width: triggerWidth }}
			>
				<div className="p-2 border-b">
					<Input
						className="h-8"
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search time..."
						ref={inputRef}
						value={search}
					/>
				</div>
				<ScrollArea className="h-[200px]" onWheel={handleWheel}>
					<div className="p-1">
						{filteredOptions.length === 0 ? (
							<div className="py-6 text-center text-sm text-muted-foreground">
								N/A
							</div>
						) : (
							filteredOptions.map((time) => {
								const timeString = formatTime(time)
								const isSelected = time === value
								return (
									<button
										className={cn(
											'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground',
											isSelected && 'bg-accent text-accent-foreground'
										)}
										key={time}
										onClick={() => handleSelect(time)}
										type="button"
									>
										{timeString}
									</button>
								)
							})
						)}
					</div>
				</ScrollArea>
			</PopoverContent>
		</Popover>
	)
}
