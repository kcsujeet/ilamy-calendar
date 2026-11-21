import type React from 'react'
import { useSlotProps } from '@/stores/calendar-theme-context'

interface MoreEventsButtonProps {
	hiddenCount: number
	/** The translated word after the count, e.g. "more". */
	label: string
	onOpen: () => void
}

/**
 * "+N more": the events a cell has no room for. Opening must not reach the
 * cell underneath, whose own click creates an event.
 */
export const MoreEventsButton: React.FC<MoreEventsButtonProps> = ({
	hiddenCount,
	label,
	onOpen,
}) => {
	const slot = useSlotProps('moreLink', {
		structuralClassName:
			'cursor-pointer whitespace-nowrap shrink-0 mt-1 border-0 bg-transparent p-0 text-left',
		defaultClassName:
			'text-muted-foreground hover:text-foreground text-[10px] sm:text-xs focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring rounded-xs',
	})

	return (
		<button
			className={slot.className}
			onClick={(e) => {
				e.stopPropagation()
				onOpen()
			}}
			style={slot.style}
			type="button"
		>
			+{hiddenCount} {label}
		</button>
	)
}
