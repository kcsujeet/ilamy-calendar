import { afterEach, describe, expect, it } from 'bun:test'
import { Frequency } from 'rrule'
import { generateDomIcal, mountCalendar } from './index'

const createContainer = (): HTMLDivElement => {
	const el = document.createElement('div')
	document.body.appendChild(el)
	return el
}

afterEach(() => {
	document.body.innerHTML = ''
})

describe('@ilamy/dom mountCalendar', () => {
	it('renders all 5 views (month, week, day, year, agenda) and navigates periods', () => {
		const container = createContainer()
		const cal = mountCalendar(container, {
			initialDate: '2026-11-19T09:00:00Z',
			initialView: 'month',
			timezone: 'UTC',
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
		expect(
			container.querySelector('[data-testid="calendar-event-e1"]')?.textContent
		).toContain('Launch Keynote')

		const weekBtn = container.querySelector<HTMLButtonElement>(
			'[data-testid="view-btn-week"]'
		)
		weekBtn?.click()
		expect(
			container.querySelector('[data-testid="dom-week-view"]')
		).not.toBeNull()

		const dayBtn = container.querySelector<HTMLButtonElement>(
			'[data-testid="view-btn-day"]'
		)
		dayBtn?.click()
		expect(
			container.querySelector('[data-testid="dom-day-view"]')
		).not.toBeNull()

		const yearBtn = container.querySelector<HTMLButtonElement>(
			'[data-testid="view-btn-year"]'
		)
		yearBtn?.click()
		expect(
			container.querySelector('[data-testid="dom-year-view"]')
		).not.toBeNull()

		const agendaBtn = container.querySelector<HTMLButtonElement>(
			'[data-testid="view-btn-agenda"]'
		)
		agendaBtn?.click()
		expect(
			container.querySelector('[data-testid="dom-agenda-view"]')
		).not.toBeNull()
		expect(
			container.querySelector('[data-testid="agenda-event-e1"]')?.textContent
		).toContain('Launch Keynote')

		cal.destroy()
		expect(container.children.length).toBe(0)
	})

	it('supports resource views, business hours shading, and editable resize handles', () => {
		const container = createContainer()
		const cal = mountCalendar(container, {
			initialDate: '2026-11-19T09:00:00Z',
			initialView: 'month',
			timezone: 'UTC',
			editable: true,
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
			],
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
		).not.toBeNull()
		expect(
			container.querySelector('[data-testid="resize-handle-end-r1"]')
		).not.toBeNull()

		cal.destroy()
	})

	it('respects unstyled mode, slotProps, and custom renderEvent/renderHeader with cleanup', () => {
		const container = createContainer()
		let headerCleaned = 0
		let eventCleaned = 0

		const cal = mountCalendar(container, {
			initialDate: '2026-11-19T09:00:00Z',
			timezone: 'UTC',
			unstyled: true,
			slotProps: {
				root: {
					className: 'custom-root',
					style: { '--cal-accent': '#10b981' },
				},
			},
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

		const rootEl = container.querySelector<HTMLElement>('[data-slot="root"]')
		expect(rootEl?.classList.contains('custom-root')).toBe(true)
		expect(rootEl?.classList.contains('border')).toBe(false)
		expect(rootEl?.style.getPropertyValue('--cal-accent')).toBe('#10b981')
		expect(container.textContent).toContain('Custom Header:')
		expect(container.textContent).toContain('Badge: Custom Event')

		cal.destroy()
		expect(headerCleaned).toBe(1)
		expect(eventCleaned).toBe(1)
	})

	it('expands recurring events, supports dialog CRUD, and reverts via onEventsChange', () => {
		const container = createContainer()
		let lastRevert: (() => void) | undefined
		const actions: string[] = []

		const cal = mountCalendar(container, {
			initialDate: '2026-11-02T09:00:00Z',
			initialView: 'month',
			timezone: 'UTC',
			events: [
				{
					id: 'standup',
					title: 'Daily Standup',
					start: '2026-11-02T09:00:00Z',
					end: '2026-11-02T09:30:00Z',
					rrule: { freq: Frequency.DAILY, count: 3 },
				},
			],
			onEventsChange: (change) => {
				actions.push(change.action)
				lastRevert = change.revert
			},
		})

		const occurrences = container.querySelectorAll(
			'[data-event-id^="standup_"]'
		)
		expect(occurrences.length).toBe(3)

		// Open "+ New" dialog and submit a new event
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
		if (titleInput) titleInput.value = 'Created Via Dialog'
		dialog
			?.querySelector('form')
			?.dispatchEvent(new Event('submit', { cancelable: true }))

		expect(actions).toEqual(['add'])
		expect(container.textContent).toContain('Created Via Dialog')

		lastRevert?.()
		expect(container.textContent).not.toContain('Created Via Dialog')

		cal.destroy()
	})

	it('exports RFC 5545 iCalendar output with TZID', () => {
		const ics = generateDomIcal(
			[
				{
					id: 'ics-1',
					title: 'Board Review',
					start: '2026-11-19T14:00:00-05:00',
					end: '2026-11-19T15:00:00-05:00',
					timezone: 'America/New_York',
				},
			],
			'America/New_York'
		)

		expect(ics).toContain('BEGIN:VCALENDAR')
		expect(ics).toContain('DTSTART;TZID=America/New_York:20261119T140000')
		expect(ics).toContain('SUMMARY:Board Review')
		expect(ics).toContain('END:VCALENDAR')
	})

	it('keeps sticky headers opaque, preserves per-event colors in StyleX/unstyled, and renders horizontal resource week', () => {
		const container = createContainer()
		const cal = mountCalendar(container, {
			initialDate: '2026-11-19T09:00:00Z',
			initialView: 'month',
			timezone: 'UTC',
			editable: true,
			events: [
				{
					id: 'e-token',
					title: 'Green Sprint',
					start: '2026-11-19T10:00:00Z',
					end: '2026-11-19T11:00:00Z',
					backgroundColor: 'bg-emerald-500',
					color: 'text-white',
				},
				{
					id: 'e-combined',
					title: 'Combined Color Fill',
					start: '2026-11-19T11:00:00Z',
					end: '2026-11-19T12:00:00Z',
					color: 'bg-pink-100 text-pink-800',
				},
				{
					id: 'e-default',
					title: 'Default Color Event',
					start: '2026-11-19T12:00:00Z',
					end: '2026-11-19T13:00:00Z',
				},
				{
					id: 'e-overflow-1',
					title: 'Overflow 1',
					start: '2026-11-19T13:00:00Z',
					end: '2026-11-19T14:00:00Z',
				},
				{
					id: 'e-overflow-2',
					title: 'Overflow 2',
					start: '2026-11-19T14:00:00Z',
					end: '2026-11-19T15:00:00Z',
				},
			],
		})

		const monthHeaderRow = container.querySelector(
			'[data-testid="dom-month-view"] > div'
		)
		expect(monthHeaderRow?.className).toContain('sticky')
		expect(monthHeaderRow?.className).toContain('z-30')
		expect(monthHeaderRow?.className).toContain('bg-background')
		expect(monthHeaderRow?.className).not.toContain('bg-muted/30')

		// Switch to unstyled + StyleX-like slotProps
		cal.update({
			unstyled: true,
			slotProps: {
				eventBar: {
					style: {
						backgroundColor: 'var(--ilamy-primary)',
						color: 'var(--ilamy-primary-fg)',
					},
				},
			},
		})

		const tokenBar = container.querySelector<HTMLElement>(
			'[data-testid="calendar-event-e-token"]'
		)
		expect(tokenBar?.classList.contains('bg-emerald-500')).toBe(true)
		expect(tokenBar?.style.backgroundColor).toBe('')

		const combinedBar = container.querySelector<HTMLElement>(
			'[data-testid="calendar-event-e-combined"]'
		)
		expect(combinedBar?.classList.contains('bg-pink-100')).toBe(true)
		expect(combinedBar?.classList.contains('text-pink-800')).toBe(true)
		expect(combinedBar?.style.backgroundColor).toBe('')

		const defaultBar = container.querySelector<HTMLElement>(
			'[data-testid="calendar-event-e-default"]'
		)
		expect(defaultBar?.style.backgroundColor).toBe('var(--ilamy-primary)')

		const moreBtn = container.querySelector<HTMLElement>(
			'[data-testid="more-events-2026-11-19"]'
		)
		expect(moreBtn?.className).toContain('pointer-events-auto')

		const handle = container.querySelector<HTMLElement>(
			'[data-testid="resize-handle-end-e-token"]'
		)
		expect(handle?.className).toContain('opacity-0')

		// Horizontal resource week renders resources as rows
		cal.update({
			initialView: 'week',
			orientation: 'horizontal',
			resources: [
				{ id: 'room-1', title: 'Room 1' },
				{ id: 'room-2', title: 'Room 2' },
			],
		})
		expect(
			container.querySelector('[data-testid="resource-header-room-1"]')
		).not.toBeNull()
		expect(
			container.querySelector('[data-testid="resource-header-room-2"]')
		).not.toBeNull()

		cal.destroy()
	})

	it('groups prev/next arrows before Today and renders continuation borders on multi-week events', () => {
		const container = createContainer()
		const cal = mountCalendar(container, {
			initialDate: '2026-11-15T09:00:00Z',
			initialView: 'month',
			timezone: 'UTC',
			events: [
				{
					id: 'span-multi',
					title: 'Multi-Week Launch',
					start: '2026-11-12T09:00:00Z',
					end: '2026-11-26T17:00:00Z',
					color: 'bg-amber-100 text-amber-800',
				},
			],
		})

		// Prev and Next sit in the same grouped container ahead of Today
		const prevBtn = container.querySelector('[data-testid="prev-period-btn"]')
		const nextBtn = container.querySelector('[data-testid="next-period-btn"]')
		const todayBtn = container.querySelector('[data-testid="today-btn"]')
		expect(prevBtn?.parentElement).toBe(nextBtn?.parentElement)
		expect(todayBtn?.parentElement).not.toBe(prevBtn?.parentElement)

		// Middle week segment (Nov 15-21) is truncated on both start and end with continuation stripes
		const middleBar = container.querySelector<HTMLElement>(
			'[data-testid="calendar-event-span-multi"][data-truncated-start="true"][data-truncated-end="true"]'
		)
		expect(middleBar).not.toBeNull()
		expect(middleBar?.className).toContain('rounded-none')
		expect(middleBar?.style.borderTopLeftRadius).toBe('0px')
		expect(middleBar?.style.borderTopRightRadius).toBe('0px')
		expect(middleBar?.querySelectorAll('.w-0\\.5').length).toBe(2)

		cal.destroy()
	})

	it('clears stale root inline styles on theme switch and preserves Week/Day/Agenda chrome in StyleX', () => {
		const container = createContainer()
		const cal = mountCalendar(container, {
			initialDate: '2026-11-15T09:00:00Z',
			initialView: 'month',
			timezone: 'UTC',
			unstyled: true,
			slotProps: {
				root: { style: { '--primary': '#4f46e5' } },
				cell: { style: { borderBottom: '1px solid var(--ilamy-border)' } },
			},
			events: [
				{
					id: 'span-multi',
					title: 'Multi-Week Launch',
					start: '2026-11-12T09:00:00Z',
					end: '2026-11-26T17:00:00Z',
					color: 'bg-amber-100 text-amber-800',
				},
			],
		})

		const rootEl = container.querySelector<HTMLElement>('[data-slot="root"]')
		expect(rootEl?.style.getPropertyValue('--primary')).toBe('#4f46e5')

		cal.update({ unstyled: false, slotProps: undefined })
		expect(rootEl?.style.getPropertyValue('--primary')).toBe('')

		cal.update({
			initialView: 'week',
			unstyled: true,
			slotProps: {
				cell: { style: { borderBottom: '1px solid var(--ilamy-border)' } },
			},
		})
		const timeAxis = container.querySelector('[data-testid="dom-time-axis"]')
		expect(timeAxis?.className).toContain('border-r')
		expect(timeAxis?.className).toContain('sticky')

		cal.update({ initialView: 'day' })
		expect(
			container.querySelector('[data-testid="day-view-header"]')?.textContent
		).toContain('November')

		cal.update({ initialView: 'agenda' })
		expect(
			container.querySelector('[data-testid^="agenda-day-"]')
		).not.toBeNull()
		expect(
			container.querySelector('[data-testid="dom-agenda-view"]')?.textContent
		).toContain('(Day ')

		cal.destroy()
	})

	it('opens interactive title date pickers for month, week, and year views', () => {
		const container = createContainer()
		const cal = mountCalendar(container, {
			initialDate: '2026-11-15T09:00:00Z',
			initialView: 'month',
			timezone: 'UTC',
		})

		const titleBtn = container.querySelector<HTMLButtonElement>(
			'[data-testid="calendar-title"]'
		)
		expect(titleBtn?.tagName).toBe('BUTTON')
		titleBtn?.click()

		const monthGrid = document.body.querySelector('[data-slot="month-grid"]')
		expect(monthGrid).not.toBeNull()
		const decBtn = Array.from(monthGrid?.querySelectorAll('button') ?? []).find(
			(btn) => btn.textContent === 'Dec'
		)
		decBtn?.click()
		expect(cal.controller.getState().currentDate).toContain('2026-12-')
		expect(document.body.querySelector('[data-slot="month-grid"]')).toBeNull()

		cal.controller.setView('year')
		container
			.querySelector<HTMLButtonElement>('[data-testid="calendar-title"]')
			?.click()
		expect(
			document.body.querySelector('[data-slot="year-grid"]')
		).not.toBeNull()

		cal.controller.setView('week')
		container
			.querySelector<HTMLButtonElement>('[data-testid="calendar-title"]')
			?.click()
		expect(document.body.querySelector('[data-slot="day-grid"]')).not.toBeNull()

		cal.destroy()
	})

	it('matches React dialog UX with date/time pickers, location, recurring scope modal, and borderless header', () => {
		const container = createContainer()
		const cal = mountCalendar(container, {
			initialDate: '2026-11-15T09:00:00Z',
			initialView: 'month',
			timezone: 'UTC',
			events: [
				{
					id: 'series-1',
					title: 'Daily Standup',
					start: '2026-11-10T10:00:00Z',
					end: '2026-11-10T11:00:00Z',
					rrule: { freq: Frequency.DAILY, interval: 1, count: 5 },
				},
			],
		})

		const rootEl = container.querySelector<HTMLElement>('[data-slot="root"]')
		const bodyEl = container.querySelector<HTMLElement>(
			'[data-testid="calendar-body"]'
		)
		expect(rootEl?.className).not.toContain('border ')
		expect(bodyEl?.className).toContain('border')

		// Create Event form includes DatePicker, TimePicker, Location, and Repeat card
		container
			.querySelector<HTMLButtonElement>('[data-testid="new-event-btn"]')
			?.click()
		const dialog = container.querySelector<HTMLDialogElement>(
			'[data-testid="dom-event-dialog"]'
		)
		expect(dialog?.querySelector('#start-date')).not.toBeNull()
		expect(dialog?.querySelector('#start-time')).not.toBeNull()
		const locationInput = dialog?.querySelector<HTMLInputElement>(
			'input[name="location"]'
		)
		expect(locationInput).not.toBeNull()
		const titleInput = dialog?.querySelector<HTMLInputElement>(
			'input[name="title"]'
		)
		if (titleInput) titleInput.value = 'Offsite Planning'
		if (locationInput) locationInput.value = 'Boardroom B'
		dialog
			?.querySelector('form')
			?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

		const added = cal.controller
			.getState()
			.events.find((evt) => evt.title === 'Offsite Planning')
		expect(added?.location).toBe('Boardroom B')

		// Updating a recurring event opens the dedicated scope confirmation modal
		const recBar = container.querySelector<HTMLElement>(
			'[data-testid^="calendar-event-series-1"]'
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
			'[data-testid="dom-scope-dialog"]'
		)
		expect(scopeDialog).not.toBeNull()
		scopeDialog
			?.querySelector<HTMLButtonElement>('[data-testid="dom-scope-all"]')
			?.click()
		expect(
			container.querySelector('[data-testid="dom-scope-dialog"]')
		).toBeNull()

		cal.destroy()
	})

	it('wires dialog aria-labelledby/describedby, hides pointer resize handles, announces navigation, and opens bars on Space keyup', () => {
		const container = createContainer()
		const cal = mountCalendar(container, {
			initialDate: '2026-11-15T09:00:00Z',
			initialView: 'month',
			timezone: 'UTC',
			editable: true,
			events: [
				{
					id: 'a11y-1',
					title: 'Accessibility Audit',
					start: '2026-11-15T09:00:00Z',
					end: '2026-11-15T10:00:00Z',
				},
			],
		})

		const resizeHandles = container.querySelectorAll('[data-resize-handle]')
		expect(resizeHandles.length).toBeGreaterThan(0)
		for (const handle of resizeHandles) {
			expect(handle.getAttribute('aria-hidden')).toBe('true')
			expect(handle.getAttribute('role')).toBeNull()
		}

		// Polite live region stays empty on initial mount and announces on navigation
		const liveRegion = container.querySelector(
			'[data-testid="calendar-live-region"]'
		)
		expect(liveRegion?.getAttribute('aria-live')).toBe('polite')
		expect(liveRegion?.textContent).toBe('')
		cal.controller.nextPeriod()
		expect(liveRegion?.textContent).toContain('December 2026')
		cal.controller.prevPeriod()

		// Space keyup opens the event dialog and wires aria-labelledby/aria-describedby
		const bar = container.querySelector<HTMLElement>(
			'[data-testid="calendar-event-a11y-1"]'
		)
		expect(bar?.textContent).toContain('Accessibility Audit')
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
		expect(titleId).toBeTruthy()
		expect(descId).toBeTruthy()
		expect(dialog?.querySelector(`#${titleId}`)?.textContent).toBe('Edit Event')
		expect(dialog?.querySelector(`#${descId}`)?.textContent).toBe(
			'Edit Event Details'
		)
		expect(
			dialog?.querySelector('input[name="title"]')?.hasAttribute('autofocus')
		).toBe(true)

		cal.destroy()
	})
})
