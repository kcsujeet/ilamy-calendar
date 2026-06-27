import { Button } from '@ilamy/ui/components/button'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@ilamy/ui/components/popover'
import { cn } from '@ilamy/ui/lib/utils'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { ChevronDown } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { useDateTimeFormatters } from '@/hooks/use-date-time-formatters'
import { getWeekDays } from '@/lib/utils/date-utils'
import { MonthGrid } from './month-grid'
import { YearGrid } from './year-grid'

interface HeaderDatePickerProps {
	className?: string
}

// Agenda mirrors the day/week/month grid view's picker according to its window,
// read off the view's navigationStep (day -> day, week -> week, month -> month).
// A custom N-day window has no grid equivalent, so it keeps the day picker and a
// range title.
function getAgendaPickerView(
	step: { amount: number; unit: string } | undefined
): 'day' | 'week' | 'month' | 'agenda' {
	const isSingleDayWindow = step?.unit === 'day' && step.amount === 1
	if (step?.unit === 'month') return 'month'
	if (step?.unit === 'week') return 'week'
	if (isSingleDayWindow) return 'day'
	return 'agenda'
}

// The header title doubles as a navigation dropdown: clicking it opens a
// view-appropriate picker (day grid, week grid, month grid, or year grid).
export function HeaderDatePicker({ className }: HeaderDatePickerProps) {
	const {
		currentDate,
		currentRange,
		view,
		selectDate,
		firstDayOfWeek,
		getViews,
	} = useSmartCalendarContext((ctx) => ({
		currentDate: ctx.currentDate,
		currentRange: ctx.currentRange,
		view: ctx.view,
		selectDate: ctx.selectDate,
		firstDayOfWeek: ctx.firstDayOfWeek,
		getViews: ctx.getViews,
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

	// Agenda borrows the matching grid view's title/picker for its window; a
	// custom-window agenda keeps the 'agenda' (range + day picker) form.
	const activeView = getViews().find((v) => v.name === view)
	const isAgendaView = view === 'agenda'
	const effectiveView = isAgendaView
		? getAgendaPickerView(activeView?.navigationStep)
		: view

	// Title and picker are keyed by view; unknown views fall back to the day form.
	const titleByView: Partial<Record<string, string>> = {
		year: currentDate.format('YYYY'),
		month: currentDate.format('MMM YYYY'),
		week: formatDateRange(weekStart, weekEnd),
		day: currentDate.format('ddd, MMM D, YYYY'),
		// Custom-window agenda: show the listed range, not one day.
		agenda: formatDateRange(currentRange.start, currentRange.end),
	}
	const title = titleByView[effectiveView] ?? currentDate.format('MMM D, YYYY')

	const contentByView: Partial<Record<string, ReactNode>> = {
		year: <YearGrid onSelect={handleSelect} selected={currentDate} />,
		month: <MonthGrid onSelect={handleSelect} selected={currentDate} />,
		week: (
			<Calendar
				defaultMonth={currentDate.toDate()}
				firstDayOfWeek={firstDayOfWeek}
				highlightedWeekOf={currentDate}
				onSelect={(d) => d && handleSelect(dayjs(d))}
				weekHover
			/>
		),
	}
	const content = contentByView[effectiveView] ?? (
		<Calendar
			defaultMonth={currentDate.toDate()}
			firstDayOfWeek={firstDayOfWeek}
			onSelect={(d) => d && handleSelect(dayjs(d))}
			selected={currentDate.toDate()}
		/>
	)

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
