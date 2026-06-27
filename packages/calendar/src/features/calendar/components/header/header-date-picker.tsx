import { Button } from '@ilamy/ui/components/button'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@ilamy/ui/components/popover'
import { cn } from '@ilamy/ui/lib/utils'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { useDateTimeFormatters } from '@/hooks/use-date-time-formatters'
import { getWeekDays } from '@/lib/utils/date-utils'
import { MonthGrid } from './month-grid'
import { YearGrid } from './year-grid'

interface HeaderDatePickerProps {
	className?: string
}

// The header title doubles as a navigation dropdown: clicking it opens a
// view-appropriate picker (day grid, week grid, month grid, or year grid).
export function HeaderDatePicker({ className }: HeaderDatePickerProps) {
	const { currentDate, view, selectDate, firstDayOfWeek } =
		useSmartCalendarContext((ctx) => ({
			currentDate: ctx.currentDate,
			view: ctx.view,
			selectDate: ctx.selectDate,
			firstDayOfWeek: ctx.firstDayOfWeek,
		}))
	const { formatDateRange } = useDateTimeFormatters()
	const [open, setOpen] = useState(false)

	const weekDays = getWeekDays(currentDate, firstDayOfWeek)
	const weekStart = weekDays.at(0) ?? currentDate
	const weekEnd = weekDays.at(-1) ?? currentDate

	const handleSelect = (date: Dayjs) => {
		selectDate(date)
		setOpen(false)
	}

	const title = (() => {
		if (view === 'year') {
			return currentDate.format('YYYY')
		}
		if (view === 'month') {
			return currentDate.format('MMM YYYY')
		}
		if (view === 'week') {
			return formatDateRange(weekStart, weekEnd)
		}
		if (view === 'day') {
			return currentDate.format('ddd, MMM D, YYYY')
		}
		return currentDate.format('MMM D, YYYY')
	})()

	const content = (() => {
		if (view === 'year') {
			return <YearGrid onSelect={handleSelect} selected={currentDate} />
		}
		if (view === 'month') {
			return <MonthGrid onSelect={handleSelect} selected={currentDate} />
		}
		if (view === 'week') {
			return (
				<Calendar
					defaultMonth={currentDate.toDate()}
					firstDayOfWeek={firstDayOfWeek}
					highlightedWeekOf={currentDate}
					onSelect={(d) => d && handleSelect(dayjs(d))}
					weekHover
				/>
			)
		}
		return (
			<Calendar
				defaultMonth={currentDate.toDate()}
				firstDayOfWeek={firstDayOfWeek}
				onSelect={(d) => d && handleSelect(dayjs(d))}
				selected={currentDate.toDate()}
			/>
		)
	})()

	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger asChild>
				<Button
					className={cn('font-semibold', className)}
					data-testid="calendar-title"
					variant="outline"
				>
					{title}
					<ChevronDown className="size-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-auto p-0">
				{content}
			</PopoverContent>
		</Popover>
	)
}
