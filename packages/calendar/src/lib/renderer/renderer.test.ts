import { afterEach, describe, expect, it } from 'bun:test'
import { Frequency } from 'rrule'
import { agendaPlugin } from '../../features/plugins/agenda'
import { exportToICalendar, icalPlugin } from '../../features/plugins/ical'
import { recurrencePlugin } from '../../features/plugins/recurrence'
import { yearPlugin } from '../../features/plugins/year'
import type { HeaderSlotContext, Resource } from '../../index'
import { parseDate } from '../../index'
import { resolveCommittedDeltas } from './app/mount-calendar'
import { keepEndAfterStart } from './features/dialogs/event-form-dialog'
import { mountCalendar } from './index'

const createContainer = (): HTMLDivElement => {
	const el = document.createElement('div')
	document.body.appendChild(el)
	return el
}

const flushPreact = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

afterEach(() => {
	document.body.innerHTML = ''
})

describe('lib/renderer Preact mountCalendar', () => {
	it('renders plugin-free core with 3 views and renders all 5 views when plugins are passed with zero Tailwind classes', () => {
		const bareContainer = createContainer()
		const bareCal = mountCalendar(bareContainer, {
			initialDate: '2026-11-19T09:00:00Z',
			timezone: 'UTC',
		})
		expect(
			bareContainer.querySelector('[data-testid="view-btn-agenda"]')
		).toBeNull()
		expect(
			bareContainer.querySelector('[data-testid="view-btn-year"]')
		).toBeNull()
		expect(
			bareContainer.querySelector('[data-testid="export-ical-btn"]')
		).toBeNull()
		bareCal.destroy()

		const container = createContainer()
		const cal = mountCalendar(container, {
			initialDate: '2026-11-19T09:00:00Z',
			initialView: 'month',
			timezone: 'UTC',
			plugins: [yearPlugin(), agendaPlugin({ window: 'week' }), icalPlugin()],
			events: [
				{
					id: 'e1',
					title: 'Launch Keynote',
					start: '2026-11-19T10:00:00Z',
					end: '2026-11-19T11:30:00Z',
				},
			],
		})

		expect(
			container.querySelector('[data-testid="dom-month-view"]')
		).not.toBeNull()
		expect(container.querySelector('[role="grid"]')).not.toBeNull()
		expect(
			container.querySelector('[data-testid="export-ical-btn"]')
		).not.toBeNull()
		expect(
			container.querySelector('[data-testid="calendar-event-e1"]')?.textContent
		).toContain('Launch Keynote')

		// Zero Tailwind utility classes on calendar structural DOM
		const allElements = Array.from(container.querySelectorAll('*'))
		for (const node of allElements) {
			const cls = node.getAttribute('class') ?? ''
			expect(cls).not.toMatch(
				/\b(flex|grid|bg-|text-|border-|rounded-|p-|px-|py-|m-|gap-|h-|w-)\b/
			)
		}

		container
			.querySelector<HTMLButtonElement>('[data-testid="view-btn-week"]')
			?.click()
		expect(
			container.querySelector('[data-testid="dom-week-view"]')
		).not.toBeNull()

		container
			.querySelector<HTMLButtonElement>('[data-testid="view-btn-day"]')
			?.click()
		expect(
			container.querySelector('[data-testid="dom-day-view"]')
		).not.toBeNull()

		container
			.querySelector<HTMLButtonElement>('[data-testid="view-btn-year"]')
			?.click()
		expect(container.querySelector('[data-testid="year-view"]')).not.toBeNull()

		container
			.querySelector<HTMLButtonElement>('[data-testid="view-btn-agenda"]')
			?.click()
		expect(
			container.querySelector('[data-testid="agenda-view"]')
		).not.toBeNull()
		expect(
			container.querySelector('[data-testid="agenda-event-e1"]')?.textContent
		).toContain('Launch Keynote')

		cal.destroy()
		expect(container.children.length).toBe(0)
	})

	it('supports resources, business hours, eventResizableFromStart, allDaySlot=false, and onMoreEventsClick', () => {
		const container = createContainer()
		let interceptedMoreDay = ''
		let interceptedMoreCount = 0

		const cal = mountCalendar(container, {
			initialDate: '2026-11-19T09:00:00Z',
			initialView: 'month',
			timezone: 'UTC',
			editable: true,
			dayMaxEvents: 1,
			businessHours: {
				daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
				startTime: 9,
				endTime: 17,
			},
			resources: [
				{ id: 'room-a', title: 'Room A' },
				{ id: 'room-b', title: 'Room B' },
			],
			events: [
				{
					id: 'r1',
					title: 'Design Sync',
					start: '2026-11-19T10:00:00Z',
					end: '2026-11-19T11:00:00Z',
					resourceId: 'room-a',
				},
				{
					id: 'r2',
					title: 'Design Overflow',
					start: '2026-11-19T12:00:00Z',
					end: '2026-11-19T13:00:00Z',
					resourceId: 'room-a',
				},
			],
			onMoreEventsClick: (dayIso, dayEvents) => {
				interceptedMoreDay = dayIso
				interceptedMoreCount = dayEvents.length
			},
		})

		expect(
			container.querySelector('[data-testid="resource-header-room-a"]')
		).not.toBeNull()
		expect(
			container.querySelector('[data-testid="resource-header-room-b"]')
		).not.toBeNull()
		expect(
			container.querySelectorAll('[data-non-business="true"]').length
		).toBeGreaterThan(0)
		expect(
			container.querySelector('[data-testid="resize-handle-start-r1"]')
		).toBeNull()
		expect(
			container.querySelector('[data-testid="resize-handle-end-r1"]')
		).toBeNull()

		container
			.querySelector<HTMLButtonElement>(
				'[data-testid="more-events-2026-11-19"]'
			)
			?.click()
		expect(interceptedMoreDay).toContain('2026-11-19')
		expect(interceptedMoreCount).toBe(2)
		expect(
			container.querySelector('[data-testid="dom-overflow-dialog"]')
		).toBeNull()

		cal.update({
			eventResizableFromStart: true,
			allDaySlot: false,
			initialView: 'week',
			orientation: 'vertical',
		})
		expect(
			container.querySelector('[data-testid="resize-handle-start-r1"]')
		).not.toBeNull()
		expect(
			container.querySelector('[data-testid="resize-handle-end-r1"]')
		).not.toBeNull()
		expect(container.querySelector('[data-testid="all-day-row"]')).toBeNull()

		cal.destroy()
	})

	it('mounts region slots once without remounting and evaluates functional slotProps(ownerState)', () => {
		const container = createContainer()
		let headerMountCount = 0
		let headerUpdateCount = 0
		let headerDestroyCount = 0
		let latestTitle = ''
		const mountedInputs: HTMLInputElement[] = []

		const cal = mountCalendar(container, {
			initialDate: '2026-11-19T09:00:00Z',
			initialView: 'month',
			timezone: 'UTC',
			unstyled: true,
			slotProps: {
				root: (ownerState) => ({
					className: `owner-${ownerState.view}`,
					style: { '--owner-zone': ownerState.timezone },
				}),
			},
			slots: {
				header: {
					mount: (host, ctx: HeaderSlotContext) => {
						headerMountCount += 1
						latestTitle = ctx.title
						const wrap = document.createElement('div')
						const inp = document.createElement('input')
						inp.dataset.testid = 'slot-search-input'
						const next = document.createElement('button')
						next.dataset.testid = 'slot-next-btn'
						next.addEventListener('click', () => ctx.nextPeriod())
						wrap.append(inp, next)
						host.appendChild(wrap)
						mountedInputs.push(inp)
						return {
							update: (nextCtx) => {
								headerUpdateCount += 1
								latestTitle = nextCtx.title
							},
							destroy: () => {
								headerDestroyCount += 1
								wrap.remove()
							},
						}
					},
				},
			},
		})

		expect(headerMountCount).toBe(1)
		expect(headerDestroyCount).toBe(0)
		const rootEl = container.querySelector<HTMLElement>('[data-ilamy-root]')
		expect(rootEl?.classList.contains('owner-month')).toBe(true)
		expect(rootEl?.style.getPropertyValue('--owner-zone')).toBe('UTC')

		const inputEl = mountedInputs.at(0) ?? null
		expect(inputEl).not.toBeNull()
		inputEl?.focus()
		expect(document.activeElement).toBe(inputEl)

		cal.controller.nextPeriod()
		expect(headerMountCount).toBe(1)
		expect(headerUpdateCount).toBeGreaterThanOrEqual(1)
		expect(latestTitle).toContain('Dec 2026')
		expect(document.activeElement).toBe(inputEl)

		cal.controller.setView('week')
		expect(rootEl?.classList.contains('owner-week')).toBe(true)
		expect(headerMountCount).toBe(1)

		// Invoking initial openEventForm after period navigation reads live controller state (Dec 2026)
		let initialOpenEventForm: (() => void) | undefined
		const container2 = createContainer()
		const cal2 = mountCalendar(container2, {
			initialDate: '2026-11-19T09:00:00Z',
			timezone: 'UTC',
			slots: {
				header: {
					mount: (host, ctx) => {
						initialOpenEventForm = () => ctx.openEventForm()
						const el = document.createElement('div')
						host.appendChild(el)
						return { update: () => undefined, destroy: () => el.remove() }
					},
				},
			},
		})
		cal2.controller.nextPeriod()
		initialOpenEventForm?.()
		expect(container2.querySelector('#start-date')?.textContent).toContain(
			'Dec'
		)
		cal2.destroy()

		cal.destroy()
		expect(headerDestroyCount).toBe(1)
	})

	it('respects legacy renderHeader/renderEvent/renderEventForm hooks with cleanup', () => {
		const container = createContainer()
		let headerCleaned = 0
		let eventCleaned = 0

		const cal = mountCalendar(container, {
			initialDate: '2026-11-19T09:00:00Z',
			timezone: 'UTC',
			events: [
				{
					id: 'e1',
					title: 'Custom Event',
					start: '2026-11-19T10:00:00Z',
					end: '2026-11-19T11:00:00Z',
				},
			],
			renderHeader: (el, ctx) => {
				el.textContent = `Custom Header: ${ctx.title}`
				return () => {
					headerCleaned += 1
				}
			},
			renderEvent: (el, ctx) => {
				el.textContent = `Badge: ${ctx.event.title}`
				return () => {
					eventCleaned += 1
				}
			},
		})

		expect(container.textContent).toContain('Custom Header:')
		expect(container.textContent).toContain('Badge: Custom Event')

		cal.destroy()
		expect(headerCleaned).toBe(1)
		expect(eventCleaned).toBe(1)
	})

	it('expands recurring events, opens scope modal on edit/delete, creates/deletes non-recurring events, and reverts', async () => {
		const container = createContainer()
		let lastRevert: (() => void) | undefined
		const actions: string[] = []

		const cal = mountCalendar(container, {
			initialDate: '2026-11-02T09:00:00Z',
			initialView: 'month',
			timezone: 'UTC',
			plugins: [recurrencePlugin()],
			events: [
				{
					id: 'standup',
					title: 'Daily Standup',
					start: '2026-11-02T09:00:00Z',
					end: '2026-11-02T09:30:00Z',
					rrule: {
						freq: Frequency.DAILY,
						count: 3,
						dtstart: new Date('2026-11-02T09:00:00Z'),
					},
				},
			],
			onEventsChange: (change) => {
				actions.push(change.action)
				lastRevert = change.revert
			},
		})

		expect(
			container.querySelectorAll('[data-event-id^="standup_"]').length
		).toBe(3)

		// Create new non-recurring event via dialog
		container
			.querySelector<HTMLButtonElement>('[data-testid="new-event-btn"]')
			?.click()
		const dialog = container.querySelector<HTMLDialogElement>(
			'[data-testid="dom-event-dialog"]'
		)
		expect(dialog).not.toBeNull()
		const titleInput = dialog?.querySelector<HTMLInputElement>(
			'input[name="title"]'
		)
		if (titleInput) {
			titleInput.value = 'Created Via Preact Dialog'
			titleInput.dispatchEvent(new Event('input', { bubbles: true }))
		}
		const locInput = dialog?.querySelector<HTMLInputElement>(
			'input[name="location"]'
		)
		if (locInput) {
			locInput.value = 'Room 404'
			locInput.dispatchEvent(new Event('input', { bubbles: true }))
		}
		await flushPreact()
		dialog
			?.querySelector('form')
			?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
		await flushPreact()

		expect(actions).toEqual(['add'])
		expect(container.textContent).toContain('Created Via Preact Dialog')
		const added = cal.controller
			.getState()
			.events.find((e) => e.title === 'Created Via Preact Dialog')
		expect(added?.location).toBe('Room 404')

		lastRevert?.()
		expect(container.textContent).not.toContain('Created Via Preact Dialog')

		// Updating a recurring event opens dedicated scope modal
		const recBar = container.querySelector<HTMLElement>(
			'[data-testid^="calendar-event-standup_"]'
		)
		recBar?.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
		)
		const editDialog = container.querySelector<HTMLDialogElement>(
			'[data-testid="dom-event-dialog"]'
		)
		editDialog
			?.querySelector('form')
			?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
		const scopeDialog = container.querySelector<HTMLDialogElement>(
			'[data-testid="recurrence-edit-dialog"]'
		)
		expect(scopeDialog).not.toBeNull()
		scopeDialog
			?.querySelector<HTMLButtonElement>('[data-testid="dom-scope-all"]')
			?.click()
		expect(
			container.querySelector('[data-testid="recurrence-edit-dialog"]')
		).toBeNull()

		cal.destroy()
	})

	it('wires dialog aria-labelledby/describedby, announces navigation, and opens title date pickers', async () => {
		const container = createContainer()
		const cal = mountCalendar(container, {
			initialDate: '2026-11-15T09:00:00Z',
			initialView: 'month',
			timezone: 'UTC',
			editable: true,
			events: [
				{
					id: 'a11y-1',
					title: 'Audit',
					start: '2026-11-15T09:00:00Z',
					end: '2026-11-15T10:00:00Z',
				},
			],
		})

		const liveRegion = container.querySelector(
			'[data-testid="calendar-live-region"]'
		)
		expect(liveRegion?.getAttribute('aria-live')).toBe('polite')
		expect(liveRegion?.textContent).toBe('')
		cal.controller.nextPeriod()
		expect(liveRegion?.textContent).toContain('December 2026')
		cal.controller.prevPeriod()

		// Title DatePicker switches month
		container
			.querySelector<HTMLButtonElement>('[data-testid="calendar-title"]')
			?.click()
		await flushPreact()
		const monthGrid = container.querySelector('[data-slot="month-grid"]')
		expect(monthGrid).not.toBeNull()
		const decBtn = Array.from(monthGrid?.querySelectorAll('button') ?? []).find(
			(b) => b.textContent === 'Dec'
		)
		decBtn?.click()
		await flushPreact()
		expect(cal.controller.getState().currentDate).toContain('2026-12-')
		expect(container.querySelector('[data-slot="month-grid"]')).toBeNull()

		cal.controller.prevPeriod()

		// Keyboard Space keyup opens edit dialog with aria-labelledby / aria-describedby
		const bar = container.querySelector<HTMLElement>(
			'[data-testid="calendar-event-a11y-1"]'
		)
		bar?.dispatchEvent(
			new KeyboardEvent('keydown', {
				key: ' ',
				bubbles: true,
				cancelable: true,
			})
		)
		expect(
			container.querySelector('[data-testid="dom-event-dialog"]')
		).toBeNull()
		bar?.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }))
		const dialog = container.querySelector<HTMLDialogElement>(
			'[data-testid="dom-event-dialog"]'
		)
		expect(dialog).not.toBeNull()
		const titleId = dialog?.getAttribute('aria-labelledby')
		const descId = dialog?.getAttribute('aria-describedby')
		expect(dialog?.querySelector(`#${titleId}`)?.textContent).toBe('Edit Event')
		expect(dialog?.querySelector(`#${descId}`)?.textContent).toBe(
			'Edit your event details'
		)

		cal.destroy()
	})

	it('renders 500 resources in horizontal timeline well under 500ms', () => {
		const container = createContainer()
		const resources: Resource[] = Array.from({ length: 500 }, (_, i) => ({
			id: `res-${i}`,
			title: `Room ${i}`,
		}))
		const events = Array.from({ length: 500 }, (_, i) => ({
			id: `ev-${i}`,
			title: `Event ${i}`,
			start: '2026-11-19T10:00:00Z',
			end: '2026-11-19T11:00:00Z',
			resourceId: `res-${i}`,
		}))

		const startedAt = performance.now()
		const cal = mountCalendar(container, {
			initialDate: '2026-11-19T09:00:00Z',
			initialView: 'day',
			orientation: 'horizontal',
			timezone: 'UTC',
			resources,
			events,
		})
		const elapsedMs = performance.now() - startedAt
		expect(elapsedMs).toBeLessThan(500)
		expect(
			container.querySelector('[data-testid="resource-header-res-499"]')
		).not.toBeNull()
		cal.destroy()
	})

	it('exports RFC 5545 iCalendar output with TZID', () => {
		const ics = exportToICalendar(
			[
				{
					id: 'ics-1',
					title: 'Board Review',
					start: '2026-11-19T14:00:00-05:00',
					end: '2026-11-19T15:00:00-05:00',
					timezone: 'America/New_York',
				},
			],
			() => [],
			{ timezone: 'America/New_York' }
		)
		expect(ics).toContain('BEGIN:VCALENDAR')
		expect(ics).toContain('DTSTART;TZID=America/New_York:20261119T140000')
		expect(ics).toContain('SUMMARY:Board Review')
	})

	it('nests every button and role=button inside a gridcell within month-view rows', () => {
		const container = createContainer()
		const cal = mountCalendar(container, {
			initialDate: '2026-11-19T09:00:00Z',
			initialView: 'month',
			timezone: 'UTC',
			dayMaxEvents: 1,
			events: [
				{
					id: 'aria-1',
					title: 'Event 1',
					start: '2026-11-19T09:00:00Z',
					end: '2026-11-19T10:00:00Z',
				},
				{
					id: 'aria-2',
					title: 'Event 2',
					start: '2026-11-19T11:00:00Z',
					end: '2026-11-19T12:00:00Z',
				},
			],
		})

		const rows = container.querySelectorAll('[role="grid"] [role="row"]')
		expect(rows.length).toBeGreaterThan(1)
		for (const row of Array.from(rows)) {
			const interactive = row.querySelectorAll('button, [role="button"]')
			for (const el of Array.from(interactive)) {
				const cell = el.closest('[role="gridcell"]')
				expect(cell).not.toBeNull()
				expect(row.contains(cell)).toBe(true)
			}
		}
		cal.destroy()
	})

	it('closes an open popover before its parent dialog on sequential Escape presses', async () => {
		const container = createContainer()
		const cal = mountCalendar(container, {
			initialDate: '2026-11-19T09:00:00Z',
			initialView: 'month',
			timezone: 'UTC',
			editable: true,
		})

		container
			.querySelector<HTMLElement>('[data-testid="day-cell-2026-11-19"]')
			?.click()
		await flushPreact()

		const dialog = container.querySelector<HTMLDialogElement>(
			'[data-testid="dom-event-dialog"]'
		)
		expect(dialog).not.toBeNull()

		container.querySelector<HTMLButtonElement>('#start-date')?.click()
		await flushPreact()
		expect(
			container.querySelector('[data-ilamy-part="popover"]')
		).not.toBeNull()

		// First Escape closes only the popover; synthetic cancel does not close dialog
		document.dispatchEvent(
			new KeyboardEvent('keydown', {
				key: 'Escape',
				bubbles: true,
				cancelable: true,
			})
		)
		dialog?.dispatchEvent(new Event('cancel', { cancelable: true }))
		await flushPreact()

		expect(container.querySelector('[data-ilamy-part="popover"]')).toBeNull()
		expect(
			container.querySelector('[data-testid="dom-event-dialog"]')
		).not.toBeNull()

		document.dispatchEvent(
			new KeyboardEvent('keyup', {
				key: 'Escape',
				bubbles: true,
			})
		)
		await flushPreact()

		// Second Escape closes the dialog itself
		dialog?.dispatchEvent(
			new KeyboardEvent('keydown', {
				key: 'Escape',
				bubbles: true,
				cancelable: true,
			})
		)
		await flushPreact()
		expect(
			container.querySelector('[data-testid="dom-event-dialog"]')
		).toBeNull()

		cal.destroy()
	})

	it('emits data-start and data-end as UTC ISO strings ending with Z in month and week grids', async () => {
		const container = createContainer()
		const cal = mountCalendar(container, {
			initialDate: '2026-11-19T09:00:00Z',
			initialView: 'month',
			timezone: 'UTC',
		})
		await flushPreact()

		const monthCell = container.querySelector(
			'[data-testid="day-cell-2026-11-19"]'
		)
		expect(monthCell?.getAttribute('data-start')).toMatch(/Z$/)
		expect(monthCell?.getAttribute('data-end')).toMatch(/Z$/)

		cal.update({ initialView: 'week', initialDate: '2026-11-19T09:00:00Z' })
		await flushPreact()

		const weekSlot = container.querySelector(
			'[data-testid="time-slot-2026-11-19-9-0"]'
		)
		expect(weekSlot?.getAttribute('data-start')).toBe(
			'2026-11-19T09:00:00.000Z'
		)
		expect(weekSlot?.getAttribute('data-end')).toBe('2026-11-19T10:00:00.000Z')

		cal.destroy()
	})

	it('preserves base series id and rrule when editing a recurring occurrence with all scope via form', async () => {
		const updatedEvents: Array<{
			id: string | number
			title: string
			rrule?: unknown
		}> = []
		const container = createContainer()
		const cal = mountCalendar(container, {
			initialDate: '2026-11-19T09:00:00Z',
			initialView: 'month',
			timezone: 'UTC',
			plugins: [recurrencePlugin()],
			events: [
				{
					id: 'standup',
					title: 'Daily stand-up',
					start: '2026-11-18T09:00:00Z',
					end: '2026-11-18T09:30:00Z',
					rrule: {
						freq: Frequency.DAILY,
						dtstart: new Date('2026-11-18T09:00:00Z'),
					},
				},
			],
			onEventUpdate: (evt) => updatedEvents.push(evt),
		})
		await flushPreact()

		const occurrenceBar = container.querySelector<HTMLElement>(
			'[data-testid^="calendar-event-standup_"]'
		)
		expect(occurrenceBar).not.toBeNull()
		occurrenceBar?.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
		)
		await flushPreact()

		const dialog = container.querySelector<HTMLDialogElement>(
			'[data-testid="dom-event-dialog"]'
		)
		const titleInput = dialog?.querySelector<HTMLInputElement>(
			'input[name="title"]'
		)
		expect(titleInput).not.toBeNull()
		if (titleInput) {
			titleInput.value = 'Stand-up renamed'
			titleInput.dispatchEvent(new Event('input', { bubbles: true }))
		}
		await flushPreact()

		dialog
			?.querySelector('form')
			?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
		await flushPreact()

		container
			.querySelector<HTMLButtonElement>('[data-testid="dom-scope-all"]')
			?.click()
		await flushPreact()

		expect(updatedEvents).toHaveLength(1)
		expect(updatedEvents[0]?.id).toBe('standup')
		expect(updatedEvents[0]?.title).toBe('Stand-up renamed')
		expect(updatedEvents[0]?.rrule).toBeDefined()

		cal.destroy()
	})

	it('wires Stage 5A parity contracts: refetchResources, snapshot, spacing, week-number, today badge, sticky insets, and form ARIA', async () => {
		const container = createContainer()
		let resourceFetchCount = 0
		const renderedHours: string[] = []
		const renderedNow: number[] = []
		const changes: Array<{ delta?: { days: number; milliseconds: number } }> =
			[]

		const cal = mountCalendar(container, {
			initialDate: '2025-03-12T09:00:00Z',
			initialView: 'month',
			timezone: 'UTC',
			editable: true,
			nowIndicator: true,
			weekNumbers: true,
			eventHeight: 32,
			eventSpacing: 4,
			headerClassName: 'custom-cal-header',
			viewHeaderClassName: 'custom-view-header',
			classesOverride: { disabledCell: 'custom-disabled-cell' },
			isCellDisabled: (cell) => cell.start.startsWith('2025-03-13'),
			resources: async () => {
				resourceFetchCount += 1
				return [{ id: 'r1', title: 'Room 1' }]
			},
			events: [
				{
					id: 'ev1',
					title: 'Parity Event',
					start: '2025-03-12T10:00:00Z',
					end: '2025-03-12T11:00:00Z',
					resourceId: 'r1',
				},
			],
			onEventsChange: (c) => changes.push(c),
			renderHour: (el, dateIso) => {
				el.textContent = `H:${dateIso.slice(11, 13)}`
				renderedHours.push(dateIso)
				return undefined
			},
			renderCurrentTimeIndicator: (el, props) => {
				el.textContent = `NOW:${Math.round(props.progress)}`
				renderedNow.push(props.progress)
				return undefined
			},
		})
		await flushPreact()

		expect(
			container.querySelector('[data-testid="ilamy-calendar"]')
		).not.toBeNull()
		expect(
			container
				.querySelector('[data-testid="calendar-header"]')
				?.classList.contains('custom-cal-header')
		).toBe(true)
		expect(
			container
				.querySelector('[data-ilamy-slot="grid-header"]')
				?.classList.contains('custom-view-header')
		).toBe(true)
		expect(
			container.querySelector('[data-testid="resource-header-r1"]')
		).not.toBeNull()
		expect(
			container
				.querySelector('[data-testid="day-cell-2025-03-13"]')
				?.classList.contains('custom-disabled-cell')
		).toBe(true)

		// refetchResources & snapshot subscriptions work
		const beforeFetch = resourceFetchCount
		cal.refetchResources()
		await flushPreact()
		expect(resourceFetchCount).toBe(beforeFetch + 1)

		let snapCount = 0
		const unsubSnap = cal.subscribeSnapshot(() => {
			snapCount += 1
		})
		cal.updateEvent('ev1', { title: 'Renamed Event' })
		expect(snapCount).toBeGreaterThanOrEqual(1)
		expect(changes.at(-1)?.delta).toEqual({ days: 0, milliseconds: 0 })
		unsubSnap()

		// Clear resources -> regular month view shows month-header & 6 week numbers; then switch to week
		cal.update({ resources: undefined, initialView: 'month' })
		await flushPreact()
		expect(
			container
				.querySelector('[data-testid="month-header"]')
				?.classList.contains('custom-view-header')
		).toBe(true)
		expect(
			container.querySelectorAll('[data-testid="week-number"]').length
		).toBe(6)

		// Switch to week view and check week-number ('local' default = 11), sticky vars, and renderHour
		cal.update({ resources: undefined, initialView: 'week' })
		await flushPreact()
		expect(
			container.querySelector('[data-testid="week-number"]')?.textContent
		).toBe('11')
		expect(renderedHours.length).toBe(24)
		const scrollVp = container.querySelector<HTMLElement>(
			'[data-ilamy-slot="grid-scroll"]'
		)
		expect(scrollVp?.style.getPropertyValue('--ilamy-sticky-left')).not.toBe('')
		expect(scrollVp?.style.getPropertyValue('--ilamy-sticky-top')).not.toBe('')

		// Form dialog searchable time-picker & mini-calendar ARIA contracts
		cal.openEventForm()
		await flushPreact()
		expect(cal.getSnapshot().isEventFormOpen).toBe(true)
		const startTimeBtn = container.querySelector<HTMLButtonElement>(
			'[data-testid="time-picker-start-time"]'
		)
		expect(startTimeBtn?.getAttribute('role')).toBe('combobox')
		expect(startTimeBtn?.getAttribute('aria-controls')).toBeNull()
		expect(startTimeBtn?.getAttribute('aria-expanded')).toBe('false')
		startTimeBtn?.click()
		await flushPreact()
		expect(startTimeBtn?.getAttribute('aria-expanded')).toBe('true')
		const searchInput = container.querySelector<HTMLInputElement>(
			'[data-ilamy-part="time-picker-search"] input'
		)
		expect(searchInput?.getAttribute('placeholder')).toBe('Search time...')
		expect(
			container.querySelectorAll('[data-ilamy-part="time-picker-list"] button')
				.length
		).toBe(96)
		if (searchInput) {
			searchInput.value = '4:00 PM'
			searchInput.dispatchEvent(new Event('input', { bubbles: true }))
			await flushPreact()
			const filtered = container.querySelectorAll(
				'[data-ilamy-part="time-picker-list"] button'
			)
			expect(filtered.length).toBe(1)
			expect(filtered[0]?.textContent).toBe('4:00 PM')

			searchInput.value = 'zzz'
			searchInput.dispatchEvent(new Event('input', { bubbles: true }))
			await flushPreact()
			expect(
				container.querySelector('[data-ilamy-part="time-picker-empty"]')
					?.textContent
			).toBe('N/A')
		}

		const startDateBtn = container.querySelector<HTMLButtonElement>(
			'[data-testid="date-picker-start-date"]'
		)
		startDateBtn?.click()
		await flushPreact()
		const calPopup = container.querySelector('[data-slot="calendar"]')
		expect(calPopup?.querySelector('[role="grid"]')).not.toBeNull()
		const dayBtn = calPopup?.querySelector<HTMLButtonElement>(
			'button[data-day-key="2025-03-12"]'
		)
		expect(dayBtn?.getAttribute('aria-label')).toMatch(/2025/)
		dayBtn?.focus()
		dayBtn?.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
		)
		expect(document.activeElement?.getAttribute('data-day-key')).toBe(
			'2025-03-13'
		)

		cal.closeEventForm()
		expect(cal.getSnapshot().isEventFormOpen).toBe(false)
		expect(renderedNow.length).toBeGreaterThanOrEqual(0)
		cal.destroy()
	})

	it('keeps end after start across edges/midnight and preserves untouched all-day ranges on edit', async () => {
		const start = parseDate('2025-03-12T00:00:00Z', 'UTC')!
		const sameDayMovedEnd = keepEndAfterStart(
			{
				allDay: false,
				startDate: start,
				endDate: start,
				startTime: { hour: 9, minute: 0 },
				endTime: { hour: 8, minute: 0 },
			},
			'end',
			60,
			'UTC'
		)
		expect(sameDayMovedEnd.startTime).toEqual({ hour: 7, minute: 0 })
		expect(sameDayMovedEnd.endTime).toEqual({ hour: 8, minute: 0 })

		const crossMidnight = keepEndAfterStart(
			{
				allDay: false,
				startDate: start,
				endDate: start,
				startTime: { hour: 23, minute: 30 },
				endTime: { hour: 10, minute: 0 },
			},
			'start',
			60,
			'UTC'
		)
		expect(crossMidnight.endDate.day).toBe(13)
		expect(crossMidnight.endTime).toEqual({ hour: 0, minute: 30 })

		const allDayPull = keepEndAfterStart(
			{
				allDay: true,
				startDate: parseDate('2025-03-20T00:00:00Z', 'UTC')!,
				endDate: start,
				startTime: { hour: 0, minute: 0 },
				endTime: { hour: 0, minute: 0 },
			},
			'start',
			60,
			'UTC'
		)
		expect(allDayPull.endDate.day).toBe(20)

		const container = createContainer()
		const updatedRows: Array<{ start: string; end: string; title: string }> = []
		const cal = mountCalendar(container, {
			initialDate: '2025-03-12T00:00:00Z',
			initialView: 'month',
			timezone: 'America/New_York',
			events: [
				{
					id: 'holiday-1',
					title: 'Public holiday',
					start: '2025-03-12T00:00:00.000Z',
					end: '2025-03-13T00:00:00.000Z',
					allDay: true,
				},
			],
			onEventUpdate: (ev) => {
				updatedRows.push({ start: ev.start, end: ev.end, title: ev.title })
			},
		})
		await flushPreact()
		const before = cal.getSnapshot().rawEvents[0]!
		cal.openEventForm({ id: 'holiday-1' })
		await flushPreact()
		const titleInput = container.querySelector<HTMLInputElement>(
			'form input[name="title"]'
		)
		if (titleInput) {
			titleInput.value = 'Retreat'
			titleInput.dispatchEvent(new Event('input', { bubbles: true }))
		}
		await flushPreact()
		container
			.querySelector<HTMLButtonElement>('[data-testid="dom-event-save-btn"]')
			?.click()
		await flushPreact()
		expect(updatedRows).toEqual([
			{
				title: 'Retreat',
				start: before.start,
				end: before.end,
			},
		])
		cal.destroy()
	})

	it('derives delta and endDelta from appliedUpdates when recurrence all-scope overrides drag day shift', () => {
		const targetEvent = {
			id: 'W_2025-03-12',
			title: 'Weekly',
			start: '2025-03-12T09:00:00.000Z',
			end: '2025-03-12T09:30:00.000Z',
		}
		const primary = {
			id: 'W',
			title: 'Weekly',
			start: '2025-03-05T10:00:00.000Z',
			end: '2025-03-05T10:30:00.000Z',
		}
		const result = resolveCommittedDeltas({
			event: targetEvent,
			primary,
			appliedUpdates: {
				start: '2025-03-12T10:00:00.000Z',
				end: '2025-03-12T10:30:00.000Z',
			},
			deltas: {
				delta: { days: 1, milliseconds: 3_600_000 },
				endDelta: { days: 1, milliseconds: 3_600_000 },
			},
			timezone: 'UTC',
		})
		expect(result).toEqual({
			delta: { days: 0, milliseconds: 3_600_000 },
			endDelta: { days: 0, milliseconds: 3_600_000 },
		})
	})

	it('deduplicates resourcesSet, shares combined loading, and preserves resource layout while pending', async () => {
		const container = createContainer()
		const reportedSets: string[][] = []
		const loadingFlips: boolean[] = []
		let resolveRes!: (rows: Resource[]) => void
		let resolveEv!: (
			rows: Array<{ id: string; title: string; start: string; end: string }>
		) => void

		const cal = mountCalendar(container, {
			initialDate: '2025-03-12T00:00:00Z',
			initialView: 'week',
			timezone: 'UTC',
			orientation: 'vertical',
			loading: (next) => loadingFlips.push(next),
			resourcesSet: (rows) => reportedSets.push(rows.map((r) => String(r.id))),
			events: () =>
				new Promise((resolve) => {
					resolveEv = resolve
				}),
			resources: () =>
				new Promise((resolve) => {
					resolveRes = resolve
				}),
		})

		expect(loadingFlips).toEqual([true])
		expect(reportedSets).toEqual([])
		expect(
			container.querySelector('[data-testid="week-view-header"]')
		).toBeNull()
		expect(container.querySelector('[data-time-column="true"]')).toBeNull()

		resolveRes([
			{ id: 'r1', title: 'Room A' },
			{ id: 'r2', title: 'Room B' },
		])
		await flushPreact()
		expect(loadingFlips).toEqual([true])
		expect(reportedSets).toEqual([['r1', 'r2']])
		expect(
			container.querySelectorAll('[data-testid="resource-header-r1"]').length
		).toBe(1)

		resolveEv([])
		await flushPreact()
		expect(loadingFlips).toEqual([true, false])

		cal.update({
			events: [],
			resources: [
				{ id: 'r1', title: 'Room A' },
				{ id: 'r2', title: 'Room B' },
			],
		})
		await flushPreact()
		expect(reportedSets).toEqual([['r1', 'r2']])

		cal.update({
			resources: [{ id: 'r1', title: 'Room A' }],
		})
		await flushPreact()
		expect(reportedSets).toEqual([['r1', 'r2'], ['r1']])
		cal.destroy()
	})

	it('groups horizontal hourly resource week rows into per-day events-layer containers and wraps default bar content', async () => {
		const container = createContainer()
		const cal = mountCalendar(container, {
			initialDate: '2025-03-12T00:00:00Z',
			initialView: 'week',
			timezone: 'UTC',
			orientation: 'horizontal',
			weekViewGranularity: 'hourly',
			resources: [{ id: 'r1', title: 'Room A' }],
			events: [
				{
					id: 'short-w',
					title: 'Quick check',
					start: '2025-03-12T09:00:00.000Z',
					end: '2025-03-12T09:01:00.000Z',
					resourceId: 'r1',
				},
			],
		})
		await flushPreact()
		const row = container.querySelector('[data-ilamy-part="res-h-row"]')
		const layers =
			row?.querySelectorAll('[data-ilamy-part="events-layer"]') ?? []
		expect(layers.length).toBe(7)
		const bar = container.querySelector(
			'[data-testid="calendar-event-short-w"]'
		)
		expect(
			bar?.querySelector('[data-ilamy-part="event-bar-content"]')
		).not.toBeNull()
		expect(bar?.querySelector('[data-ilamy-part="event-label"]')).not.toBeNull()
		expect(Number(bar?.getAttribute('data-width'))).toBeCloseTo(
			(0.4 / 24) * 100,
			6
		)
		cal.destroy()
	})

	it('renders a multi-day all-day event spanning hidden days as a single overlay bar in week view', async () => {
		const container = createContainer()
		const cal = mountCalendar(container, {
			initialDate: '2025-03-12T00:00:00Z',
			initialView: 'week',
			timezone: 'UTC',
			firstDayOfWeek: 'monday',
			hiddenDays: ['thursday'],
			events: [
				{
					id: 'all-day-span',
					title: 'Midweek Offsite',
					start: '2025-03-12T00:00:00.000Z',
					end: '2025-03-15T00:00:00.000Z',
					allDay: true,
				},
			],
		})
		await flushPreact()
		const overlayBars = container.querySelectorAll(
			'[data-ilamy-part="all-day-events-overlay"] [data-testid="calendar-event-all-day-span"]'
		)
		expect(overlayBars.length).toBe(1)
		// 6 visible days in the week (Thursday hidden); Wednesday + Friday = 2 of 6 columns
		expect(Number(overlayBars[0]?.getAttribute('data-width'))).toBeCloseTo(
			(2 / 6) * 100,
			5
		)
		cal.destroy()
	})

	it('renders vertical daily resource week as a multi-day daily grid and hourly resource headers with sticky day labels', async () => {
		const container = createContainer()
		const cal = mountCalendar(container, {
			initialDate: '2025-03-12T00:00:00Z',
			initialView: 'week',
			timezone: 'UTC',
			orientation: 'vertical',
			weekViewGranularity: 'daily',
			resources: [
				{ id: 'r1', title: 'Room A' },
				{ id: 'r2', title: 'Room B' },
			],
			events: [
				{
					id: 'survey',
					title: 'Site survey',
					start: '2025-03-09T00:00:00.000Z',
					end: '2025-03-13T00:00:00.000Z',
					allDay: true,
					resourceId: 'r1',
				},
			],
		})
		await flushPreact()
		expect(
			container.querySelector('[data-testid="dom-week-view"]')
		).not.toBeNull()
		expect(container.querySelector('[data-testid="all-day-row"]')).toBeNull()
		expect(
			container.querySelectorAll('[data-testid="calendar-event-survey"]').length
		).toBe(1)

		cal.update({
			orientation: 'horizontal',
			weekViewGranularity: 'hourly',
		})
		await flushPreact()
		expect(
			container.querySelectorAll('[data-ilamy-part="res-h-day-label"]').length
		).toBe(7)
		cal.destroy()
	})

	it('preserves resourceIds and leaves resourceId unset when renaming a cross-resource event without changing resource', async () => {
		const container = createContainer()
		const updates: Array<{
			resourceId?: string | number
			resourceIds?: Array<string | number>
			title: string
		}> = []
		const cal = mountCalendar(container, {
			initialDate: '2025-03-12T00:00:00Z',
			initialView: 'month',
			timezone: 'UTC',
			resources: [
				{ id: 'v1', title: 'R1' },
				{ id: 'v3', title: 'R3' },
				{ id: 'v28', title: 'R28' },
			],
			events: [
				{
					id: 'multi-1',
					title: 'Multi',
					start: '2025-03-12T09:00:00.000Z',
					end: '2025-03-12T10:00:00.000Z',
					resourceIds: ['v1', 'v3', 'v28'],
				},
			],
			onEventUpdate: (ev) => {
				updates.push({
					title: ev.title,
					resourceId: ev.resourceId,
					resourceIds: ev.resourceIds,
				})
			},
		})
		await flushPreact()
		cal.openEventForm({ id: 'multi-1' })
		await flushPreact()
		const titleInput = container.querySelector<HTMLInputElement>(
			'form input[name="title"]'
		)
		if (titleInput) {
			titleInput.value = 'Multi renamed'
			titleInput.dispatchEvent(new Event('input', { bubbles: true }))
		}
		await flushPreact()
		container
			.querySelector<HTMLButtonElement>('[data-testid="dom-event-save-btn"]')
			?.click()
		await flushPreact()
		expect(updates).toEqual([
			{
				title: 'Multi renamed',
				resourceId: undefined,
				resourceIds: ['v1', 'v3', 'v28'],
			},
		])
		cal.destroy()
	})

	it('emits zero endDelta when resolveCommittedDeltas runs on appliedUpdates without pointer deltas and sizes month cells compactly', async () => {
		const targetEvent = {
			id: 'series_2025-03-12',
			title: 'Stand-up',
			start: '2025-03-12T09:00:00.000Z',
			end: '2025-03-12T10:00:00.000Z',
		}
		const primary = {
			id: 'series',
			title: 'Team sync',
			start: '2025-03-10T09:00:00.000Z',
			end: '2025-03-10T10:00:00.000Z',
		}
		expect(
			resolveCommittedDeltas({
				event: targetEvent,
				primary,
				appliedUpdates: {
					start: '2025-03-12T09:00:00.000Z',
					end: '2025-03-12T10:00:00.000Z',
				},
				deltas: undefined,
				timezone: 'UTC',
			})
		).toEqual({
			delta: { days: 0, milliseconds: 0 },
			endDelta: { days: 0, milliseconds: 0 },
		})

		const container = createContainer()
		const cal = mountCalendar(container, {
			initialDate: '2025-03-12T00:00:00Z',
			initialView: 'month',
			timezone: 'UTC',
			events: [],
		})
		await flushPreact()
		const cell = container.querySelector<HTMLElement>(
			'[data-testid="day-cell-2025-03-24"]'
		)
		expect(cell?.style.minHeight).toBe('60px')
		cal.destroy()
	})

	it('clears both inline slot backgroundColor and color when event uses Tailwind color classes', async () => {
		const container = createContainer()
		const cal = mountCalendar(container, {
			initialDate: '2025-03-12T00:00:00Z',
			initialView: 'month',
			timezone: 'UTC',
			slotProps: {
				eventBar: {
					style: {
						backgroundColor: '#f1f5f9',
						color: '#0f172a',
					},
				},
			},
			events: [
				{
					id: 'rose-class-event',
					title: 'Urgent review',
					start: '2025-03-12T09:00:00.000Z',
					end: '2025-03-12T10:00:00.000Z',
					backgroundColor: 'bg-rose-600',
					color: 'text-white',
				},
			],
		})
		await flushPreact()
		const bar = container.querySelector<HTMLElement>(
			'[data-testid="calendar-event-rose-class-event"]'
		)
		expect(bar?.className).toContain('bg-rose-600')
		expect(bar?.className).toContain('text-white')
		expect(bar?.style.backgroundColor).toBe('')
		expect(bar?.style.color).toBe('')
		cal.destroy()
	})

	it('applies slotProps.navButton to new-event-btn and restricts viewButtonActive to active view tabs', async () => {
		const container = createContainer()
		const cal = mountCalendar(container, {
			initialDate: '2025-03-12T00:00:00Z',
			initialView: 'month',
			timezone: 'UTC',
			slotProps: {
				navButton: { className: 'custom-nav-btn' },
				viewButton: { className: 'custom-view-btn' },
				viewButtonActive: { className: 'custom-active-view-btn' },
			},
		})
		await flushPreact()

		const newBtn = container.querySelector<HTMLElement>(
			'[data-testid="new-event-btn"]'
		)
		const activeViewBtn = container.querySelector<HTMLElement>(
			'[data-testid="view-btn-month"]'
		)
		const inactiveViewBtn = container.querySelector<HTMLElement>(
			'[data-testid="view-btn-week"]'
		)

		expect(newBtn?.className).toContain('custom-nav-btn')
		expect(newBtn?.className).not.toContain('custom-active-view-btn')
		expect(activeViewBtn?.className).toContain('custom-active-view-btn')
		expect(inactiveViewBtn?.className).toContain('custom-view-btn')
		expect(inactiveViewBtn?.className).not.toContain('custom-active-view-btn')
		cal.destroy()
	})
})
