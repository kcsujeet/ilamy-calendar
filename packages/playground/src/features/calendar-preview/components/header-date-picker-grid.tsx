import {
	add,
	dayKey,
	formatDate,
	fromFields,
	getMonthDays,
	getWeekDays,
	isSameDay,
	now,
	parseDate,
	startOf,
	toOffsetIso,
	type ZonedDate,
} from '@ilamy/calendar'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface HeaderDatePickerGridProps {
	view: string
	currentDate: string
	timezone: string
	locale: string
	onSelectDate: (iso: string) => void
}

const NAV_BTN =
	'inline-flex size-7 items-center justify-center rounded border border-border bg-background text-foreground hover:bg-muted cursor-pointer transition-colors'
const CELL_BASE =
	'w-full rounded py-1.5 text-xs font-medium cursor-pointer transition-colors'

function DayPickerSection({
	selected,
	highlightedWeek,
	locale,
	onPick,
}: {
	selected: ZonedDate
	highlightedWeek: boolean
	locale: string
	onPick: (picked: ZonedDate) => void
}) {
	const [cursorMonth, setCursorMonth] = useState(() =>
		startOf(selected, 'month')
	)
	const gridStart = startOf(
		getMonthDays(cursorMonth).at(0) ?? cursorMonth,
		'week',
		0
	)
	const days: ZonedDate[] = []
	for (let i = 0; i < 42; i += 1) {
		days.push(add(gridStart, i, 'day'))
	}
	const weeks: ZonedDate[][] = []
	for (let row = 0; row < 6; row += 1) {
		weeks.push(days.slice(row * 7, row * 7 + 7))
	}
	const weekLabels = getWeekDays(cursorMonth, 0).map((d) =>
		formatDate(d, { weekday: 'narrow' }, locale)
	)
	const weekSet = new Set(
		highlightedWeek
			? getWeekDays(selected, 0).map((d) => toOffsetIso(d).slice(0, 10))
			: []
	)

	return (
		<div className="w-64 select-none" data-testid="header-date-picker-grid">
			<div className="mb-2 flex items-center justify-between gap-2">
				<button
					aria-label="Previous month"
					className={NAV_BTN}
					onClick={() => setCursorMonth(add(cursorMonth, -1, 'month'))}
					type="button"
				>
					<ChevronLeft className="size-3.5" />
				</button>
				<span className="text-sm font-semibold text-foreground">
					{formatDate(cursorMonth, { month: 'long', year: 'numeric' }, locale)}
				</span>
				<button
					aria-label="Next month"
					className={NAV_BTN}
					onClick={() => setCursorMonth(add(cursorMonth, 1, 'month'))}
					type="button"
				>
					<ChevronRight className="size-3.5" />
				</button>
			</div>

			<div className="text-center">
				<div className="grid grid-cols-7 gap-0.5">
					{weekLabels.map((lbl, idx) => (
						<div
							className="py-1 text-[11px] font-medium text-muted-foreground"
							key={`${lbl}-${String(idx)}`}
						>
							{lbl}
						</div>
					))}
				</div>
				<div className="space-y-0.5">
					{weeks.map((week) => {
						const isSelectedWeek =
							highlightedWeek &&
							week.some((day) => weekSet.has(toOffsetIso(day).slice(0, 10)))
						let rowClass = 'grid grid-cols-7 gap-0.5'
						if (highlightedWeek) {
							rowClass = isSelectedWeek
								? 'grid grid-cols-7'
								: 'group/week grid grid-cols-7'
						}
						return (
							<div
								className={rowClass}
								data-selected-week={isSelectedWeek ? 'true' : undefined}
								data-week-hover={highlightedWeek ? 'true' : undefined}
								key={dayKey(week[0])}
							>
								{week.map((day) => {
									const isSelected =
										isSameDay(day, selected) ||
										weekSet.has(toOffsetIso(day).slice(0, 10))
									const isOutside = day.month !== cursorMonth.month
									const shapeClass = highlightedWeek
										? 'w-full py-1.5 text-xs font-medium cursor-pointer transition-colors rounded-none first:rounded-l last:rounded-r'
										: CELL_BASE
									const hoverClass = highlightedWeek
										? 'group-hover/week:bg-muted'
										: 'hover:bg-muted'
									let tone = `text-foreground ${hoverClass}`
									if (isSelected) {
										tone = 'bg-primary text-primary-foreground'
									} else if (isOutside) {
										tone = `text-muted-foreground ${hoverClass}`
									}
									return (
										<button
											aria-label={formatDate(
												day,
												{
													weekday: 'long',
													month: 'long',
													day: 'numeric',
													year: 'numeric',
												},
												locale
											)}
											aria-pressed={isSelected}
											className={`${shapeClass} ${tone}`}
											data-day-key={dayKey(day)}
											key={toOffsetIso(day)}
											onClick={() => onPick(day)}
											type="button"
										>
											{day.day}
										</button>
									)
								})}
							</div>
						)
					})}
				</div>
			</div>
		</div>
	)
}

