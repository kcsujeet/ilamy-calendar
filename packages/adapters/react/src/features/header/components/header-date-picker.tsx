import { getWeekDays, withoutHiddenDays } from '@ilamy/core'
import type { PluginView } from '@ilamy/types'
import {
	endOf,
	formatDate,
	now,
	parseDate,
	resolveZone,
	startOf,
	toDate,
	toOffsetIso,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import { ChevronDown } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { useDateTimeFormatters } from '@/hooks/use-date-time-formatters'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import {
	useCalendarComponents,
	useSlotProps,
} from '@/stores/calendar-theme-context'
import { MonthGrid } from './month-grid'
import { YearGrid } from './year-grid'

interface HeaderDatePickerProps {
	className?: string
}

type PickerKind = 'day' | 'week' | 'month' | 'year' | 'range'

const PICKER_BY_UNIT: Partial<Record<string, PickerKind>> = {
	day: 'day',
	week: 'week',
	month: 'month',
	year: 'year',
}

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

export function HeaderDatePicker({ className }: HeaderDatePickerProps) {
	const {
		currentDate: currentDateIso,
		currentRange,
		currentLocale,
		timezone,
		view,
		selectDate,
		firstDayOfWeek,
		hiddenDays,
		getViews,
	} = useSmartCalendarContext((ctx) => ({
		currentDate: ctx.currentDate,
		currentRange: ctx.currentRange,
		currentLocale: ctx.currentLocale,
		timezone: ctx.timezone,
		view: ctx.view,
		selectDate: ctx.selectDate,
		firstDayOfWeek: ctx.firstDayOfWeek,
		hiddenDays: ctx.hiddenDays,
		getViews: ctx.getViews,
	}))
	const { Button, Popover } = useCalendarComponents()
	const triggerSlot = useSlotProps('navButton', {
		defaultClassName: 'font-semibold',
		extraClassName: className,
	})
	const { formatDateRange, formatTitle } = useDateTimeFormatters()
	const [open, setOpen] = useState(false)

	const zone = resolveZone(timezone)
	const currentDate = parseDate(currentDateIso, zone) ?? now(zone)
	const rangeStart = parseDate(currentRange.start, zone) ?? currentDate
	const rangeEnd = parseDate(currentRange.end, zone) ?? currentDate

	const activeView = getViews().find((v) => v.name === view)
	const kind = pickerKind(activeView)

	const viewDropsHiddenDays = Boolean(activeView?.columns)
	const weekDaysIncludingHidden = getWeekDays(currentDate, firstDayOfWeek)
	const weekDays = viewDropsHiddenDays
		? withoutHiddenDays(weekDaysIncludingHidden, hiddenDays)
		: weekDaysIncludingHidden
	const weekStart = weekDays.at(0) ?? currentDate
	const weekEnd = weekDays.at(-1) ?? currentDate

	const handleSelect = (date: ZonedDate) => {
		selectDate(toOffsetIso(date))
		setOpen(false)
	}

	const handlePickerDate = (date: Date | undefined) => {
		if (!date) return
		const parsed = parseDate(date, zone)
		if (parsed) {
			handleSelect(parsed)
		}
	}

	const titleByKind: Record<PickerKind, string> = {
		year: formatDate(currentDate, { year: 'numeric' }, currentLocale),
		month: formatDate(
			currentDate,
			{ month: 'short', year: 'numeric' },
			currentLocale
		),
		week: formatDateRange(weekStart, weekEnd),
		day: formatDate(
			currentDate,
			{ weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' },
			currentLocale
		),
		range: formatDateRange(rangeStart, rangeEnd),
	}
	const titleRangeByKind: Record<PickerKind, [ZonedDate, ZonedDate]> = {
		year: [
			startOf(currentDate, 'year'),
			startOf(endOf(currentDate, 'year'), 'day'),
		],
		month: [
			startOf(currentDate, 'month'),
			startOf(endOf(currentDate, 'month'), 'day'),
		],
		week: [weekStart, weekEnd],
		day: [currentDate, currentDate],
		range: [rangeStart, rangeEnd],
	}
	const [titleStart, titleEnd] = titleRangeByKind[kind]
	const title = formatTitle(titleStart, titleEnd) ?? titleByKind[kind]

	const selectedAsDate = toDate(currentDate)
	const dayPicker = (
		<Calendar
			defaultMonth={selectedAsDate}
			firstDayOfWeek={firstDayOfWeek}
			onSelect={handlePickerDate}
			selected={selectedAsDate}
		/>
	)
	const contentByKind: Record<PickerKind, ReactNode> = {
		year: <YearGrid onSelect={handleSelect} selected={currentDate} />,
		month: <MonthGrid onSelect={handleSelect} selected={currentDate} />,
		week: (
			<Calendar
				defaultMonth={selectedAsDate}
				firstDayOfWeek={firstDayOfWeek}
				highlightedWeekOf={currentDate}
				onSelect={handlePickerDate}
				weekHover
			/>
		),
		day: dayPicker,
		range: dayPicker,
	}

	const trigger = (
		<Button
			aria-expanded={open}
			aria-haspopup="dialog"
			className={triggerSlot.className}
			data-ilamy-slot="nav-button"
			data-testid="calendar-title"
			style={triggerSlot.style}
			type="button"
			variant="outline"
		>
			{title}
			<ChevronDown aria-hidden="true" className="size-4 shrink-0 opacity-50" />
		</Button>
	)

	return (
		<Popover
			align="start"
			className="w-auto p-0"
			content={contentByKind[kind]}
			onOpenChange={setOpen}
			open={open}
			trigger={trigger}
		/>
	)
}
