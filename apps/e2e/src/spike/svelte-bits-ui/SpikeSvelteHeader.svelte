<script lang="ts">
	import type { HeaderSlotContext } from '@ilamy/calendar-spike/types/slot.types'
	import { getContext, onMount } from 'svelte'

	let {
		title,
		currentDate,
		prevPeriod,
		nextPeriod,
		openEventForm,
	}: HeaderSlotContext = $props()

	const theme = getContext<{ brand: string }>('spike-theme')
	let mountCount = $state(0)

	onMount(() => {
		mountCount += 1
	})
</script>

<div
	data-testid="custom-header-slot"
	style="display: flex; align-items: center; gap: 8px; padding: 12px; border-bottom: 1px solid #d4d4d8;"
>
	<span data-testid="header-theme">{theme.brand}</span>
	<span data-testid="header-mount-count">{mountCount}</span>
	<span data-testid="header-title">{title}</span>
	<span data-testid="header-context-date">{currentDate}</span>
	<input
		aria-label="Search events"
		data-testid="header-search"
		placeholder="Search"
		type="text"
	/>
	<button data-testid="header-prev" onclick={() => prevPeriod()} type="button">
		Previous
	</button>
	<button data-testid="header-next" onclick={() => nextPeriod()} type="button">
		Next
	</button>
	<button
		data-testid="header-new"
		onclick={() => openEventForm()}
		type="button"
	>
		+ New
	</button>
</div>
