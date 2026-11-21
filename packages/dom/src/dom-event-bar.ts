import type { EventSegment } from '@ilamy/core'
import { readableTextColor } from '@ilamy/utils/helpers'
import { canDragEvent, canResizeEvent } from './dom-events'
import {
	applyInlineStyle,
	applySlot,
	createEl,
	formatEventTimeRange,
	mergeClassNames,
} from './dom-styles'
import type { DomCalendarEvent, DomRuntime } from './dom-types'

const RESIZE_GRIP_POSITIONS: Record<string, string> = {
	'horizontal:start': 'left-0 top-0 bottom-0 w-1.5 cursor-ew-resize flex-col',
	'horizontal:end': 'right-0 top-0 bottom-0 w-1.5 cursor-ew-resize flex-col',
	'vertical:start': 'top-0 left-0 right-0 h-1.5 cursor-ns-resize flex-row',
	'vertical:end': 'bottom-0 left-0 right-0 h-1.5 cursor-ns-resize flex-row',
}

const createResizeGrip = (
	edge: 'start' | 'end',
	axis: 'horizontal' | 'vertical',
	eventId: string | number,
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	const posClass = RESIZE_GRIP_POSITIONS[`${axis}:${edge}`] ?? ''
	const handle = createEl('div', {
		attrs: { 'aria-hidden': 'true' },
		data: {
			resizeHandle: edge,
			resizeAxis: axis,
			eventId: String(eventId),
			testid: `resize-handle-${edge}-${eventId}`,
		},
	})
	applySlot(
		handle,
		'resizeHandle',
		'',
		options,
		`absolute ${posClass} z-20 flex items-center justify-center gap-[1.5px] opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity select-none touch-none`
	)
	for (let i = 0; i < 3; i += 1) {
		handle.appendChild(
			createEl('span', {
				className: mergeClassNames(
					options.unstyled,
					'',
					undefined,
					'h-[2px] w-[2px] rounded-full bg-current opacity-80 pointer-events-none'
				),
			})
		)
	}
	return handle
}

const appendEventContent = (
	bar: HTMLElement,
	event: DomCalendarEvent,
	runtime: DomRuntime,
	segment?: EventSegment
): void => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const timeFormat = options.timeFormat ?? '12-hour'

	if (options.renderEvent) {
		const host = createEl('div', {
			className: mergeClassNames(
				options.unstyled,
				'w-full h-full overflow-hidden pointer-events-none'
			),
		})
		const cleanup = options.renderEvent(host, {
			event,
			segment,
			view: state.view,
			timezone: state.timezone,
			timeFormat,
		})
		if (cleanup) runtime.registerCleanup(cleanup)
		bar.appendChild(host)
		return
	}

	const showTime = options.displayEventTime !== false && !event.allDay
	let timeLabel = ''
	if (showTime) {
		timeLabel = formatEventTimeRange(
			event,
			state.timezone,
			state.locale,
			timeFormat,
			options.displayEventEnd === true
		)
	}
	if (timeLabel) {
		bar.appendChild(
			createEl('span', {
				text: timeLabel,
				className: mergeClassNames(
					options.unstyled,
					'font-normal',
					undefined,
					'shrink-0 whitespace-nowrap font-normal'
				),
			})
		)
	}
	bar.appendChild(
		createEl('span', {
			text: event.title,
			className: mergeClassNames(
				options.unstyled,
				'font-semibold',
				undefined,
				'truncate whitespace-nowrap font-semibold'
			),
		})
	)
}

const appendResizeHandles = (
	bar: HTMLElement,
	event: DomCalendarEvent,
	axis: 'horizontal' | 'vertical',
	segment: EventSegment | undefined,
	runtime: DomRuntime
): void => {
	if (!canResizeEvent(event, runtime.getOptions())) return
	if (!segment || segment.isStart) {
		bar.appendChild(createResizeGrip('start', axis, event.id, runtime))
	}
	if (!segment || segment.isEnd) {
		bar.appendChild(createResizeGrip('end', axis, event.id, runtime))
	}
}

