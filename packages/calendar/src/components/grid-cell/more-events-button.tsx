import type React from 'react'

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
}) => (
	// biome-ignore lint/a11y/useSemanticElements: Using div as button
	<div
		className="text-muted-foreground hover:text-foreground cursor-pointer text-[10px] whitespace-nowrap sm:text-xs shrink-0 mt-1"
		onClick={(e) => {
			e.stopPropagation()
			onOpen()
		}}
		onKeyDown={(e) => {
			const isActivationKey = e.key === 'Enter' || e.key === ' '
			if (isActivationKey) {
				e.preventDefault()
				e.stopPropagation()
				onOpen()
			}
		}}
		role="button"
		tabIndex={0}
	>
		+{hiddenCount} {label}
	</div>
)
