import type { ReactNode } from 'react'
import { memo } from 'react'
import type { CalendarEvent } from '@/components/types'
import { cn } from '@/lib/utils'

const getBorderRadiusClass = (
	isTruncatedStart: boolean,
	isTruncatedEnd: boolean
) => {
	if (isTruncatedStart && isTruncatedEnd) return 'rounded-none'
	if (isTruncatedStart) return 'rounded-r-md rounded-l-none'
	if (isTruncatedEnd) return 'rounded-l-md rounded-r-none'
	return 'rounded-md'
}

interface EventContentProps {
	event: CalendarEvent
	className?: string
	onClick?: (event: CalendarEvent) => void
	renderEvent?: (event: CalendarEvent) => ReactNode
}

const NoMemoEventContent: React.FC<EventContentProps> = ({
	event,
	className,
	onClick,
	renderEvent,
}) => {
	const enhanced = event as unknown as {
		isTruncatedStart?: boolean
		isTruncatedEnd?: boolean
	}
	const isTruncatedStart = Boolean(enhanced.isTruncatedStart)
	const isTruncatedEnd = Boolean(enhanced.isTruncatedEnd)

	const handleClick = onClick
		? (e: React.MouseEvent) => {
				e.stopPropagation()
				onClick(event)
			}
		: undefined

	if (renderEvent) {
		return (
			// biome-ignore lint/a11y/useKeyWithClickEvents: click handler on event item
			<div className={className} onClick={handleClick}>
				{renderEvent(event)}
			</div>
		)
	}

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: click handler on event item
		<div
			className={cn(
				event.backgroundColor || 'bg-blue-500',
				event.color || 'text-white',
				'h-full w-full px-1 border-[1.5px] border-card text-left overflow-clip relative',
				getBorderRadiusClass(isTruncatedStart, isTruncatedEnd),
				className
			)}
			onClick={handleClick}
			style={{ backgroundColor: event.backgroundColor, color: event.color }}
		>
			{isTruncatedStart && (
				<div className="absolute left-0 top-0 bottom-0 w-0.5 bg-foreground/25" />
			)}

			<p
				className={cn(
					'text-[10px] font-semibold sm:text-xs mt-0.5',
					isTruncatedStart && 'pl-1',
					isTruncatedEnd && 'pr-1'
				)}
			>
				{event.title}
			</p>

			{isTruncatedEnd && (
				<div className="absolute right-0 top-0 bottom-0 w-0.5 bg-foreground/25" />
			)}
		</div>
	)
}

export const EventContent = memo(NoMemoEventContent)
