import type {
	CalendarEvent,
	Dayjs,
	RenderCurrentTimeIndicatorProps,
} from '@ilamy/calendar'
import { cn } from '@ilamy/ui/lib/utils'

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
	const badgeLabel = `${currentTime.format('h:mm A')} ${view} ${resource?.id ?? ''}`

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
