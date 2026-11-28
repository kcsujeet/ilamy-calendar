/** @jsxImportSource preact */
import type { ComponentChildren } from 'preact'
import { useLayoutEffect, useRef, useState } from 'preact/hooks'
import {
	add,
	dayKey,
	formatDate,
	getMonthDays,
	getWeekDays,
	isSameDay,
	startOf,
	toOffsetIso,
	withTime,
	type ZonedDate,
} from '../../../index'
import { rendererKeys } from '../utils/keys.utils'
import { ChevronLeftIcon, ChevronRightIcon } from './icons'

interface PopoverShellProps {
	open: boolean
	anchorRef: { current: HTMLElement | null }
	onClose: () => void
	minWidth?: number
	children: ComponentChildren
}

/** Positioned dropdown shell anchored to a trigger element; closes on Escape or outside click. */
export const PopoverShell = ({
	open,
	anchorRef,
	onClose,
	minWidth = 240,
	children,
}: PopoverShellProps) => {
	const panelRef = useRef<HTMLDivElement>(null)
	const [coords, setCoords] = useState<{ top: number; left: number }>({
		top: 0,
		left: 0,
	})

	useLayoutEffect(() => {
		if (!open) return
		const rect = anchorRef.current?.getBoundingClientRect()
		if (rect) {
			const effectiveWidth = Math.max(minWidth, 272)
			const clampedLeft = Math.max(
				8,
				Math.min(
					rect.left,
					Math.max(8, window.innerWidth - effectiveWidth - 16)
				)
			)
			const estimatedHeight = 320
			const fitsBelow =
				rect.bottom + 4 + estimatedHeight <= window.innerHeight - 8
			const top = fitsBelow
				? rect.bottom + 4
				: Math.max(8, rect.top - estimatedHeight - 4)
			setCoords({
				top: Math.round(top),
				left: Math.round(clampedLeft),
			})
		}
		const handleKey = (evt: KeyboardEvent) => {
			if (evt.key === 'Escape') {
				evt.preventDefault()
				evt.stopPropagation()
				onClose()
			}
		}
		const handlePointerDown = (evt: PointerEvent) => {
			const target = evt.target as Node | null
			if (
				target &&
				!panelRef.current?.contains(target) &&
				!anchorRef.current?.contains(target)
			) {
				onClose()
			}
		}
		document.addEventListener('keydown', handleKey, true)
		document.addEventListener('pointerdown', handlePointerDown, true)
		return () => {
			document.removeEventListener('keydown', handleKey, true)
			document.removeEventListener('pointerdown', handlePointerDown, true)
		}
	}, [open, anchorRef, minWidth, onClose])

	if (!open) return null

	return (
		<div
			data-ilamy-part="popover"
			ref={panelRef}
			style={{
				top: `${coords.top}px`,
				left: `${coords.left}px`,
				minWidth: `${minWidth}px`,
			}}
		>
			{children}
		</div>
	)
}

