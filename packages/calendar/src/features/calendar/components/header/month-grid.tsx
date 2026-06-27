import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { useState } from 'react'
import { PickerNav } from '@/components/ui/picker-nav'
import { PickerGridCell } from './picker-grid-cell'

interface MonthGridProps {
	/** The currently active date; its month/year drive the highlighted cell. */
	selected: Dayjs
	onSelect: (date: Dayjs) => void
}

// A Jan–Dec month picker with a year pager, for the Month view's title dropdown.
export function MonthGrid({ selected, onSelect }: MonthGridProps) {
	const [year, setYear] = useState(() => selected.year())
	const now = dayjs()

	const months = Array.from({ length: 12 }, (_, index) => ({
		index,
		label: selected.month(index).format('MMM'),
	}))

	return (
		<div className="w-72 p-3" data-slot="month-grid">
			<PickerNav
				label={year}
				nextLabel="Next year"
				onNext={() => setYear((y) => y + 1)}
				onPrev={() => setYear((y) => y - 1)}
				prevLabel="Previous year"
			/>

			<div className="grid grid-cols-3 gap-1">
				{months.map((month) => {
					const isSelected =
						year === selected.year() && month.index === selected.month()
					const isCurrent =
						year === now.year() && month.index === now.month() && !isSelected
					return (
						<PickerGridCell
							isCurrent={isCurrent}
							isSelected={isSelected}
							key={month.index}
							label={month.label}
							onSelect={() =>
								onSelect(selected.year(year).month(month.index).date(1))
							}
						/>
					)
				})}
			</div>
		</div>
	)
}
