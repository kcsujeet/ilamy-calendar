import { afterEach, describe, expect, it } from 'bun:test'
import { createApp, effectScope, h, nextTick, ref } from 'vue'
import { IlamyCalendar, useIlamyCalendar } from './index'

afterEach(() => {
	document.body.innerHTML = ''
})

describe('@ilamy/adapter-vue', () => {
	it('provides reactive state via useIlamyCalendar composable and cleans up on scope dispose', () => {
		const scope = effectScope()
		let handle: ReturnType<typeof useIlamyCalendar> | undefined

		scope.run(() => {
			handle = useIlamyCalendar({
				initialDate: '2026-11-19T09:00:00Z',
				initialView: 'day',
				timezone: 'UTC',
			})
		})

		expect(handle?.view.value).toBe('day')
		expect(handle?.currentDate.value).toBe('2026-11-19T09:00:00+00:00')

		handle?.nextPeriod()
		expect(handle?.currentDate.value).toBe('2026-11-20T09:00:00+00:00')

		scope.stop()
		handle?.nextPeriod()
		// After scope disposal, Vue shallowRef no longer receives updates
		expect(handle?.currentDate.value).toBe('2026-11-20T09:00:00+00:00')
	})

	it('mounts IlamyCalendar component with reactive props, Vue scoped slots, and emits', async () => {
		const host = document.createElement('div')
		document.body.appendChild(host)

		const titleRef = ref('Vue Sprint Demo')
		const viewedChanges: string[] = []

		const Root = {
			setup() {
				return () =>
					h(
						IlamyCalendar,
						{
							initialDate: '2026-11-19T09:00:00Z',
							initialView: 'month',
							timezone: 'UTC',
							events: [
								{
									id: 'v1',
									title: titleRef.value,
									start: '2026-11-19T10:00:00Z',
									end: '2026-11-19T11:00:00Z',
								},
							],
							onViewChange: (v: string) => viewedChanges.push(v),
						},
						{
							event: ({ event }: { event: { title: string } }) => [
								h(
									'span',
									{ class: 'vue-slot-badge' },
									`VueSlot:${event.title}`
								),
							],
						}
					)
			},
		}

		const app = createApp(Root)
		app.mount(host)

		expect(host.querySelector('[data-ilamy-framework="vue"]')).not.toBeNull()
		const initialSlotHost = host.querySelector('[data-ilamy-slot-host]')
		expect(host.querySelector('.vue-slot-badge')?.textContent).toBe(
			'VueSlot:Vue Sprint Demo'
		)

		titleRef.value = 'Updated Vue Event'
		await nextTick()
		expect(host.querySelector('.vue-slot-badge')?.textContent).toBe(
			'VueSlot:Updated Vue Event'
		)
		expect(host.querySelector('[data-ilamy-slot-host]')).toBe(initialSlotHost)

		host
			.querySelector<HTMLButtonElement>('[data-testid="view-btn-week"]')
			?.click()
		expect(viewedChanges).toEqual(['week'])

		app.unmount()
		expect(host.querySelector('[data-testid="ilamy-calendar"]')).toBeNull()
	})
})
