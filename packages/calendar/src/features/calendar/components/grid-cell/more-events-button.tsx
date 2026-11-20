import type React from 'react'
import { useSlotProps } from '@/features/calendar/stores/calendar-theme-context'

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
		structuralClassName: 'cursor-pointer whitespace-nowrap shrink-0 mt-1',
		defaultClassName:
			'text-muted-foreground hover:text-foreground text-[10px] sm:text-xs',
	})

	return (
		// biome-ignore lint/a11y/useSemanticElements: Using div as button
		<div
			className={slot.className}
			onClick={(e) => {
				e.stopPropagation()
				onOpen()
			}}
			onKeyDown={(e) => {
				const isEnterKey = e.key === 'Enter'
				const isSpaceKey = e.key === ' '
				const isActivationKey = isEnterKey || isSpaceKey
				if (isActivationKey) {
					e.preventDefault()
					e.stopPropagation()
					onOpen()
				}
			}}
			role="button"
			style={slot.style}
			tabIndex={0}
		>
			+{hiddenCount} {label}
		</div>
	)
}
