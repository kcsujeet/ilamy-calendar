import type {
	CalendarEvent,
	Dayjs,
	EventFormProps,
	RenderCurrentTimeIndicatorProps,
	Resource,
} from '@ilamy/calendar'
import { dayjs, useIlamyCalendarContext } from '@ilamy/calendar'
import { Button } from '@ilamy/ui/components/button'
import { cn } from '@ilamy/ui/lib/utils'
import { useEffect, useState } from 'react'

// Custom event renderer — adapts its typography to the configured eventHeight.
// Returned as a factory so the demo can vary the renderer with the current
// eventHeight without recreating an inline closure inside the page component.
export function createRenderEvent(eventHeight: number) {
	return function renderEvent(event: CalendarEvent) {
		const backgroundColor = event.backgroundColor || 'bg-blue-500'
		const color = event.color || 'text-blue-800'
		const isCompact = eventHeight <= 24
		const isLarge = eventHeight >= 36
		const titleSize = isLarge ? 'text-xs' : 'text-[10px]'
		const timeSize = isLarge ? 'text-[10px]' : 'text-[8px]'

		return (
			<div
				className={cn(
					'border-primary border border-l-2 px-2 w-full h-full overflow-clip',
					backgroundColor,
					color
				)}
				style={{ backgroundColor, color }}
			>
				<p className={cn('font-semibold truncate leading-tight', titleSize)}>
					{event.title}
				</p>
				{!isCompact && (
					<p className={cn('truncate opacity-80 leading-tight', timeSize)}>
						{event.start.format('h:mm A')} - {event.end.format('h:mm A')}
					</p>
				)}
			</div>
		)
	}
}

// Custom resource renderer — counts the events on each resource. Returned as a
// factory closing over the current resource events.
export function createRenderResource(resourceEvents: CalendarEvent[]) {
	return function renderResource(resource: Resource) {
		const eventsForResource = resourceEvents.filter(
			(event) =>
				event.resourceId === resource.id ||
				event.resourceIds?.includes(resource.id)
		)
		const recurringIds = new Set<string>()
		const nonRecurringIds = new Set<string>()
		for (const event of eventsForResource) {
			const bucket = event.rrule ? recurringIds : nonRecurringIds
			bucket.add(String(event.id))
		}
		const recurringCount = recurringIds.size
		const totalCount = recurringCount + nonRecurringIds.size

		return (
			<div className="flex items-center justify-between p-2 h-full">
				<div className="flex flex-col">
					<span
						className="font-semibold text-sm"
						style={{ color: resource.color }}
					>
						{resource.title}
					</span>
					<span className="text-xs text-muted-foreground">
						{totalCount} {totalCount === 1 ? 'event' : 'events'}
						{recurringCount > 0 && (
							<span className="ml-1">({recurringCount} recurring)</span>
						)}
					</span>
				</div>
				<div
					className="w-2 h-2 rounded-full"
					style={{ backgroundColor: resource.color }}
				/>
			</div>
		)
	}
}

// Custom current time indicator renderer.
// Demonstrates branching on the `axis` prop so a single consumer-supplied
// render function can position correctly across vertical day/week grids
// (axis === 'vertical') and horizontal resource hour grids (axis === 'horizontal').
export function renderCurrentTimeIndicator({
	currentTime,
	progress,
	resource,
	view,
	axis,
}: RenderCurrentTimeIndicatorProps) {
	// In resource day view, ONLY show the badge for the first resource to avoid
	// cluttering the indicator with multiple identical time badges per row/column.
	const isPrimaryResource = !resource || resource.id === 'room-a'
	const showBadge = view === 'day' ? isPrimaryResource : true
	const badgeLabel = currentTime.format('h:mm A')

	if (axis === 'horizontal') {
		return (
			<div
				className="absolute top-0 bottom-0 z-50 pointer-events-none w-0.5 flex flex-col"
				style={{ left: `${progress}%` }}
			>
				{showBadge && (
					<div className="absolute top-0 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] sm:text-xs px-1.5 py-0.5 rounded-b-md font-medium shadow-sm whitespace-nowrap z-10">
						{badgeLabel}
					</div>
				)}
				{/* Red line extends across the full row height */}
				<div className="flex-1 bg-red-500" />
			</div>
		)
	}

	return (
		<div
			className="absolute left-0 right-0 z-50 pointer-events-none h-0.5 flex"
			style={{ top: `${progress}%` }}
		>
			{showBadge && (
				<div className="absolute left-0 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] sm:text-xs px-1.5 py-0.5 rounded-r-md font-medium shadow-sm whitespace-nowrap z-10">
					{badgeLabel}
				</div>
			)}
			{/* Red line extends across all columns */}
			<div className="flex-1 bg-red-500" />
		</div>
	)
}

