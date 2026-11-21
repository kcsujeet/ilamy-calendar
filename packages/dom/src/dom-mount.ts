import {
	type CalendarEventInput,
	createCalendarController,
	type EventsChange,
	formatDate,
	normalizeEvent,
	parseDate,
} from '@ilamy/core'
import { renderDomAgendaView } from './dom-agenda-view'
import { openDomEventDialog, openDomOverflowDialog } from './dom-dialogs'
import {
	applyScopedEventDelete,
	applyScopedEventUpdate,
	expandRecurringEvents,
	generateDomIcal,
	normalizeDomRRule,
} from './dom-events'
import { renderDomHeader } from './dom-header'
import { attachDomInteractions } from './dom-interactions'
import { renderDomMonthView } from './dom-month-view'
import { applySlot, createCleanupRegistry, createEl } from './dom-styles'
import { renderDomTimeGrid } from './dom-time-grid'
import type {
	DomCalendarEvent,
	DomCalendarEventInput,
	DomCalendarOptions,
	DomRuntime,
	MountedCalendar,
} from './dom-types'
import { renderDomYearView } from './dom-year-view'

const triggerIcalDownload = (ics: string, filename: string): void => {
	if (typeof URL.createObjectURL !== 'function') return
	const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.href = url
	link.download = filename
	document.body.appendChild(link)
	link.click()
	link.remove()
	URL.revokeObjectURL(url)
}

const toBaseEventInputs = (
	events: DomCalendarEventInput[] | undefined
): CalendarEventInput[] | undefined =>
	events?.map(({ rrule: _rrule, ...rest }) => rest)

const preserveRecurrenceFields = (
	rawEvents: DomCalendarEventInput[] | undefined,
	normalizedEvents: DomCalendarEvent[],
	timezone: string
): DomCalendarEvent[] => {
	if (!rawEvents) return normalizedEvents
	const byId = new Map<string, DomCalendarEventInput>()
	for (const raw of rawEvents) {
		byId.set(String(raw.id), raw)
	}
	return normalizedEvents.map((event) => {
		const raw = byId.get(String(event.id))
		if (!raw) return event
		return {
			...event,
			rrule: normalizeDomRRule(raw.rrule, event.start, timezone),
			exdates: raw.exdates,
			recurrenceId: raw.recurrenceId,
		}
	})
}

const buildControllerPatch = (nextOptions: Partial<DomCalendarOptions>) => {
	const patch: Parameters<
		ReturnType<typeof createCalendarController>['updateConfig']
	>[0] = {}
	if ('timezone' in nextOptions) patch.timezone = nextOptions.timezone
	if ('locale' in nextOptions) patch.locale = nextOptions.locale
	if ('firstDayOfWeek' in nextOptions) {
		patch.firstDayOfWeek = nextOptions.firstDayOfWeek
	}
	if ('hiddenDays' in nextOptions) patch.hiddenDays = nextOptions.hiddenDays
	if ('weekends' in nextOptions) patch.weekends = nextOptions.weekends
	if ('resources' in nextOptions) patch.resources = nextOptions.resources
	if (nextOptions.events !== undefined) {
		patch.events = toBaseEventInputs(nextOptions.events)
	}
	return patch
}

