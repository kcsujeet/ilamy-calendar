import { afterEach, describe, expect, it } from 'bun:test'
import {
	createAngularCalendar,
	type IlamyCalendarElement,
	registerIlamyCalendarElement,
} from './index'

afterEach(() => {
	document.body.innerHTML = ''
})

describe('@ilamy/adapter-angular (Angular 22)', () => {
	it('exposes Angular 22 signals via createAngularCalendar and cleans up on destroy', () => {
		const cal = createAngularCalendar({
			initialDate: '2026-11-19T09:00:00Z',
			initialView: 'month',
			timezone: 'UTC',
		})

		expect(cal.view()).toBe('month')
		cal.setView('day')
		expect(cal.view()).toBe('day')

		cal.addEvent({
			id: 'ng-1',
			title: 'Angular 22 Signals Review',
			start: '2026-11-19T14:00:00Z',
			end: '2026-11-19T15:00:00Z',
		})
		expect(cal.events()).toHaveLength(1)
		expect(cal.events().at(0)?.title).toBe('Angular 22 Signals Review')

		cal.destroy()
	})

	it('registers and mounts <ilamy-calendar> custom element with property updates and CustomEvents', () => {
		registerIlamyCalendarElement()
		const el = document.createElement('ilamy-calendar') as IlamyCalendarElement
		el.options = {
			initialDate: '2026-11-19T09:00:00Z',
			initialView: 'month',
			timezone: 'UTC',
			events: [
				{
					id: 'ce-1',
					title: 'Angular Standalone Meeting',
					start: '2026-11-19T10:00:00Z',
					end: '2026-11-19T11:00:00Z',
				},
			],
		}

		const viewChanges: string[] = []
		el.addEventListener('viewChange', (evt) => {
			if (evt instanceof CustomEvent && typeof evt.detail === 'string') {
				viewChanges.push(evt.detail)
			}
		})

		document.body.appendChild(el)
		expect(el.dataset.ilamyFramework).toBe('angular')
		expect(el.textContent).toContain('Angular Standalone Meeting')

		el.events = [
			{
				id: 'ce-1',
				title: 'Angular Updated Event',
				start: '2026-11-19T10:00:00Z',
				end: '2026-11-19T11:00:00Z',
			},
		]
		expect(el.textContent).toContain('Angular Updated Event')

		el.querySelector<HTMLButtonElement>(
			'[data-testid="view-btn-agenda"]'
		)?.click()
		expect(viewChanges).toEqual(['agenda'])

		el.remove()
		expect(el.querySelector('[data-testid="ilamy-dom-calendar"]')).toBeNull()
	})
})