export const DayPickerGrid = ({
	selected,
	locale,
	firstDayOfWeek,
	highlightedWeek = false,
	onSelect,
}: {
	selected: ZonedDate
	locale: string
	firstDayOfWeek: number
	highlightedWeek?: boolean
	onSelect: (day: ZonedDate) => void
}) => {
	const gridRef = useRef<HTMLDivElement>(null)
	const [cursorMonth, setCursorMonth] = useState(() =>
		startOf(selected, 'month')
	)
	const gridStart = startOf(
		getMonthDays(cursorMonth).at(0) ?? cursorMonth,
		'week',
		firstDayOfWeek
	)
	const days: ZonedDate[] = []
	for (let i = 0; i < 42; i += 1) {
		days.push(add(gridStart, i, 'day'))
	}
	const weeks: ZonedDate[][] = []
	for (let row = 0; row < 6; row += 1) {
		weeks.push(days.slice(row * 7, row * 7 + 7))
	}
	const weekLabels = getWeekDays(cursorMonth, firstDayOfWeek).map((d) =>
		formatDate(d, { weekday: 'narrow' }, locale)
	)
	const weekSet = new Set(
		highlightedWeek
			? getWeekDays(selected, firstDayOfWeek).map((d) =>
					toOffsetIso(d).slice(0, 10)
				)
			: []
	)

	const handleGridKeyDown = (evt: KeyboardEvent, index: number) => {
		const offsets: Record<string, number> = {
			ArrowRight: 1,
			ArrowLeft: -1,
			ArrowDown: 7,
			ArrowUp: -7,
		}
		const delta = offsets[evt.key]
		if (!delta) return
		const nextIdx = index + delta
		if (nextIdx < 0 || nextIdx >= days.length) return
		evt.preventDefault()
		const nextKey = dayKey(days[nextIdx])
		gridRef.current
			?.querySelector<HTMLButtonElement>(`button[data-day-key="${nextKey}"]`)
			?.focus()
	}

	return (
		<div data-ilamy-part="mini-calendar" data-slot="calendar">
			<div data-ilamy-part="picker-nav">
				<button
					aria-label="Previous month"
					data-ilamy-part="btn"
					onClick={() => setCursorMonth(add(cursorMonth, -1, 'month'))}
					type="button"
				>
					<ChevronLeftIcon size={14} />
				</button>
				<span data-ilamy-part="picker-title">
					{formatDate(cursorMonth, { month: 'long', year: 'numeric' }, locale)}
				</span>
				<button
					aria-label="Next month"
					data-ilamy-part="btn"
					onClick={() => setCursorMonth(add(cursorMonth, 1, 'month'))}
					type="button"
				>
					<ChevronRightIcon size={14} />
				</button>
			</div>
			<div data-ilamy-part="picker-grid-wrap" ref={gridRef}>
				{/* biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: WAI-ARIA datepicker grid pattern uses role="grid" on table */}
				<table role="grid" tabIndex={-1}>
					<thead>
						<tr>
							{weekLabels.map((lbl, idx) => (
								<th
									data-ilamy-part="year-weekday"
									key={rendererKeys.key.weekdayCol(lbl, idx)}
									scope="col"
								>
									{lbl}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{weeks.map((week, rowIdx) => {
							const isSelectedWeek =
								highlightedWeek &&
								week.some((day) => weekSet.has(toOffsetIso(day).slice(0, 10)))
							return (
								<tr
									data-ilamy-part="picker-week"
									data-selected-week={isSelectedWeek ? 'true' : undefined}
									data-week-hover={highlightedWeek ? 'true' : undefined}
									key={dayKey(week[0])}
								>
									{week.map((day, colIdx) => {
										const isSelected = isSameDay(day, selected)
										const inWeek = weekSet.has(toOffsetIso(day).slice(0, 10))
										const isOutside = day.month !== cursorMonth.month
										const key = dayKey(day)
										return (
											<td
												data-outside={isOutside ? 'true' : 'false'}
												key={toOffsetIso(day)}
											>
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
													data-day-key={key}
													data-ilamy-part="picker-cell"
													data-outside-month={isOutside ? 'true' : undefined}
													data-selected={
														isSelected || inWeek ? 'true' : undefined
													}
													onClick={() => onSelect(day)}
													onKeyDown={(evt) =>
														handleGridKeyDown(evt, rowIdx * 7 + colIdx)
													}
													type="button"
												>
													{day.day}
												</button>
											</td>
										)
									})}
								</tr>
							)
						})}
					</tbody>
				</table>
			</div>
		</div>
	)
}

export const MonthPickerGrid = ({
	selected,
	locale,
	onSelect,
}: {
	selected: ZonedDate
	locale: string
	onSelect: (monthDate: ZonedDate) => void
}) => {
	const [yearCursor, setYearCursor] = useState(selected.year)
	const yearAnchor = add(
		startOf(selected, 'year'),
		yearCursor - selected.year,
		'year'
	)
	const months = Array.from({ length: 12 }, (_, idx) =>
		add(yearAnchor, idx, 'month')
	)

	return (
		<div data-ilamy-part="mini-calendar" data-slot="month-grid">
			<div data-ilamy-part="picker-nav">
				<button
					aria-label="Previous year"
					data-ilamy-part="btn"
					onClick={() => setYearCursor((y) => y - 1)}
					type="button"
				>
					<ChevronLeftIcon size={14} />
				</button>
				<span data-ilamy-part="picker-title">{yearCursor}</span>
				<button
					aria-label="Next year"
					data-ilamy-part="btn"
					onClick={() => setYearCursor((y) => y + 1)}
					type="button"
				>
					<ChevronRightIcon size={14} />
				</button>
			</div>
			<div data-cols="3" data-ilamy-part="picker-grid">
				{months.map((m) => (
					<button
						data-ilamy-part="picker-cell"
						data-selected={
							m.year === selected.year && m.month === selected.month
								? 'true'
								: undefined
						}
						key={m.month}
						onClick={() =>
							onSelect(
								withTime(m, {
									hour: selected.hour,
									minute: selected.minute,
									second: selected.second,
									millisecond: selected.millisecond,
								})
							)
						}
						type="button"
					>
						{formatDate(m, { month: 'short' }, locale)}
					</button>
				))}
			</div>
		</div>
	)
}

export const YearPickerGrid = ({
	selected,
	onSelect,
}: {
	selected: ZonedDate
	onSelect: (yearDate: ZonedDate) => void
}) => {
	const [decadeStart, setDecadeStart] = useState(
		Math.floor(selected.year / 12) * 12
	)
	const years = Array.from({ length: 12 }, (_, idx) => decadeStart + idx)

	return (
		<div data-ilamy-part="mini-calendar" data-slot="year-grid">
			<div data-ilamy-part="picker-nav">
				<button
					aria-label="Previous years"
					data-ilamy-part="btn"
					onClick={() => setDecadeStart((d) => d - 12)}
					type="button"
				>
					<ChevronLeftIcon size={14} />
				</button>
				<span data-ilamy-part="picker-title">
					{decadeStart} - {decadeStart + 11}
				</span>
				<button
					aria-label="Next years"
					data-ilamy-part="btn"
					onClick={() => setDecadeStart((d) => d + 12)}
					type="button"
				>
					<ChevronRightIcon size={14} />
				</button>
			</div>
			<div data-cols="3" data-ilamy-part="picker-grid">
				{years.map((yr) => (
					<button
						data-ilamy-part="picker-cell"
						data-selected={yr === selected.year ? 'true' : undefined}
						key={yr}
						onClick={() => onSelect(add(selected, yr - selected.year, 'year'))}
						type="button"
					>
						{yr}
					</button>
				))}
			</div>
		</div>
	)
}
