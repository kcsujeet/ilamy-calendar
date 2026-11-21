import {
	formatDate,
	fromFields,
	now,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import { useState } from 'react'
import { PickerNav } from '@/components/ui/picker-nav'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { PickerGridCell } from './picker-grid-cell'

interface MonthGridProps {
	/** The currently active date; its month/year drive the highlighted cell. */
	selected: ZonedDate
	onSelect: (date: ZonedDate) => void
}

// A Jan–Dec month picker with a year pager, for the Month view's title dropdown.
export function MonthGrid({ selected, onSelect }: MonthGridProps) {
	const { t, currentLocale } = useSmartCalendarContext((context) => ({
		t: context.t,
		currentLocale: context.currentLocale,
	}))
	const [year, setYear] = useState(() => selected.year)
	const currentNow = now(selected.timeZoneId)

	const firstOfMonth = (monthNumber: number): ZonedDate =>
		fromFields({ year, month: monthNumber, day: 1 }, selected.timeZoneId)

	const selectMonth = (monthNumber: number): ZonedDate =>
		fromFields(
			{
				year,
				month: monthNumber,
				day: 1,
				hour: selected.hour,
				minute: selected.minute,
				second: selected.second,
				millisecond: selected.millisecond,
			},
			selected.timeZoneId
		)

	const months = Array.from({ length: 12 }, (_, index) => {
		const monthNumber = index + 1
		return {
			monthNumber,
			label: formatDate(
				firstOfMonth(monthNumber),
				{ month: 'short' },
				currentLocale
			),
		}
	})

	return (
		<div className="w-72 p-3" data-slot="month-grid">
			<PickerNav
				label={year}
				nextLabel={t('nextYear')}
				onNext={() => setYear((y) => y + 1)}
				onPrev={() => setYear((y) => y - 1)}
				prevLabel={t('previousYear')}
			/>

			<div className="grid grid-cols-3 gap-1">
				{months.map((month) => {
					const isSelected =
						year === selected.year && month.monthNumber === selected.month
					const isCurrent =
						year === currentNow.year &&
						month.monthNumber === currentNow.month &&
						!isSelected
					return (
						<PickerGridCell
							isCurrent={isCurrent}
							isSelected={isSelected}
							key={month.monthNumber}
							label={month.label}
							onSelect={() => onSelect(selectMonth(month.monthNumber))}
						/>
					)
				})}
			</div>
		</div>
	)
}
