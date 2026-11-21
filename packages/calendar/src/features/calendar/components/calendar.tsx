import { getMonthWeeks, getWeekDays, isToday } from '@ilamy/core'
import { cn } from '@ilamy/ui/lib/utils'
import {
	add,
	dayKey,
	formatDate,
	isAfter,
	isBefore,
	now,
	parseDate,
	resolveZone,
	startOf,
	subtract,
	toDate,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import { type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { PickerNav } from '@/components/ui/picker-nav'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'

interface CalendarProps {
	selected?: Date
	defaultMonth?: Date
	onSelect?: (date: Date | undefined) => void
	disabled?: (date: Date) => boolean
	firstDayOfWeek?: number
	className?: string
	/** Highlight the whole week (the table row) on hover, as one continuous bar —
	 *  for the week picker. Pure CSS via the row's hover state, no JS. */
	weekHover?: boolean
	/** Statically highlight the week containing this day (the current week). The
	 *  hover preview takes over while the pointer is over the calendar. */
	highlightedWeekOf?: ZonedDate
}

interface DayState {
	isOutside: boolean
	isSelected: boolean
	isDisabled: boolean
	isCurrent: boolean
	isTodayDay: boolean
	isCurrentWeek: boolean
	weekHover: boolean
}

const DAY_GRID_KEY_OFFSET: Record<string, number> = {
	ArrowLeft: -1,
	ArrowRight: 1,
	ArrowUp: -7,
	ArrowDown: 7,
}

// Range fill lives on the cell and only the row's ends are rounded, so a week
// reads as one continuous bar. The current week mirrors the day picker's
// selected day (solid `bg-primary`) and stays put; hovering a different week
// shows a lighter `bg-accent` band, exactly like per-day hover. Both can show
// at once, so hovering never clears the active week.
function getCellClass(state: DayState): string {
	const hoverBand = state.weekHover && !state.isCurrentWeek
	return cn(
		'p-0 text-center',
		state.weekHover && 'first:rounded-l-md last:rounded-r-md',
		hoverBand && 'group-hover/week:bg-accent',
		state.isCurrentWeek && 'bg-primary'
	)
}

function getDayButtonClass(state: DayState): string {
	return cn(
		'w-full aspect-square text-sm select-none',
		!state.isDisabled && 'cursor-pointer',
		// Day picker: per-day hover pill. Week picker: the row band is the
		// feedback, so the button stays transparent.
		!(state.weekHover || state.isDisabled) && 'hover:bg-accent rounded-md',
		state.isOutside && 'text-muted-foreground/50',
		state.isCurrent && 'rounded-md ring-1 ring-inset ring-foreground/40',
		// Active week reads like the selected day: solid fill, inverted text.
		state.isCurrentWeek && 'text-primary-foreground font-medium',
		state.isSelected &&
			'bg-primary text-primary-foreground rounded-md font-medium',
		state.isDisabled && 'opacity-50 cursor-not-allowed'
	)
}

function DayCell({
	day,
	locale,
	state,
	onSelect,
	onKeyDown,
}: {
	day: ZonedDate
	locale: string
	state: DayState
	onSelect?: (date: Date | undefined) => void
	onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, day: ZonedDate) => void
}) {
	const fullLabel = formatDate(
		day,
		{ weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
		locale
	)
	return (
		<td
			className={getCellClass(state)}
			data-disabled={state.isDisabled}
			data-outside={state.isOutside}
			data-selected={state.isSelected}
			// biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: date-picker pattern — WAI-ARIA gridcell on td is canonical; keyboard nav lives on the child button
			role="gridcell"
			tabIndex={-1}
		>
			<button
				aria-current={state.isTodayDay ? 'date' : undefined}
				aria-disabled={state.isDisabled}
				aria-hidden={state.isOutside}
				aria-label={fullLabel}
				aria-pressed={state.isSelected}
				className={getDayButtonClass(state)}
				data-day-key={dayKey(day)}
				data-disabled={state.isDisabled}
				data-selected={state.isSelected}
				disabled={state.isDisabled || state.isOutside}
				onClick={() => onSelect?.(toDate(day))}
				onKeyDown={(event) => onKeyDown(event, day)}
				tabIndex={state.isOutside ? -1 : 0}
				type="button"
			>
				{day.day}
			</button>
		</td>
	)
}

export function Calendar({
	selected,
	defaultMonth,
	onSelect,
	disabled,
	firstDayOfWeek = 0,
	className,
	weekHover = false,
	highlightedWeekOf,
}: CalendarProps) {
	const { currentLocale, t, timezone } = useSmartCalendarContext((context) => ({
		currentLocale: context.currentLocale,
		t: context.t,
		timezone: context.timezone,
	}))
	const zone = resolveZone(timezone)
	const [viewMonth, setViewMonth] = useState<ZonedDate>(() => {
		const seed = parseDate(defaultMonth ?? selected, zone) ?? now(zone)
		return startOf(seed, 'month')
	})
	const gridRef = useRef<HTMLTableElement | null>(null)
	const [pendingFocusKey, setPendingFocusKey] = useState<string | null>(null)

	useEffect(() => {
		if (!pendingFocusKey) return
		const button = gridRef.current?.querySelector<HTMLButtonElement>(
			`button[data-day-key="${pendingFocusKey}"]:not(:disabled)`
		)
		button?.focus()
		setPendingFocusKey(null)
	}, [pendingFocusKey])

	const handleDayKeyDown = (
		event: KeyboardEvent<HTMLButtonElement>,
		day: ZonedDate
	) => {
		let target: ZonedDate | null = null
		const offset = DAY_GRID_KEY_OFFSET[event.key]
		if (offset !== undefined) {
			target = add(day, offset, 'day')
		} else if (event.key === 'Home') {
			target = getWeekDays(day, firstDayOfWeek).at(0) ?? day
		} else if (event.key === 'End') {
			target = getWeekDays(day, firstDayOfWeek).at(-1) ?? day
		}
		if (!target) return

		event.preventDefault()
		const targetKey = dayKey(target)
		const sameMonth =
			target.year === viewMonth.year && target.month === viewMonth.month
		if (sameMonth) {
			const button = gridRef.current?.querySelector<HTMLButtonElement>(
				`button[data-day-key="${targetKey}"]:not(:disabled)`
			)
			button?.focus()
			return
		}
		setPendingFocusKey(targetKey)
		setViewMonth(startOf(target, 'month'))
	}

	const weeks = getMonthWeeks(viewMonth, firstDayOfWeek)
	const parsedSelected = selected ? parseDate(selected, zone) : undefined
	const selectedKey = parsedSelected ? dayKey(parsedSelected) : undefined
	const weekdayHeaders = getWeekDays(now(zone), firstDayOfWeek).map((d) =>
		formatDate(d, { weekday: 'short' }, currentLocale).slice(0, 2)
	)

	let highlightStart: ZonedDate | undefined
	let highlightEnd: ZonedDate | undefined
	if (highlightedWeekOf) {
		const highlightedWeek = getWeekDays(highlightedWeekOf, firstDayOfWeek)
		highlightStart = highlightedWeek.at(0)
		highlightEnd = highlightedWeek.at(-1)
	}

	const toDayState = (day: ZonedDate): DayState => {
		const isSelected = dayKey(day) === selectedKey
		let isCurrentWeek = false
		if (highlightStart && highlightEnd) {
			const onOrAfterStart = !isBefore(day, highlightStart, 'day')
			const onOrBeforeEnd = !isAfter(day, highlightEnd, 'day')
			isCurrentWeek = onOrAfterStart && onOrBeforeEnd
		}
		const isSameMonth =
			day.year === viewMonth.year && day.month === viewMonth.month
		const isTodayDay = isToday(day)
		return {
			isOutside: !isSameMonth,
			isSelected,
			isDisabled: disabled?.(toDate(day)) ?? false,
			isCurrent: isTodayDay && !isSelected,
			isTodayDay,
			isCurrentWeek,
			weekHover,
		}
	}

	return (
		<div
			className={cn('bg-background p-3 w-72', className)}
			data-slot="calendar"
		>
			<PickerNav
				label={formatDate(
					viewMonth,
					{ month: 'long', year: 'numeric' },
					currentLocale
				)}
				nextLabel={t('nextMonth')}
				onNext={() => setViewMonth((m) => add(m, 1, 'month'))}
				onPrev={() => setViewMonth((m) => subtract(m, 1, 'month'))}
				prevLabel={t('previousMonth')}
			/>

			<table
				className="w-full border-collapse"
				ref={gridRef}
				// biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: date-picker pattern — WAI-ARIA grid role on a table is canonical for calendars
				role="grid"
			>
				<thead>
					<tr>
						{weekdayHeaders.map((label, i) => (
							<th
								className="text-muted-foreground text-xs font-medium select-none py-1"
								// biome-ignore lint/suspicious/noArrayIndexKey: weekday header order is stable
								key={i}
								scope="col"
							>
								{label}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{weeks.map((week, weekIdx) => (
						<tr
							className={cn(weekHover && 'group/week')}
							// biome-ignore lint/suspicious/noArrayIndexKey: week row order is stable within a month
							key={weekIdx}
						>
							{week.map((day) => (
								<DayCell
									day={day}
									key={dayKey(day)}
									locale={currentLocale}
									onKeyDown={handleDayKeyDown}
									onSelect={onSelect}
									state={toDayState(day)}
								/>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}
