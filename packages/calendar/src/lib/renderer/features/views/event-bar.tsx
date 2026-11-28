/** @jsxImportSource preact */
import { useMemo } from 'preact/hooks'
import type {
	CalendarOwnerState,
	EventSegment,
	EventSlotContext,
	HeadlessCalendarController,
} from '../../../../index'
import {
	canDragEvent,
	canResizeEvent,
} from '../../../interactions/event-placement.utils'
import { ResizeHandle } from '../../components/resize-handle'
import { LegacyRenderHost, SlotHost } from '../../components/slot-host'
import type {
	DomCalendarEvent,
	DomCalendarOptions,
	DomEventRenderContext,
	RendererActions,
} from '../../types/renderer.types'
import {
	type ResolvedEventSurface,
	resolveEventBarSurface,
} from '../../utils/event-color.utils'
import type { CalendarFormatters } from '../../utils/format.utils'
import { rendererKeys } from '../../utils/keys.utils'
import {
	buildSlotProps,
	joinClassNames,
	mergeStyles,
	resolveSlotStyle,
} from '../../utils/slot-props.utils'

interface EventBarProps {
	event: DomCalendarEvent
	axis: 'horizontal' | 'vertical'
	controller: HeadlessCalendarController
	options: DomCalendarOptions
	actions: RendererActions
	formatters: CalendarFormatters
	segment?: EventSegment
	segStart?: string
	segEnd?: string
	disableResize?: boolean
	compact?: boolean
	staticPill?: boolean
	isPreview?: boolean
	dataLeft?: number
	dataWidth?: number
	onPillClick?: () => void
	style?: Record<string, string | number | undefined>
}

const SLOT_COLOR_KEYS = ['backgroundColor', 'color'] as const

const clearOverriddenSlotColors = (
	slotStyle: Record<string, string | number | undefined> | undefined,
	surfaceStyle: Record<string, string | number | undefined> | undefined,
	hasEventColor: boolean
) => {
	if (!hasEventColor || !slotStyle) return slotStyle
	const next = { ...slotStyle }
	let changed = false
	for (const key of SLOT_COLOR_KEYS) {
		if (next[key] && !surfaceStyle?.[key]) {
			next[key] = undefined
			changed = true
		}
	}
	return changed ? next : slotStyle
}

const computeBarSlotProps = (
	event: DomCalendarEvent,
	options: DomCalendarOptions,
	ownerState: CalendarOwnerState,
	extraStyle?: Record<string, string | number | undefined>
): {
	surface: ResolvedEventSurface
	className: string | undefined
	style: Record<string, string | number | undefined> | undefined
} => {
	const resolvedSlotBar = resolveSlotStyle(
		options.slotProps,
		'eventBar',
		ownerState
	)
	const hasSlotBg = Boolean(resolvedSlotBar?.style?.backgroundColor)
	const surface = resolveEventBarSurface(
		event,
		Boolean(options.unstyled),
		hasSlotBg
	)
	const barSlot = buildSlotProps(
		options.slotProps,
		'eventBar',
		ownerState,
		surface.className,
		mergeStyles(surface.style, extraStyle)
	)
	const style = clearOverriddenSlotColors(
		barSlot.style,
		surface.style,
		Boolean(event.backgroundColor || event.color)
	)
	return { surface, className: joinClassNames(barSlot.className), style }
}

const ContinuationStripe = ({
	show,
	edge,
}: {
	show: boolean
	edge: 'start' | 'end'
}) =>
	show ? <span data-edge={edge} data-ilamy-part="continuation-stripe" /> : null

const DefaultEventBarLabel = ({
	axis,
	title,
	timeLabel,
	showStartStripe,
	showEndStripe,
	isPreview,
}: {
	axis: 'horizontal' | 'vertical'
	title: string
	timeLabel: string | undefined
	showStartStripe: boolean
	showEndStripe: boolean
	isPreview: boolean
}) => {
	const verticalPreviewTime =
		isPreview && axis === 'vertical' ? timeLabel : undefined
	const inlineTime = isPreview ? undefined : timeLabel
	return (
		<>
			<ContinuationStripe edge="start" show={showStartStripe} />
			<div
				data-has-end-stripe={showEndStripe ? 'true' : undefined}
				data-has-start-stripe={showStartStripe ? 'true' : undefined}
				data-ilamy-part="event-bar-content"
			>
				{verticalPreviewTime && (
					<div data-ilamy-part="event-time">{verticalPreviewTime}</div>
				)}
				<span data-ilamy-part="event-label">
					{inlineTime && <span data-ilamy-part="event-time">{inlineTime}</span>}
					{title}
				</span>
			</div>
			<ContinuationStripe edge="end" show={showEndStripe} />
		</>
	)
}

