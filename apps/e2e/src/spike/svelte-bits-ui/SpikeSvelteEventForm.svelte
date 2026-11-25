<script lang="ts">
	import type { CalendarEvent, CalendarEventInput } from '@ilamy/calendar'
	import type { EventFormSlotContext } from '@ilamy/calendar-spike/types/slot.types'
	import { Dialog, Popover, Select } from 'bits-ui'
	import { getContext, onMount } from 'svelte'

	let {
		open,
		event,
		initialStart,
		initialEnd,
		initialAllDay,
		onAdd,
		onUpdate,
		onClose,
	}: EventFormSlotContext = $props()

	const theme = getContext<{ brand: string }>('spike-theme')
	const CATEGORIES = ['work', 'personal', 'urgent'] as const

	let mountCount = $state(0)
	let title = $state('')
	let description = $state('')
	let category = $state('work')
	let popoverNote = $state('none')

	let prevOpen = false
	let prevEventId: string | number | null = null

	onMount(() => {
		mountCount += 1
	})

	const readCategory = (row: CalendarEvent | null): string => {
		const value = row?.data?.category
		return typeof value === 'string' ? value : 'work'
	}

	$effect(() => {
		const nextId = event?.id ?? null
		const openedNow = open && !prevOpen
		const switchedEvent = open && nextId !== prevEventId
		if (openedNow || switchedEvent) {
			title = event?.title ?? ''
			description = event?.description ?? ''
			category = readCategory(event)
			popoverNote = 'none'
		}
		prevOpen = open
		prevEventId = nextId
	})

	const handleSubmit = (submitEvent: SubmitEvent) => {
		submitEvent.preventDefault()
		const payload: CalendarEventInput = {
			id: event?.id ?? crypto.randomUUID(),
			title: title.trim() || 'Untitled',
			start: event?.start ?? initialStart,
			end: event?.end ?? initialEnd,
			allDay: event?.allDay ?? initialAllDay,
			description,
			data: { ...(event?.data ?? {}), category, note: popoverNote },
		}
		if (event) {
			onUpdate(event.id, payload)
		} else {
			onAdd(payload)
		}
		onClose()
	}
</script>

<Dialog.Root
	{open}
	onOpenChange={(nextOpen) => {
		if (!nextOpen) {
			onClose()
		}
	}}
>
	<Dialog.Portal>
		<Dialog.Overlay
			data-testid="form-backdrop"
			style="position: fixed; inset: 0; background-color: rgba(0, 0, 0, 0.35); z-index: 40;"
		/>
		<Dialog.Content
			data-testid="form-dialog-popup"
			style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 50; width: 420px; background-color: #ffffff; padding: 20px; border: 1px solid #d4d4d8;"
		>
			<Dialog.Title>{event ? 'Edit Event' : 'Create Event'}</Dialog.Title>
			<div style="display: flex; gap: 8px; margin-bottom: 8px;">
				<span data-testid="form-theme">{theme.brand}</span>
				<span data-testid="form-mount-count">{mountCount}</span>
			</div>
			<form onsubmit={handleSubmit}>
				<div style="margin-bottom: 8px;">
					<label for="spike-svelte-title">Title</label>
					<input
						bind:value={title}
						data-testid="form-title-input"
						id="spike-svelte-title"
						style="width: 100%; border: 1px solid #cbd5e1; padding: 4px 8px;"
						type="text"
					/>
				</div>
				<div style="margin-bottom: 8px;">
					<label for="spike-svelte-description">Description</label>
					<input
						bind:value={description}
						data-testid="form-description-input"
						id="spike-svelte-description"
						style="width: 100%; border: 1px solid #cbd5e1; padding: 4px 8px;"
						type="text"
					/>
				</div>
				<div style="margin-bottom: 8px;">
					<Select.Root
						type="single"
						value={category}
						onValueChange={(value) => {
							if (value) {
								category = value
							}
						}}
					>
						<Select.Trigger
							aria-label="Category"
							data-testid="form-category-trigger"
							style="border: 1px solid #cbd5e1; padding: 4px 8px;"
						>
							<span data-testid="form-category-value">{category}</span>
						</Select.Trigger>
						<Select.Portal>
							<Select.Content
								data-testid="form-category-popup"
								style="z-index: 60; background-color: #ffffff; border: 1px solid #cbd5e1; padding: 4px;"
							>
								{#each CATEGORIES as item}
									<Select.Item
										data-testid={`form-category-${item}`}
										label={item}
										style="padding: 4px 8px; cursor: pointer;"
										value={item}
									>
										{item}
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Portal>
					</Select.Root>
				</div>
				<div style="margin-bottom: 12px;">
					<Popover.Root>
						<Popover.Trigger
							data-testid="form-note-popover-trigger"
							style="border: 1px solid #cbd5e1; padding: 4px 8px;"
							type="button"
						>
							Quick Note ({popoverNote})
						</Popover.Trigger>
						<Popover.Portal>
							<Popover.Content
								data-testid="form-note-popover-popup"
								style="z-index: 60; background-color: #ffffff; border: 1px solid #cbd5e1; padding: 8px;"
							>
								<span data-testid="popover-body">Popover content</span>
								<button
									data-testid="popover-set-note"
									onclick={() => {
										popoverNote = 'pinned'
									}}
									type="button"
								>
									Pin note
								</button>
							</Popover.Content>
						</Popover.Portal>
					</Popover.Root>
				</div>
				<div style="display: flex; gap: 8px;">
					<button data-testid="form-save" type="submit">Save</button>
					<Dialog.Close
						data-testid="form-cancel"
						onclick={() => onClose()}
						type="button"
					>
						Cancel
					</Dialog.Close>
				</div>
			</form>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
