/** @jsxImportSource preact */
import { useCallback, useRef, useState } from 'preact/hooks'
import {
	type CalendarOwnerState,
	type CalendarSlotProps,
	now,
	parseDate,
	toOffsetIso,
	type ZonedDate,
} from '../../../../index'
import { ChevronDownIcon } from '../../components/icons'
import {
	DayPickerGrid,
	MonthPickerGrid,
	PopoverShell,
	YearPickerGrid,
} from '../../components/mini-calendar'
import { buildSlotProps } from '../../utils/slot-props.utils'

interface HeaderDatePickerProps {
	title: string
	currentDateIso: string
	view: string
	timezone: string
	locale: string
	firstDayOfWeek: number
	slotProps?: CalendarSlotProps
	ownerState: CalendarOwnerState
	onSelectDate: (iso: string) => void
}

/** Clickable period title button that opens a view-appropriate date/month/year popover. */
export const HeaderDatePicker = ({
	title,
	currentDateIso,
	view,
	timezone,
	locale,
	firstDayOfWeek,
	slotProps,
	ownerState,
	onSelectDate,
}: HeaderDatePickerProps) => {
	const [open, setOpen] = useState(false)
	const triggerRef = useRef<HTMLButtonElement>(null)
	const titleSlot = buildSlotProps(slotProps, 'navButton', ownerState)
	const current = parseDate(currentDateIso, timezone) ?? now(timezone)

	const handleClose = useCallback(() => setOpen(false), [])
	const handlePick = (picked: ZonedDate) => {
		onSelectDate(toOffsetIso(picked))
		setOpen(false)
	}

	const pickerContent =
		view === 'year' ? (
			<YearPickerGrid onSelect={handlePick} selected={current} />
		) : view === 'month' ? (
			<MonthPickerGrid
				locale={locale}
				onSelect={handlePick}
				selected={current}
			/>
		) : (
			<DayPickerGrid
				firstDayOfWeek={firstDayOfWeek}
				highlightedWeek={view === 'week'}
				locale={locale}
				onSelect={handlePick}
				selected={current}
			/>
		)

	return (
		<>
			<button
				aria-expanded={open}
				aria-haspopup="dialog"
				className={titleSlot.className}
				data-ilamy-slot="nav-button"
				data-part="title"
				data-testid="calendar-title"
				onClick={() => setOpen((prev) => !prev)}
				ref={triggerRef}
				style={titleSlot.style}
				type="button"
			>
				<span>{title}</span>
				<ChevronDownIcon opacity={0.5} size={16} />
			</button>
			<PopoverShell
				anchorRef={triggerRef}
				minWidth={view === 'day' || view === 'week' ? 260 : 220}
				onClose={handleClose}
				open={open}
			>
				{pickerContent}
			</PopoverShell>
		</>
	)
}
