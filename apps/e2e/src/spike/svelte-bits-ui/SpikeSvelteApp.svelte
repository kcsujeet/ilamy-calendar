<script lang="ts">
	import type { CalendarEvent } from '@ilamy/calendar'
	import {
		mountIlamyCalendar,
		type MountedSvelteCalendar,
	} from '@ilamy/calendar/svelte'
	import { getAllContexts, onMount, setContext } from 'svelte'
	import SpikeSvelteEvent from './SpikeSvelteEvent.svelte'
	import SpikeSvelteEventForm from './SpikeSvelteEventForm.svelte'
	import SpikeSvelteHeader from './SpikeSvelteHeader.svelte'

	setContext('spike-theme', { brand: 'bits-ui-emerald' })
	const context = getAllContexts()

	let hostEl = $state<HTMLDivElement | null>(null)
	let events = $state<CalendarEvent[]>([
		{
			id: '1',
			title: 'Initial Event',
			start: '2025-03-12T09:00:00.000Z',
			end: '2025-03-12T10:00:00.000Z',
			description: 'Baseline description',
			data: { category: 'work' },
		},
	])

	let mounted = $state<MountedSvelteCalendar | null>(null)

	onMount(() => {
		if (!hostEl) {
			return
		}
		const instance = mountIlamyCalendar(hostEl, {
			initialDate: '2025-03-12T09:00:00.000Z',
			timezone: 'UTC',
			titleFormat: { month: 'long', year: 'numeric' },
			events,
			context,
			slots: {
				header: SpikeSvelteHeader,
				event: SpikeSvelteEvent,
				eventForm: SpikeSvelteEventForm,
			},
			onEventAdd: (added) => {
				events = [...events, added]
			},
			onEventUpdate: (updated) => {
				events = events.map((e) => (e.id === updated.id ? updated : e))
			},
			onEventDelete: (deleted) => {
				events = events.filter((e) => e.id !== deleted.id)
			},
		})
		mounted = instance

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.altKey && event.key === 'ArrowRight') {
				event.preventDefault()
				instance.controller.nextPeriod()
			}
		}
		window.addEventListener('keydown', handleKeyDown, true)

		return () => {
			window.removeEventListener('keydown', handleKeyDown, true)
			instance.destroy()
			mounted = null
		}
	})

	$effect(() => {
		mounted?.update({
			initialDate: '2025-03-12T09:00:00.000Z',
			timezone: 'UTC',
			titleFormat: { month: 'long', year: 'numeric' },
			events,
			context,
			slots: {
				header: SpikeSvelteHeader,
				event: SpikeSvelteEvent,
				eventForm: SpikeSvelteEventForm,
			},
			onEventAdd: (added) => {
				events = [...events, added]
			},
			onEventUpdate: (updated) => {
				events = events.map((e) => (e.id === updated.id ? updated : e))
			},
			onEventDelete: (deleted) => {
				events = events.filter((e) => e.id !== deleted.id)
			},
		})
	})
</script>

<div data-testid="svelte-bits-ui-spike" style="padding: 16px;">
	<div bind:this={hostEl}></div>
	<div data-testid="spike-events" hidden>{JSON.stringify(events)}</div>
</div>
