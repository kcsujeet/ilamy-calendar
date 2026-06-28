import type { PluginView } from '@ilamy/types'
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

type PickerKind = 'day' | 'week' | 'month' | 'year' | 'range'

// A single navigation unit maps to that grid's picker; everything else is a range.
const PICKER_BY_UNIT: Partial<Record<string, PickerKind>> = {
	day: 'day',
	week: 'week',
	month: 'month',
	year: 'year',
}

// The title dropdown is a jump-to-date aid, so its picker form (and the title
// format) follow how far the view navigates — metadata every view already
// declares for prev/next via `navigationStep` / `navigationUnit`. A view that
// steps a single day/week/month/year borrows that grid's picker; anything else
// (a multi-unit or custom window) has no single cell to pick, so it shows the day
// picker over the view's range. Nothing here references a view by name, so core
// stays agnostic of agenda or any third-party view. Mirrors the step resolution
// in use-calendar-navigation.
function pickerKind(view: PluginView | undefined): PickerKind {
	const step = view?.navigationStep ?? {
		amount: 1,
		unit: view?.navigationUnit ?? 'day',
	}
	if (step.amount !== 1) {
		return 'range'
	}
	return PICKER_BY_UNIT[step.unit] ?? 'range'
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

	// Title and picker are keyed by the derived picker kind, not the view name.
	const kind = pickerKind(getViews().find((v) => v.name === view))

	const titleByKind: Record<PickerKind, string> = {
		year: currentDate.format('YYYY'),
		month: currentDate.format('MMM YYYY'),
		week: formatDateRange(weekStart, weekEnd),
		day: currentDate.format('ddd, MMM D, YYYY'),
		// A multi-unit/custom window shows its listed range, not a single day.
		range: formatDateRange(currentRange.start, currentRange.end),
	}
	const title = titleByKind[kind]

	// Both 'day' and 'range' navigate within days, so both use the day calendar;
	// only their titles differ.
	const dayPicker = (
		<Calendar
			defaultMonth={currentDate.toDate()}
			firstDayOfWeek={firstDayOfWeek}
			onSelect={(d) => d && handleSelect(dayjs(d))}
			selected={currentDate.toDate()}
		/>
	)
	const contentByKind: Record<PickerKind, ReactNode> = {
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
		day: dayPicker,
		range: dayPicker,
	}
	const content = contentByKind[kind]

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