const EventBarContent = ({
	event,
	axis,
	timeLabel,
	segment,
	isPreview,
	options,
	slotContext,
	legacyContext,
}: {
	event: DomCalendarEvent
	axis: 'horizontal' | 'vertical'
	timeLabel: string | undefined
	segment: EventSegment
	isPreview: boolean
	options: DomCalendarOptions
	slotContext: EventSlotContext
	legacyContext: DomEventRenderContext
}) => {
	if (options.slots?.event) {
		return (
			<SlotHost
				context={slotContext}
				slot={options.slots.event}
				slotKey={rendererKeys.key.eventSlot(
					event.id,
					axis,
					segment.isStart,
					segment.isEnd
				)}
			/>
		)
	}
	if (options.renderEvent) {
		return (
			<LegacyRenderHost
				context={legacyContext}
				pointerEventsNone
				renderFn={options.renderEvent}
				slotKey={rendererKeys.key.slot(axis, event.id)}
			/>
		)
	}
	const canShowStripes = axis === 'horizontal' && !options.unstyled
	return (
		<DefaultEventBarLabel
			axis={axis}
			isPreview={isPreview}
			showEndStripe={canShowStripes && !segment.isEnd}
			showStartStripe={canShowStripes && !segment.isStart}
			timeLabel={timeLabel}
			title={event.title}
		/>
	)
}

const EventResizeHandles = ({
	resizable,
	fromStart,
	axis,
	eventId,
	segment,
	options,
	ownerState,
}: {
	resizable: boolean
	fromStart: boolean
	axis: 'horizontal' | 'vertical'
	eventId: string | number
	segment: EventSegment
	options: DomCalendarOptions
	ownerState: CalendarOwnerState
}) => {
	if (!resizable) return null
	return (
		<>
			{fromStart && segment.isStart && (
				<ResizeHandle
					axis={axis}
					edge="start"
					eventId={eventId}
					ownerState={ownerState}
					slotProps={options.slotProps}
				/>
			)}
			{segment.isEnd && (
				<ResizeHandle
					axis={axis}
					edge="end"
					eventId={eventId}
					ownerState={ownerState}
					slotProps={options.slotProps}
				/>
			)}
		</>
	)
}

const createBarKeyHandlers = (openFromKeyboard: () => void) => ({
	onKeyDown: (e: KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault()
			openFromKeyboard()
		} else if (e.key === ' ') {
			e.preventDefault()
		}
	},
	onKeyUp: (e: KeyboardEvent) => {
		if (e.key === ' ') openFromKeyboard()
	},
})

const buildTruncationAttrs = (
	axis: 'horizontal' | 'vertical',
	segmentValue: EventSegment
) => {
	const isHorizontal = axis === 'horizontal'
	return {
		'data-truncated-end':
			isHorizontal && !segmentValue.isEnd ? 'true' : undefined,
		'data-truncated-start':
			isHorizontal && !segmentValue.isStart ? 'true' : undefined,
	}
}

const PREVIEW_BAR_STYLES = {
	pointerEvents: 'none',
	boxShadow:
		'0 10px 25px rgb(0 0 0 / 0.2), inset 0 0 0 2px var(--ilamy-fg, #18181b)',
	border: '1.5px solid var(--ilamy-bg, #ffffff)',
} as const

const resolveBarInteractionProps = (
	staticPill: boolean,
	isPreview: boolean,
	openFromKeyboard: () => void
) => {
	if (isPreview) {
		return {}
	}
	return {
		onClick: staticPill ? openFromKeyboard : undefined,
		...createBarKeyHandlers(openFromKeyboard),
		role: 'button' as const,
		tabIndex: 0,
	}
}

const buildInteractiveAttrs = ({
	event,
	staticPill,
	isPreview,
	segStart,
	segEnd,
	options,
}: {
	event: DomCalendarEvent
	staticPill: boolean
	isPreview: boolean
	segStart?: string
	segEnd?: string
	options: DomCalendarOptions
}) => {
	const interactive = !staticPill && !isPreview
	return {
		'data-draggable': String(interactive && canDragEvent(event, options)),
		'data-event-id': interactive ? String(event.id) : undefined,
		'data-ilamy-part': isPreview ? 'event-drag-preview' : 'event-bar',
		'data-seg-end': interactive ? segEnd : undefined,
		'data-seg-start': interactive ? segStart : undefined,
		'data-testid': isPreview
			? undefined
			: rendererKeys.testId.eventBar(event.id, staticPill),
	}
}