const isTailwindToken = (value: string | undefined): boolean =>
	Boolean(value && /^(bg|text)-/.test(value.trim()))

const hasBgToken = (value: string | undefined): boolean =>
	Boolean(value && /(?:^|\s)bg-/.test(value))

const addTokenClasses = (bar: HTMLElement, token: string): void => {
	bar.classList.add(...token.trim().split(/\s+/))
}

const applyBarBackground = (
	bar: HTMLElement,
	bg: string | undefined,
	fg: string | undefined
): void => {
	if (bg && isTailwindToken(bg)) {
		bar.style.removeProperty('background-color')
		addTokenClasses(bar, bg)
		return
	}
	const cssBg = bg ?? '#dbeafe'
	let textColor: string | undefined
	if (!isTailwindToken(fg)) {
		textColor = fg ?? readableTextColor(cssBg)
	}
	applyInlineStyle(bar, { backgroundColor: cssBg, color: textColor })
}

const applyBarForeground = (
	bar: HTMLElement,
	fg: string | undefined,
	bgIsToken: boolean
): void => {
	if (!fg) return
	if (isTailwindToken(fg)) {
		if (hasBgToken(fg)) {
			bar.style.removeProperty('background-color')
		}
		bar.style.removeProperty('color')
		addTokenClasses(bar, fg)
		return
	}
	if (bgIsToken) applyInlineStyle(bar, { color: fg })
}

const applyEventBarColors = (
	bar: HTMLElement,
	event: DomCalendarEvent,
	unstyled: boolean | undefined,
	hasSlotBg: boolean
): void => {
	const colorHasBg = hasBgToken(event.color)
	const hasExplicitColor = Boolean(event.backgroundColor || event.color)
	if (!hasExplicitColor && (unstyled || hasSlotBg)) return
	if (event.backgroundColor) {
		applyBarBackground(bar, event.backgroundColor, event.color)
		applyBarForeground(bar, event.color, isTailwindToken(event.backgroundColor))
		return
	}
	if (!colorHasBg && !unstyled && !hasSlotBg) {
		applyBarBackground(bar, undefined, event.color)
	}
	applyBarForeground(bar, event.color, colorHasBg)
}

const resolveBarRadiusClass = (
	axis: 'horizontal' | 'vertical',
	isTruncatedStart: boolean,
	isTruncatedEnd: boolean
): string => {
	if (axis === 'vertical') return 'rounded-md'
	if (isTruncatedStart && isTruncatedEnd) return 'rounded-none'
	if (isTruncatedStart) return 'rounded-r-md rounded-l-none'
	if (isTruncatedEnd) return 'rounded-l-md rounded-r-none'
	return 'rounded-md'
}

const appendContinuationStripes = (
	bar: HTMLElement,
	showStartStripe: boolean,
	showEndStripe: boolean
): void => {
	if (showStartStripe) {
		bar.appendChild(
			createEl('span', {
				className:
					'pointer-events-none absolute left-0 top-0 bottom-0 w-0.5 bg-foreground/25',
			})
		)
	}
	if (showEndStripe) {
		bar.appendChild(
			createEl('span', {
				className:
					'pointer-events-none absolute right-0 top-0 bottom-0 w-0.5 bg-foreground/25',
			})
		)
	}
}

const applyTruncatedBarRadii = (
	bar: HTMLElement,
	isTruncatedStart: boolean,
	isTruncatedEnd: boolean
): void => {
	if (isTruncatedStart) {
		bar.style.borderTopLeftRadius = '0px'
		bar.style.borderBottomLeftRadius = '0px'
	}
	if (isTruncatedEnd) {
		bar.style.borderTopRightRadius = '0px'
		bar.style.borderBottomRightRadius = '0px'
	}
}

