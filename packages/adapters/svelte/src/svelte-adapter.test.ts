import { afterEach, describe, expect, it } from 'bun:test'
import {
	createIlamyCalendar,
	ilamyCalendar,
	ilamyCalendarAction,
} from './index'

afterEach(() => {
	document.body.innerHTML = ''
})

describe('@ilamy/adapter-svelte', () => {
	it('creates a reactive Svelte 5 calendar store with createIlamyCalendar', () => {
		const cal = createIlamyCalendar({
			initialDate: '2026-11-19T09:00:00Z',
			initialView: 'week',
			timezone: 'UTC',
		})

		expect(cal.view).toBe('week')
		cal.setView('day')
		expect(cal.view).toBe('day')

		cal.addEvent({
			id: 's1',
			title: 'Svelte 5 Runes Sync',
			start: '2026-11-19T10:00:00Z',
			end: '2026-11-19T11:00:00Z',
		})
		expect(cal.events).toHaveLength(1)
		expect(cal.events.at(0)?.title).toBe('Svelte 5 Runes Sync')
	})

	it('mounts and cleans up via Svelte 5 Attachment (ilamyCalendar)', () => {
		const el = document.createElement('div')
		document.body.appendChild(el)

		const attach = ilamyCalendar({
			initialDate: '2026-11-19T09:00:00Z',
			timezone: 'UTC',
			events: [
				{
					id: 'att-1',
					title: 'Svelte Attachment Event',
					start: '2026-11-19T10:00:00Z',
					end: '2026-11-19T11:00:00Z',
				},
			],
		})
		const cleanup = attach(el)

		expect(el.dataset.ilamyFramework).toBe('svelte')
		expect(el.textContent).toContain('Svelte Attachment Event')

		if (typeof cleanup === 'function') cleanup()
		expect(el.querySelector('[data-testid="ilamy-dom-calendar"]')).toBeNull()
	})

	it('updates in-place via Svelte Action (ilamyCalendarAction)', () => {
		const el = document.createElement('div')
		document.body.appendChild(el)

		const action = ilamyCalendarAction(el, {
			initialDate: '2026-11-19T09:00:00Z',
			timezone: 'UTC',
			events: [
				{
					id: 'act-1',
					title: 'Initial Svelte Event',
					start: '2026-11-19T10:00:00Z',
					end: '2026-11-19T11:00:00Z',
				},
			],
		})

		expect(el.textContent).toContain('Initial Svelte Event')
		action?.update?.({
			events: [
				{
					id: 'act-1',
					title: 'Updated Svelte Event',
					start: '2026-11-19T10:00:00Z',
					end: '2026-11-19T11:00:00Z',
				},
			],
		})
		expect(el.textContent).toContain('Updated Svelte Event')

		action?.destroy?.()
		expect(el.querySelector('[data-testid="ilamy-dom-calendar"]')).toBeNull()
	})
})
