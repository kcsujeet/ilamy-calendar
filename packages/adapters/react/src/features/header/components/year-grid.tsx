import { fromFields, now, type ZonedDate } from '@ilamy/utils/temporal'
import { useState } from 'react'
import { PickerNav } from '@/components/ui/picker-nav'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { PickerGridCell } from './picker-grid-cell'

const BLOCK = 12

interface YearGridProps {
	/** The currently active date; its year drives the highlighted cell. */
	selected: ZonedDate
	onSelect: (date: ZonedDate) => void
}

// A 12-year block picker with a pager, for the Year view's title dropdown.
export function YearGrid({ selected, onSelect }: YearGridProps) {
	const t = useSmartCalendarContext((context) => context.t)
	// Align blocks to multiples of 12 so the active year sits in a stable grid.
	const [blockStart, setBlockStart] = useState(
		() => selected.year - (selected.year % BLOCK)
	)
	const currentNow = now(selected.timeZoneId)

	const years = Array.from({ length: BLOCK }, (_, i) => blockStart + i)

	return (
		<div className="w-72 p-3" data-slot="year-grid">
			<PickerNav
				label={`${blockStart} – ${blockStart + BLOCK - 1}`}
				nextLabel={t('nextYears')}
				onNext={() => setBlockStart((s) => s + BLOCK)}
				onPrev={() => setBlockStart((s) => s - BLOCK)}
				prevLabel={t('previousYears')}
			/>

			<div className="grid grid-cols-3 gap-1">
				{years.map((year) => {
					const isSelected = year === selected.year
					const isCurrent = year === currentNow.year && !isSelected
					return (
						<PickerGridCell
							isCurrent={isCurrent}
							isSelected={isSelected}
							key={year}
							label={year}
							onSelect={() =>
								onSelect(
									fromFields(
										{
											year,
											month: selected.month,
											day: selected.day,
											hour: selected.hour,
											minute: selected.minute,
											second: selected.second,
											millisecond: selected.millisecond,
										},
										selected.timeZoneId
									)
								)
							}
						/>
					)
				})}
			</div>
		</div>
	)
}