function MonthPickerSection({
	selected,
	locale,
	onPick,
}: {
	selected: ZonedDate
	locale: string
	onPick: (picked: ZonedDate) => void
}) {
	const [cursorYear, setCursorYear] = useState(selected.year)
	const months = Array.from({ length: 12 }, (_, idx) =>
		fromFields(
			{ year: cursorYear, month: idx + 1, day: 1 },
			selected.timeZoneId
		)
	)

	return (
		<div className="w-56 select-none" data-testid="header-date-picker-grid">
			<div className="mb-2 flex items-center justify-between gap-2">
				<button
					aria-label="Previous year"
					className={NAV_BTN}
					onClick={() => setCursorYear((y) => y - 1)}
					type="button"
				>
					<ChevronLeft className="size-3.5" />
				</button>
				<span className="text-sm font-semibold text-foreground">
					{cursorYear}
				</span>
				<button
					aria-label="Next year"
					className={NAV_BTN}
					onClick={() => setCursorYear((y) => y + 1)}
					type="button"
				>
					<ChevronRight className="size-3.5" />
				</button>
			</div>

			<div className="grid grid-cols-3 gap-1">
				{months.map((m) => {
					const isSelected =
						m.year === selected.year && m.month === selected.month
					const tone = isSelected
						? 'bg-primary text-primary-foreground'
						: 'text-foreground hover:bg-muted'
					return (
						<button
							aria-pressed={isSelected}
							className={`${CELL_BASE} ${tone}`}
							key={m.month}
							onClick={() => onPick(m)}
							type="button"
						>
							{formatDate(m, { month: 'short' }, locale)}
						</button>
					)
				})}
			</div>
		</div>
	)
}

function YearPickerSection({
	selected,
	onPick,
}: {
	selected: ZonedDate
	onPick: (picked: ZonedDate) => void
}) {
	const [startYear, setStartYear] = useState(
		() => Math.floor(selected.year / 12) * 12
	)
	const years = Array.from({ length: 12 }, (_, idx) => startYear + idx)

	return (
		<div className="w-56 select-none" data-testid="header-date-picker-grid">
			<div className="mb-2 flex items-center justify-between gap-2">
				<button
					aria-label="Previous 12 years"
					className={NAV_BTN}
					onClick={() => setStartYear((y) => y - 12)}
					type="button"
				>
					<ChevronLeft className="size-3.5" />
				</button>
				<span className="text-sm font-semibold text-foreground">
					{startYear} – {startYear + 11}
				</span>
				<button
					aria-label="Next 12 years"
					className={NAV_BTN}
					onClick={() => setStartYear((y) => y + 12)}
					type="button"
				>
					<ChevronRight className="size-3.5" />
				</button>
			</div>

			<div className="grid grid-cols-3 gap-1">
				{years.map((year) => {
					const isSelected = year === selected.year
					const tone = isSelected
						? 'bg-primary text-primary-foreground'
						: 'text-foreground hover:bg-muted'
					return (
						<button
							aria-pressed={isSelected}
							className={`${CELL_BASE} ${tone}`}
							key={year}
							onClick={() =>
								onPick(
									fromFields({ year, month: 1, day: 1 }, selected.timeZoneId)
								)
							}
							type="button"
						>
							{year}
						</button>
					)
				})}
			</div>
		</div>
	)
}

/** Shared Temporal-powered date/month/year selector used inside header Popover slots. */
export function HeaderDatePickerGrid({
	view,
	currentDate,
	timezone,
	locale,
	onSelectDate,
}: HeaderDatePickerGridProps) {
	const selected = parseDate(currentDate, timezone) ?? now(timezone)
	const handlePick = (picked: ZonedDate) => onSelectDate(toOffsetIso(picked))

	if (view === 'year') {
		return <YearPickerSection onPick={handlePick} selected={selected} />
	}
	if (view === 'month') {
		return (
			<MonthPickerSection
				locale={locale}
				onPick={handlePick}
				selected={selected}
			/>
		)
	}
	return (
		<DayPickerSection
			highlightedWeek={view === 'week'}
			locale={locale}
			onPick={handlePick}
			selected={selected}
		/>
	)
}
