import { Button } from '@ilamy/ui/components/button'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useState } from 'react'
import { PickerGridCell } from './picker-grid-cell'

const BLOCK = 12

interface YearGridProps {
	/** The currently active date; its year drives the highlighted cell. */
	selected: Dayjs
	onSelect: (date: Dayjs) => void
}

// A 12-year block picker with a pager, for the Year view's title dropdown.
export function YearGrid({ selected, onSelect }: YearGridProps) {
	// Align blocks to multiples of 12 so the active year sits in a stable grid.
	const [blockStart, setBlockStart] = useState(
		() => selected.year() - (selected.year() % BLOCK)
	)
	const now = dayjs()

	const years = Array.from({ length: BLOCK }, (_, i) => blockStart + i)

	return (
		<div className="w-72 p-3" data-slot="year-grid">
			<div className="mb-2 flex items-center justify-between">
				<Button
					aria-label="Previous years"
					onClick={() => setBlockStart((s) => s - BLOCK)}
					size="icon"
					variant="ghost"
				>
					<ChevronLeftIcon className="size-4" />
				</Button>
				<div className="text-sm font-medium select-none">
					{blockStart} – {blockStart + BLOCK - 1}
				</div>
				<Button
					aria-label="Next years"
					onClick={() => setBlockStart((s) => s + BLOCK)}
					size="icon"
					variant="ghost"
				>
					<ChevronRightIcon className="size-4" />
				</Button>
			</div>

			<div className="grid grid-cols-3 gap-1">
				{years.map((year) => {
					const isSelected = year === selected.year()
					const isCurrent = year === now.year() && !isSelected
					return (
						<PickerGridCell
							isCurrent={isCurrent}
							isSelected={isSelected}
							key={year}
							label={year}
							onSelect={() => onSelect(selected.year(year))}
						/>
					)
				})}
			</div>
		</div>
	)
}