// Custom hour renderer — stacks the hour number above its AM/PM marker.
export function renderHour(date: Dayjs) {
	return (
		<div className="flex flex-col items-center leading-tight">
			<span className="font-bold text-sm">{date.format('h')}</span>
			<span className="text-[10px] opacity-60 uppercase font-medium">
				{date.format('A')}
			</span>
		</div>
	)
}

// Custom calendar header — reads the live date/view from context to show a
// bespoke header (demonstrates the headerComponent prop + useIlamyCalendarContext).
export function CustomCalendarHeader() {
	const { currentDate, setView } = useIlamyCalendarContext()
	const views: Array<'month' | 'week' | 'day' | 'year'> = [
		'month',
		'week',
		'day',
		'year',
	]
	return (
		<div className="text-center text-2xl font-semibold p-4 text-amber-500">
			Current Date: {currentDate.format('MMMM YYYY')}
			<div className="flex justify-center space-x-2">
				{views.map((view) => (
					<Button key={view} onClick={() => setView(view)} size="sm">
						{view.charAt(0).toUpperCase() + view.slice(1)} View
					</Button>
				))}
			</div>
			<div className="text-sm mt-2">
				Custom header using useIlamyCalendarContext hook
			</div>
		</div>
	)
}

// Custom event form — a bespoke modal passed via the renderEventForm prop.
export function CustomEventForm({
	open,
	selectedEvent,
	onAdd,
	onUpdate,
	onDelete,
	onClose,
}: EventFormProps) {
	const [title, setTitle] = useState(selectedEvent?.title || '')

	useEffect(() => {
		setTitle(selectedEvent?.title || '')
	}, [selectedEvent])

	if (!open) {
		return null
	}

	const handleSubmit = (event: React.FormEvent) => {
		event.preventDefault()
		const base: CalendarEvent = {
			id: selectedEvent?.id || `event-${dayjs().valueOf()}`,
			title: title || 'New Event',
			start: selectedEvent?.start || dayjs(),
			end: selectedEvent?.end || dayjs(),
			...selectedEvent,
		}
		if (selectedEvent?.id && onUpdate) {
			onUpdate({ ...base, title })
		} else if (onAdd) {
			onAdd({ ...base, title })
		}
		onClose()
	}

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
			<div className="bg-background border border-border rounded-lg p-6 w-full max-w-md shadow-lg">
				<h3 className="text-lg font-semibold mb-4 text-amber-500">
					Custom Event Form
				</h3>
				<p className="text-xs text-muted-foreground mb-4">
					This is a custom form rendered via the renderEventForm prop
				</p>
				<form className="space-y-4" onSubmit={handleSubmit}>
					<div>
						<label
							className="block text-sm font-medium mb-1"
							htmlFor="playground-event-form-title"
						>
							Event Title
						</label>
						<input
							className="w-full px-3 py-2 border border-border rounded-md bg-background"
							id="playground-event-form-title"
							onChange={(event) => setTitle(event.target.value)}
							placeholder="Enter event title"
							type="text"
							value={title}
						/>
					</div>
					<div className="flex gap-2 justify-end">
						{selectedEvent?.id && onDelete && (
							<Button
								onClick={() => {
									onDelete(selectedEvent)
									onClose()
								}}
								size="sm"
								type="button"
								variant="destructive"
							>
								Delete
							</Button>
						)}
						<Button onClick={onClose} size="sm" type="button" variant="outline">
							Cancel
						</Button>
						<Button size="sm" type="submit">
							{selectedEvent?.id ? 'Update' : 'Create'}
						</Button>
					</div>
				</form>
			</div>
		</div>
	)
}
