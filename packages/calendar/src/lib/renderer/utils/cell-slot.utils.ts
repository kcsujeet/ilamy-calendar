import { useRef } from 'preact/hooks'
import {
	type BusinessHours,
	type CalendarOwnerState,
	type CellInfo,
	type HeadlessCalendarController,
	isBusinessHour,
	maxDate,
	minDate,
	parseDate,
	toOffsetIso,
	type ZonedDate,
} from '../../../index'
import type { DomCalendarOptions } from '../types/renderer.types'
import { buildSlotProps } from './slot-props.utils'
import { useStickyInsets } from './sticky-insets.utils'

/** Builds disabled/business state and merged slot props for a single hourly/timed cell. */
export const buildTimedCellProps = ({
	options,
	ownerState,
	effHours,
	cellInfo,
	businessDate,
	hour,
	minute,
	extraStyle,
}: {
	options: DomCalendarOptions
	ownerState: CalendarOwnerState
	effHours: BusinessHours | BusinessHours[] | undefined
	cellInfo: CellInfo
	businessDate: ZonedDate
	hour: number
	minute: number
	extraStyle?: Record<string, string | number | undefined>
}) => {
	const isDisabled = Boolean(options.isCellDisabled?.(cellInfo))
	const isNonBusiness = Boolean(
		effHours &&
		!isBusinessHour({
			date: businessDate,
			hour,
			minute,
			businessHours: effHours,
		})
	)
	const slotKey = isDisabled
		? 'cellDisabled'
		: isNonBusiness
			? 'cellNonBusiness'
			: 'cell'
	const extraClass = [
		options.getCellClassName?.(cellInfo),
		isDisabled ? options.classesOverride?.disabledCell : undefined,
	]
		.filter(Boolean)
		.join(' ')
	const cellSlot = buildSlotProps(
		options.slotProps,
		slotKey,
		ownerState,
		extraClass || undefined,
		extraStyle
	)
	return { isDisabled, isNonBusiness, cellSlot }
}

/** Sets up scroll viewport ref, sticky insets, and day/resource header slot props. */
export const useMonthViewportSetup = (
	controller: HeadlessCalendarController,
	options: DomCalendarOptions,
	ownerState: CalendarOwnerState,
	keyPrefix: string
) => {
	const viewportRef = useRef<HTMLDivElement>(null)
	const state = controller.getState()
	const isSticky = options.stickyViewHeader !== false
	useStickyInsets(
		viewportRef,
		`${keyPrefix}:${state.currentDate}:${isSticky}:${state.resources.length}`
	)
	const dayHeaderSlot = buildSlotProps(
		options.slotProps,
		'dayHeader',
		ownerState
	)
	const resHeaderSlot = buildSlotProps(
		options.slotProps,
		'resourceHeader',
		ownerState
	)
	return { viewportRef, state, isSticky, dayHeaderSlot, resHeaderSlot }
}

/** Resolves a valid `ZonedDate` anchor from current controller state. */
export const resolveAnchorDate = (
	controller: HeadlessCalendarController
): ZonedDate | null => {
	const state = controller.getState()
	return (
		parseDate(state.currentDate, state.timezone) ??
		parseDate(state.visibleRange.start, state.timezone) ??
		null
	)
}

/** Clamps an event's ISO start/end interval to optional `[rowStart, rowEnd]` bounds. */
export const clipSegmentIsoRange = ({
	eventStart,
	eventEnd,
	timezone,
	rowStart,
	rowEnd,
}: {
	eventStart: string
	eventEnd: string
	timezone: string
	rowStart: ZonedDate | undefined
	rowEnd: ZonedDate | undefined
}): {
	evStart: ZonedDate | undefined
	evEnd: ZonedDate | undefined
	segStart: string | undefined
	segEnd: string | undefined
} => {
	const evStart = parseDate(eventStart, timezone)
	const evEnd = parseDate(eventEnd, timezone)
	const segStart =
		evStart && rowStart ? toOffsetIso(maxDate(evStart, rowStart)) : undefined
	const segEnd =
		evEnd && rowEnd ? toOffsetIso(minDate(evEnd, rowEnd)) : undefined
	return { evStart, evEnd, segStart, segEnd }
}