const attachBarKeyboardOpen = (
	bar: HTMLElement,
	event: DomCalendarEvent,
	runtime: DomRuntime
): void => {
	const openFromKeyboard = () => {
		const options = runtime.getOptions()
		if (options.disableEventClick) return
		options.onEventClick?.(event)
		runtime.openEditDialog(event)
	}
	bar.addEventListener('keydown', (keyboardEvent) => {
		if (keyboardEvent.key === 'Enter') {
			keyboardEvent.preventDefault()
			openFromKeyboard()
		} else if (keyboardEvent.key === ' ') {
			keyboardEvent.preventDefault()
		}
	})
	bar.addEventListener('keyup', (keyboardEvent) => {
		if (keyboardEvent.key === ' ') {
			openFromKeyboard()
		}
	})
}

const resolveSeparationBorder = (
	options: ReturnType<DomRuntime['getOptions']>
): string => {
	const hasCustomBorder = Boolean(options.slotProps?.eventBar?.style?.border)
	const shouldShow =
		!hasCustomBorder &&
		(!options.unstyled || Boolean(options.slotProps?.eventBar))
	return shouldShow ? 'border-[1.5px] border-card' : ''
}

export const renderDomEventBar = (
	event: DomCalendarEvent,
	runtime: DomRuntime,
	layout: {
		axis: 'horizontal' | 'vertical'
		segment?: EventSegment
		compact?: boolean
		staticPill?: boolean
	}
): HTMLElement => {
	const options = runtime.getOptions()
	const draggable = !layout.staticPill && canDragEvent(event, options)
	const isHorizontal = layout.axis === 'horizontal'
	const isTruncatedStart = Boolean(
		isHorizontal && layout.segment && !layout.segment.isStart
	)
	const isTruncatedEnd = Boolean(
		isHorizontal && layout.segment && !layout.segment.isEnd
	)

	let dataEventId: string | undefined = String(event.id)
	let eventTestId = `calendar-event-${event.id}`
	if (layout.staticPill) {
		dataEventId = undefined
		eventTestId = `all-events-dialog-event-${event.id}`
	}

	const bar = createEl('div', {
		attrs: {
			role: 'button',
			tabindex: '0',
			title: event.title,
		},
		data: {
			eventId: dataEventId,
			testid: eventTestId,
			draggable: String(draggable),
			truncatedStart: isTruncatedStart ? 'true' : undefined,
			truncatedEnd: isTruncatedEnd ? 'true' : undefined,
		},
	})
	const horizontalPad = `${isTruncatedStart ? 'pl-2' : 'pl-1.5'} ${isTruncatedEnd ? 'pr-2' : 'pr-1.5'}`
	let layoutClass = 'flex-col gap-0.5 px-2 py-1'
	if (layout.compact) {
		layoutClass = `items-center gap-1 ${horizontalPad} py-0.5`
	}
	let cursorClass = 'cursor-pointer'
	if (draggable) {
		cursorClass = 'cursor-grab active:cursor-grabbing'
	}
	const radiusClass = resolveBarRadiusClass(
		layout.axis,
		isTruncatedStart,
		isTruncatedEnd
	)
	const separationBorder = resolveSeparationBorder(options)

	applySlot(
		bar,
		'eventBar',
		`font-medium ${cursorClass} focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring`,
		options,
		`group relative flex ${layoutClass} ${radiusClass} ${separationBorder} w-full h-full overflow-hidden select-none text-xs leading-tight`.trim()
	)

	applyTruncatedBarRadii(bar, isTruncatedStart, isTruncatedEnd)
	const hasSlotBg = Boolean(options.slotProps?.eventBar?.style?.backgroundColor)
	applyEventBarColors(bar, event, options.unstyled, hasSlotBg)
	appendContinuationStripes(bar, isTruncatedStart, isTruncatedEnd)
	appendEventContent(bar, event, runtime, layout.segment)
	if (!layout.staticPill) {
		appendResizeHandles(bar, event, layout.axis, layout.segment, runtime)
	}
	attachBarKeyboardOpen(bar, event, runtime)

	return bar
}
