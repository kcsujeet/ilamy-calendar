import { afterEach, describe, expect, it } from 'bun:test'
import { createEffect, createRoot, createSignal, flush } from 'solid-js'
import {
	createIlamyCalendar,
	createSolidSlotMount,
	IlamyCalendar,
	mountSolidCalendar,
} from './index'

afterEach(() => {
	document.body.innerHTML = ''
})

describe('@ilamy/adapter-solid (Solid 2.0)', () => {
	it('reactively tracks calendar state with Solid 2 signals and cleans up on dispose', () => {
		createRoot((dispose) => {
			const cal = createIlamyCalendar({
				initialDate: '2026-11-19T09:00:00Z',
				initialView: 'month',
				timezone: 'UTC',
			})

			expect(cal.view()).toBe('month')
			cal.setView('week')
			flush()
			expect(cal.view()).toBe('week')

			cal.addEvent({
				id: 'solid-1',
				title: 'Solid 2 Signal Event',
				start: '2026-11-19T10:00:00Z',
				end: '2026-11-19T11:00:00Z',
			})
			flush()
			expect(cal.events()).toHaveLength(1)
			expect(cal.events().at(0)?.title).toBe('Solid 2 Signal Event')

			dispose()
		})
	})

	it('reactively updates mounted DOM calendar when Solid 2 signal accessor changes', () => {
		const container = document.createElement('div')
		document.body.appendChild(container)

		let disposeRoot: (() => void) | undefined
		createRoot((dispose) => {
			disposeRoot = dispose
			const [title, setTitle] = createSignal('Solid 2 Launch')

			mountSolidCalendar(container, () => ({
				initialDate: '2026-11-19T09:00:00Z',
				timezone: 'UTC',
				events: [
					{
						id: 's-dom-1',
						title: title(),
						start: '2026-11-19T10:00:00Z',
						end: '2026-11-19T11:00:00Z',
					},
				],
			}))
			flush()

			expect(container.dataset.ilamyFramework).toBe('solid')
			expect(container.textContent).toContain('Solid 2 Launch')

			setTitle('Solid 2 Updated')
			flush()
			expect(container.textContent).toContain('Solid 2 Updated')
		})

		disposeRoot?.()
		expect(container.querySelector('[data-testid="ilamy-calendar"]')).toBeNull()
	})

	it('updates Solid region slots in place via createSolidSlotMount without unmounting', () => {
		const container = document.createElement('div')
		document.body.appendChild(container)
		let mountCount = 0

		const headerSlot = createSolidSlotMount<{ title: string }>((props) => {
			mountCount += 1
			const span = document.createElement('span')
			span.dataset.testid = 'solid-slot-title'
			createEffect(
				() => props().title,
				(title) => {
					span.textContent = title
				}
			)
			return span
		})

		const handle = headerSlot.mount(container, { title: 'March 2025' })
		flush()
		expect(mountCount).toBe(1)
		expect(
			container.querySelector('[data-testid="solid-slot-title"]')?.textContent
		).toBe('March 2025')

		handle.update({ title: 'April 2025' })
		flush()
		expect(mountCount).toBe(1)
		expect(
			container.querySelector('[data-testid="solid-slot-title"]')?.textContent
		).toBe('April 2025')

		handle.destroy()
	})

	it('renders IlamyCalendar component node directly', () => {
		createRoot((dispose) => {
			const node = IlamyCalendar({
				initialDate: '2026-11-19T09:00:00Z',
				timezone: 'UTC',
				events: [
					{
						id: 'c1',
						title: 'Solid Component Node',
						start: '2026-11-19T12:00:00Z',
						end: '2026-11-19T13:00:00Z',
					},
				],
			})
			document.body.appendChild(node)
			expect(node.textContent).toContain('Solid Component Node')
			dispose()
		})
	})
})
