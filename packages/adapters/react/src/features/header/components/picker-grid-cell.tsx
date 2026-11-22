import { cn } from '@ilamy/ui/lib/utils'
import type { ReactNode } from 'react'

interface PickerGridCellProps {
	label: ReactNode
	/** The active value (solid fill, like the day picker's selected day). */
	isSelected: boolean
	/** Today's month/year (outline ring), shown only when not selected. */
	isCurrent: boolean
	onSelect: () => void
}

// One cell in the month / year picker grids (the header title dropdown).
export function PickerGridCell({
	label,
	isSelected,
	isCurrent,
	onSelect,
}: PickerGridCellProps) {
	return (
		<button
			aria-pressed={isSelected}
			className={cn(
				'hover:bg-accent rounded-md py-2 text-sm font-medium cursor-pointer select-none',
				isCurrent && 'ring-1 ring-inset ring-foreground/40',
				isSelected && 'bg-primary text-primary-foreground'
			)}
			onClick={onSelect}
			type="button"
		>
			{label}
		</button>
	)
}
