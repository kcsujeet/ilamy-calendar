import { Button } from '@ilamy/ui/components/button'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface PickerNavProps {
	/** Centered label (the current month, year, or year-block). */
	label: ReactNode
	onPrev: () => void
	onNext: () => void
	prevLabel: string
	nextLabel: string
}

// Prev / center-label / next header shared by the day calendar's month nav and
// the month/year picker grids.
export function PickerNav({
	label,
	onPrev,
	onNext,
	prevLabel,
	nextLabel,
}: PickerNavProps) {
	return (
		<div className="mb-2 flex items-center justify-between">
			<Button
				aria-label={prevLabel}
				onClick={onPrev}
				size="icon"
				variant="ghost"
			>
				<ChevronLeftIcon className="size-4" />
			</Button>
			<div className="text-sm font-medium select-none">{label}</div>
			<Button
				aria-label={nextLabel}
				onClick={onNext}
				size="icon"
				variant="ghost"
			>
				<ChevronRightIcon className="size-4" />
			</Button>
		</div>
	)
}
