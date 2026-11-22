import { ScrollArea } from '@ilamy/ui/components/scroll-area'
import { cn } from '@ilamy/ui/lib/utils'
import { Clock } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useAutocompleteTimepicker } from '@/hooks/use-autocomplete-timepicker'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { useCalendarComponents } from '@/stores/calendar-theme-context'
import type { TimeFormat } from '@/types'
import { keys } from '@/utils/keys.utils'

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
	/** Id of the trigger, so a `<label htmlFor>` can point at it. */
	id?: string
	/** Id of the visible label; the trigger is named by it plus the time it shows. */
	labelId: string
	className?: string
	disabled?: boolean
	name?: string
}

interface TimePanelProps {
	options: string[]
	selected: string
	formatTime: (time: string) => string
	onSelect: (time: string) => void
}

// The popover's search box and the times that match it. It mounts when the
// popover opens, so the search starts empty and the box takes focus each time.
function TimePanel({
	options,
	selected,
	formatTime,
	onSelect,
}: TimePanelProps) {
	const t = useSmartCalendarContext((context) => context.t)
	const { Input } = useCalendarComponents()
	const [search, setSearch] = useState('')
	const inputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		setTimeout(() => {
			inputRef.current?.focus()
		}, 0)
	}, [])

	const matchingOptions = options.filter((time) =>
		formatTime(time).toLowerCase().includes(search.toLowerCase())
	)
	const optionButtons = matchingOptions.map((time) => {
		const isSelected = time === selected
		return (
			<button
				className={cn(
					'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground',
					isSelected && 'bg-accent text-accent-foreground'
				)}
				key={time}
				onClick={() => onSelect(time)}
				type="button"
			>
				{formatTime(time)}
			</button>
		)
	})
	const emptyState = (
		<div className="py-6 text-center text-sm text-muted-foreground">
			{t('noTimeFound')}
		</div>
	)

	return (
		<>
			<div className="p-2 border-b">
				<Input
					className="h-8"
					onChange={(e) => setSearch(e.target.value)}
					placeholder={t('searchTime')}
					ref={inputRef}
					value={search}
				/>
			</div>
			<ScrollArea className="h-[200px]" onWheel={handleWheel}>
				<div className="p-1">
					{matchingOptions.length === 0 ? emptyState : optionButtons}
				</div>
			</ScrollArea>
		</>
	)
}

const useMeasuredTriggerWidth = (
	triggerRef: React.RefObject<HTMLButtonElement | null>,
	open: boolean
): number => {
	const [triggerWidth, setTriggerWidth] = useState<number>(0)
	useEffect(() => {
		if (open) {
			setTriggerWidth(triggerRef.current?.offsetWidth ?? 0)
		}
	}, [open, triggerRef])
	return triggerWidth
}

export function TimePicker({
	value,
	onChange,
	minTime = '00:00',
	maxTime = '23:45',
	timeFormat = '12-hour',
	id,
	labelId,
	className,
	disabled = false,
	name,
}: TimePickerProps) {
	const t = useSmartCalendarContext((context) => context.t)
	const { Button, Popover } = useCalendarComponents()
	const [open, setOpen] = useState(false)
	const triggerRef = useRef<HTMLButtonElement>(null)
	const triggerWidth = useMeasuredTriggerWidth(triggerRef, open)

	const { timeOptions, formatTime } = useAutocompleteTimepicker({
		timeFormat,
		minTime,
		maxTime,
	})

	const handleSelect = (time: string) => {
		onChange(time)
		setOpen(false)
	}

	const valueId = useId()
	const currentTimeString = value ? formatTime(value) : t('selectTime')

	const trigger = (
		<Button
			aria-expanded={open}
			aria-labelledby={`${labelId} ${valueId}`}
			className={cn('w-full justify-start', className)}
			data-testid={keys.timePicker(name)}
			disabled={disabled}
			id={id}
			ref={triggerRef}
			role="combobox"
			type="button"
			variant="outline"
		>
			<Clock className="mr-2 h-4 w-4" />
			<span id={valueId}>{currentTimeString}</span>
		</Button>
	)

	const content = (
		<TimePanel
			formatTime={formatTime}
			onSelect={handleSelect}
			options={timeOptions}
			selected={value}
		/>
	)

	return (
		<Popover
			align="start"
			className="p-0"
			content={content}
			contentStyle={triggerWidth > 0 ? { width: triggerWidth } : undefined}
			onOpenChange={setOpen}
			open={open}
			trigger={trigger}
		/>
	)
}
