import { Button } from '@ilamy/ui/components/button'
import { cn } from '@ilamy/ui/lib/utils'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useState } from 'react'
import { getMonthWeeks, getWeekDays, isToday } from '@/lib/utils/date-utils'

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
	highlightedWeekOf?: Dayjs
}

interface DayState {
	isOutside: boolean
	isSelected: boolean
	isDisabled: boolean
	isCurrent: boolean
	isCurrentWeek: boolean
	weekHover: boolean
}

// Range fill lives on the cell and only the row's ends are rounded, so a week
// reads as one continuous bar. The current week mirrors the day picker's
// selected day (solid `bg-primary`) and stays put; hovering a different week
// shows a lighter `bg-accent` band, exactly like per-day hover. Both can show
// at once, so hovering never clears the active week.
function cellClass(state: DayState): string {
	return cn(
		'p-0 text-center',
		state.weekHover && 'first:rounded-l-md last:rounded-r-md',
		state.weekHover && !state.isCurrentWeek && 'group-hover/week:bg-accent',
		state.isCurrentWeek && 'bg-primary'
	)
}

function dayButtonClass(state: DayState): string {
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
	state,
	onSelect,
}: {
	day: Dayjs
	state: DayState
	onSelect?: (date: Date | undefined) => void
}) {
	return (
		<td
			className={cellClass(state)}
			data-disabled={state.isDisabled}
			data-outside={state.isOutside}
			data-selected={state.isSelected}
			// biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: date-picker pattern — WAI-ARIA gridcell on td is canonical; keyboard nav lives on the child button
			role="gridcell"
			tabIndex={-1}
		>
			<button
				aria-disabled={state.isDisabled}
				aria-hidden={state.isOutside}
				className={dayButtonClass(state)}
				data-disabled={state.isDisabled}
				data-selected={state.isSelected}
				disabled={state.isDisabled || state.isOutside}
				onClick={() => onSelect?.(day.toDate())}
				tabIndex={state.isOutside ? -1 : 0}
				type="button"
			>
				{day.format('D')}
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
	const [viewMonth, setViewMonth] = useState<Dayjs>(() =>
		dayjs(defaultMonth ?? selected ?? new Date()).startOf('month')
	)

	const weeks = getMonthWeeks(viewMonth, firstDayOfWeek)
	const selectedKey = selected
		? dayjs(selected).format('YYYY-MM-DD')
		: undefined
	const weekdayHeaders = getWeekDays(dayjs(), firstDayOfWeek).map((d) =>
		d.format('dd')
	)

	const highlightedWeek = highlightedWeekOf
		? getWeekDays(highlightedWeekOf, firstDayOfWeek)
		: null
	const highlightStart = highlightedWeek?.at(0)
	const highlightEnd = highlightedWeek?.at(-1)

	const toDayState = (day: Dayjs): DayState => {
		const isSelected = day.format('YYYY-MM-DD') === selectedKey
		const isCurrentWeek = Boolean(
			highlightStart &&
				highlightEnd &&
				!day.isBefore(highlightStart, 'day') &&
				!day.isAfter(highlightEnd, 'day')
		)
		return {
			isOutside: !day.isSame(viewMonth, 'month'),
			isSelected,
			isDisabled: disabled?.(day.toDate()) ?? false,
			isCurrent: isToday(day) && !isSelected,
			isCurrentWeek,
			weekHover,
		}
	}

	return (
		<div
			className={cn('bg-background p-3 w-72', className)}
			data-slot="calendar"
		>
			<div className="flex items-center justify-between mb-2">
				<Button
					aria-label="Previous month"
					onClick={() => setViewMonth((m) => m.subtract(1, 'month'))}
					size="icon"
					variant="ghost"
				>
					<ChevronLeftIcon className="size-4" />
				</Button>
				<div className="text-sm font-medium select-none">
					{viewMonth.format('MMMM YYYY')}
				</div>
				<Button
					aria-label="Next month"
					onClick={() => setViewMonth((m) => m.add(1, 'month'))}
					size="icon"
					variant="ghost"
				>
					<ChevronRightIcon className="size-4" />
				</Button>
			</div>

			<table
				className="w-full border-collapse"
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
									key={day.toISOString()}
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