const buildEventBarDivProps = ({
	event,
	axis,
	segStart,
	segEnd,
	compact,
	staticPill,
	isPreview,
	segmentValue,
	surface,
	className,
	barStyle,
	options,
	dataLeft,
	dataWidth,
	openFromKeyboard,
}: {
	event: DomCalendarEvent
	axis: 'horizontal' | 'vertical'
	segStart?: string
	segEnd?: string
	compact: boolean
	staticPill: boolean
	isPreview: boolean
	segmentValue: EventSegment
	surface: ResolvedEventSurface
	className: string | undefined
	barStyle: Record<string, string | number | undefined> | undefined
	options: DomCalendarOptions
	dataLeft?: number
	dataWidth?: number
	openFromKeyboard: () => void
}) => {
	const strAttr = (value: number | undefined) =>
		value === undefined ? undefined : String(value)
	return {
		className,
		'data-compact': compact ? 'true' : undefined,
		'data-custom-color': surface.hasCustomColor ? 'true' : undefined,
		'data-drag-axis': axis,
		'data-ilamy-slot': 'event-bar',
		'data-left': strAttr(dataLeft),
		'data-width': strAttr(dataWidth),
		...buildInteractiveAttrs({
			event,
			staticPill,
			isPreview,
			segStart,
			segEnd,
			options,
		}),
		...(isPreview
			? { 'data-testid': rendererKeys.testId.dragPreview(axis) }
			: undefined),
		...buildTruncationAttrs(axis, segmentValue),
		...resolveBarInteractionProps(staticPill, isPreview, openFromKeyboard),
		style: isPreview ? mergeStyles(barStyle, PREVIEW_BAR_STYLES) : barStyle,
		title: event.title,
	}
}

const useEventBarProps = ({
	event,
	axis,
	segment,
	segStart,
	segEnd,
	disableResize = false,
	compact = false,
	staticPill = false,
	isPreview = false,
	dataLeft,
	dataWidth,
	style,
	controller,
	options,
	actions,
	onPillClick,
}: EventBarProps) => {
	const state = controller.getState()
	const timeFormat = options.timeFormat ?? '12-hour'
	const segmentValue = useMemo<EventSegment>(
		() => segment ?? { isStart: true, isEnd: true },
		[segment]
	)
	const {
		surface,
		className,
		style: barStyle,
	} = computeBarSlotProps(event, options, actions.ownerState, style)

	const openFromKeyboard = useMemo(
		() => () => {
			if (onPillClick) {
				onPillClick()
				return
			}
			if (options.disableEventClick) return
			options.onEventClick?.(event)
			actions.openEditDialog(event)
		},
		[onPillClick, options, event, actions]
	)

	const slotContext = useMemo<EventSlotContext>(
		() => ({
			event,
			segment: segmentValue,
			view: state.view,
			timezone: state.timezone,
			timeFormat,
			isSelected: false,
			onClick: openFromKeyboard,
		}),
		[
			event,
			segmentValue,
			state.view,
			state.timezone,
			timeFormat,
			openFromKeyboard,
		]
	)

	const legacyContext = useMemo<DomEventRenderContext>(
		() => ({
			event,
			segment,
			view: state.view,
			timezone: state.timezone,
			timeFormat,
		}),
		[event, segment, state.view, state.timezone, timeFormat]
	)

	const divProps = buildEventBarDivProps({
		event,
		axis,
		segStart,
		segEnd,
		compact,
		staticPill,
		isPreview,
		segmentValue,
		surface,
		className,
		barStyle,
		options,
		dataLeft,
		dataWidth,
		openFromKeyboard,
	})

	return {
		divProps,
		segmentValue,
		slotContext,
		legacyContext,
		resizable:
			!disableResize &&
			!staticPill &&
			!isPreview &&
			canResizeEvent(event, options),
	}
}

export const EventBar = (props: EventBarProps) => {
	const { divProps, segmentValue, slotContext, legacyContext, resizable } =
		useEventBarProps(props)
	return (
		// biome-ignore lint/a11y/useSemanticElements: interactive bar supports custom event slot content & pointer drag handles
		<div {...divProps}>
			<EventBarContent
				axis={props.axis}
				event={props.event}
				isPreview={Boolean(props.isPreview)}
				legacyContext={legacyContext}
				options={props.options}
				segment={segmentValue}
				slotContext={slotContext}
				timeLabel={props.formatters.formatEventTime(props.event)}
			/>
			<EventResizeHandles
				axis={props.axis}
				eventId={props.event.id}
				fromStart={props.options.eventResizableFromStart === true}
				options={props.options}
				ownerState={props.actions.ownerState}
				resizable={resizable}
				segment={segmentValue}
			/>
		</div>
	)
}
