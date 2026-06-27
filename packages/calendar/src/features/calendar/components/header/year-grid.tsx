import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { useState } from 'react'
import { PickerNav } from '@/components/ui/picker-nav'
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
			<PickerNav
				label={`${blockStart} – ${blockStart + BLOCK - 1}`}
				nextLabel="Next years"
				onNext={() => setBlockStart((s) => s + BLOCK)}
				onPrev={() => setBlockStart((s) => s - BLOCK)}
				prevLabel="Previous years"
			/>

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