export const mountCalendar = (
	container: HTMLElement,
	initialOptions: DomCalendarOptions = {}
): MountedCalendar => {
	let options: DomCalendarOptions = { ...initialOptions }
	let storedEvents: DomCalendarEvent[] = []
	let activeDialogCleanup: (() => void) | undefined

	const controller = createCalendarController({
		initialDate: options.initialDate,
		initialView: options.initialView ?? 'month',
		events: toBaseEventInputs(options.events),
		resources: options.resources,
		timezone: options.timezone,
		locale: options.locale,
		firstDayOfWeek: options.firstDayOfWeek,
		hiddenDays: options.hiddenDays,
		weekends: options.weekends,
		onDateChange: (date, range) => options.onDateChange?.(date, range),
		onViewChange: (view) => options.onViewChange?.(view),
	})

	storedEvents = preserveRecurrenceFields(
		options.events,
		controller.getState().events as DomCalendarEvent[],
		controller.getState().timezone
	)

	const root = createEl('div', {
		data: { testid: 'ilamy-dom-calendar' },
	})
	container.appendChild(root)

	const renderCleanups = createCleanupRegistry()

	const setStoredEvents = (next: DomCalendarEvent[]) => {
		storedEvents = next
		controller.setEvents(next)
	}

	const runtime: DomRuntime = {
		root,
		controller,
		getOptions: () => options,
		registerCleanup: (fn) => renderCleanups.add(fn),

		getVisibleEvents: () => {
			const state = controller.getState()
			return expandRecurringEvents(
				storedEvents,
				state.visibleRange.start,
				state.visibleRange.end,
				state.timezone
			)
		},

		openCreateDialog: (cell) => {
			activeDialogCleanup?.()
			activeDialogCleanup = openDomEventDialog(runtime, { event: null, cell })
		},

		openEditDialog: (event) => {
			activeDialogCleanup?.()
			activeDialogCleanup = openDomEventDialog(runtime, { event })
		},

		openOverflowDialog: (title, events) => {
			activeDialogCleanup?.()
			activeDialogCleanup = openDomOverflowDialog(runtime, title, events)
		},

		commitAdd: (input) => {
			const state = controller.getState()
			const prev = [...storedEvents]
			const { rrule: rawRrule, ...baseInput } = input
			const normalized = normalizeEvent(baseInput, state.timezone)
			const created: DomCalendarEvent = {
				...normalized,
				rrule: normalizeDomRRule(rawRrule, normalized.start, state.timezone),
				exdates: input.exdates,
				recurrenceId: input.recurrenceId,
			}
			setStoredEvents([...storedEvents, created])
			options.onEventAdd?.(created)
			const change: EventsChange = {
				action: 'add',
				event: created,
				added: [created],
				updated: [],
				deleted: [],
				revert: () => setStoredEvents(prev),
			}
			options.onEventsChange?.(change)
			return created
		},

		commitUpdate: (event, updates, scope = 'this', deltas) => {
			const state = controller.getState()
			const prev = [...storedEvents]
			const res = applyScopedEventUpdate(
				storedEvents,
				event,
				updates,
				scope,
				state.timezone
			)
			setStoredEvents(res.events)
			options.onEventUpdate?.(res.primary)
			const change: EventsChange = {
				action: 'update',
				event: res.primary,
				scope,
				added: res.added,
				updated: res.updated,
				deleted: [],
				delta: deltas?.delta,
				endDelta: deltas?.endDelta,
				revert: () => setStoredEvents(prev),
			}
			options.onEventsChange?.(change)
			return res.primary
		},

		commitDelete: (event, scope = 'this') => {
			const state = controller.getState()
			const prev = [...storedEvents]
			const res = applyScopedEventDelete(
				storedEvents,
				event,
				scope,
				state.timezone
			)
			setStoredEvents(res.events)
			options.onEventDelete?.(event)
			const change: EventsChange = {
				action: 'delete',
				event,
				scope,
				added: [],
				updated: res.updated,
				deleted: res.deleted,
				revert: () => setStoredEvents(prev),
			}
			options.onEventsChange?.(change)
			return event
		},

		downloadIcal: (filename = 'calendar.ics') => {
			const ics = generateDomIcal(storedEvents, controller.getState().timezone)
			triggerIcalDownload(ics, filename)
			return ics
		},

		rerender: () => render(),
	}

	const renderViewBody = (): HTMLElement => {
		const { view } = controller.getState()
		if (view === 'day') return renderDomTimeGrid(runtime, 'day')
		if (view === 'week') return renderDomTimeGrid(runtime, 'week')
		if (view === 'year') return renderDomYearView(runtime)
		if (view === 'agenda') return renderDomAgendaView(runtime)
		return renderDomMonthView(runtime)
	}

	const liveRegion = createEl('div', {
		attrs: { 'aria-live': 'polite', 'aria-atomic': 'true' },
		className: 'sr-only',
		data: { testid: 'calendar-live-region' },
	})
	let lastAnnouncedKey = ''

	const LIVE_DATE_FORMATS: Record<string, Intl.DateTimeFormatOptions> = {
		year: { year: 'numeric' },
		month: { month: 'long', year: 'numeric' },
	}
	const DEFAULT_LIVE_DATE_FORMAT: Intl.DateTimeFormatOptions = {
		month: 'long',
		day: 'numeric',
		year: 'numeric',
	}

	const updateLiveRegion = () => {
		const state = controller.getState()
		const nextKey = `${state.view}:${state.currentDate}`
		if (!lastAnnouncedKey) {
			lastAnnouncedKey = nextKey
			return
		}
		if (nextKey === lastAnnouncedKey) return
		lastAnnouncedKey = nextKey
		const parsed = parseDate(state.currentDate, state.timezone)
		if (!parsed) return
		const format = LIVE_DATE_FORMATS[state.view] ?? DEFAULT_LIVE_DATE_FORMAT
		liveRegion.textContent = `${state.view}, ${formatDate(parsed, format, state.locale)}`
	}

	const render = () => {
		renderCleanups.flush()
		root.replaceChildren()
		root.removeAttribute('style')
		root.className = ''
		applySlot(
			root,
			'root',
			`bg-background text-foreground ${options.className ?? ''}`.trim(),
			options,
			'flex h-full w-full flex-col'
		)
		updateLiveRegion()
		root.appendChild(liveRegion)
		root.appendChild(renderDomHeader(runtime))
		const bodyWrapper = createEl('div', {
			data: {
				testid: 'calendar-body',
				calendarViewport: 'true',
			},
		})
		applySlot(
			bodyWrapper,
			'grid',
			'border border-border bg-background',
			options,
			'flex min-h-0 flex-1 flex-col overflow-hidden'
		)
		bodyWrapper.appendChild(renderViewBody())
		root.appendChild(bodyWrapper)
	}

	const unsubscribe = controller.subscribe(render)
	const detachInteractions = attachDomInteractions(runtime)
	render()

	return {
		controller,

		exportIcal: (filename = 'calendar.ics') => {
			const ics = generateDomIcal(storedEvents, controller.getState().timezone)
			if (filename) triggerIcalDownload(ics, filename)
			return ics
		},

		update: (nextOptions) => {
			const prevView = options.initialView
			const prevDate = options.initialDate
			options = { ...options, ...nextOptions }

			controller.updateConfig(buildControllerPatch(nextOptions))
			if (nextOptions.events !== undefined) {
				storedEvents = preserveRecurrenceFields(
					nextOptions.events,
					controller.getState().events as DomCalendarEvent[],
					controller.getState().timezone
				)
			}

			if (
				nextOptions.initialView !== undefined &&
				nextOptions.initialView !== prevView
			) {
				controller.setView(nextOptions.initialView)
			} else if (
				nextOptions.initialDate !== undefined &&
				nextOptions.initialDate !== prevDate
			) {
				controller.setCurrentDate(nextOptions.initialDate)
			} else {
				render()
			}
		},

		destroy: () => {
			activeDialogCleanup?.()
			detachInteractions()
			unsubscribe()
			renderCleanups.flush()
			root.remove()
		},
	}
}
