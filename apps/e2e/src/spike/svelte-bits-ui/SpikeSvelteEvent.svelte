<script lang="ts">
	import type { EventSlotContext } from '@ilamy/calendar-spike/types/slot.types'
	import { onMount } from 'svelte'

	let { event, onClick }: EventSlotContext = $props()

	let mountCount = $state(0)

	onMount(() => {
		mountCount += 1
	})
</script>

<button
	data-testid={`spike-event-${String(event.id)}`}
	onclick={() => onClick()}
	style="display: inline-flex; align-items: center; gap: 8px; margin: 8px; padding: 8px 12px; border: 1px solid #10b981; border-radius: 4px;"
	type="button"
>
	<span>{event.title}</span>
	<span data-testid={`event-mount-count-${String(event.id)}`}>{mountCount}</span
	>
</button>
