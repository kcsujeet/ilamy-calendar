import { Button } from '@ilamy/ui/components/button'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useState } from 'react'
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
			<div className="mb-2 flex items-center justify-between">
				<Button
					aria-label="Previous year"
					onClick={() => setYear((y) => y - 1)}
					size="icon"
					variant="ghost"
				>
					<ChevronLeftIcon className="size-4" />
				</Button>
				<div className="text-sm font-medium select-none">{year}</div>
				<Button
					aria-label="Next year"
					onClick={() => setYear((y) => y + 1)}
					size="icon"
					variant="ghost"
				>
					<ChevronRightIcon className="size-4" />
				</Button>
			</div>

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
