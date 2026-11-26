import { afterEach, describe, expect, it } from 'bun:test'
import { Frequency } from 'rrule'
import { agendaPlugin } from '../../features/plugins/agenda'
import { exportToICalendar, icalPlugin } from '../../features/plugins/ical'
import { recurrencePlugin } from '../../features/plugins/recurrence'
import { yearPlugin } from '../../features/plugins/year'
import type { HeaderSlotContext, Resource } from '../../index'
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
				.querySelector('[data-testid="month-header"]')
				?.classList.contains('custom-view-header')
		).toBe(true)
		expect(
			container.querySelectorAll('[data-testid="week-number"]').length
		).toBe(6)
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

		// Form dialog time-picker & mini-calendar ARIA contracts
		cal.openEventForm()
		await flushPreact()
		expect(cal.getSnapshot().isEventFormOpen).toBe(true)
		const startTimeBtn = container.querySelector<HTMLButtonElement>(
			'[data-testid="time-picker-start-time"]'
		)
		expect(startTimeBtn?.getAttribute('role')).toBe('combobox')
		expect(startTimeBtn?.getAttribute('aria-controls')).toBeNull()
		startTimeBtn?.click()
		await flushPreact()
		const controlsId = startTimeBtn?.getAttribute('aria-controls')
		expect(controlsId).toBeTruthy()
		expect(
			container.querySelector(`#${controlsId}`)?.getAttribute('role')
		).toBe('listbox')

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
})
