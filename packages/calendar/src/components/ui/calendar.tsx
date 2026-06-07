import { Button } from '@ilamy/ui/components/button'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useState } from 'react'
import dayjs, { type Dayjs } from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'
import { getMonthWeeks, getWeekDays, isToday } from '@/lib/utils/date-utils'

interface CalendarProps {
	selected?: Date
	defaultMonth?: Date
	onSelect?: (date: Date | undefined) => void
	disabled?: (date: Date) => boolean
	firstDayOfWeek?: number
	className?: string
}

export function Calendar({
	selected,
	defaultMonth,
	onSelect,
	disabled,
	firstDayOfWeek = 0,
	className,
}: CalendarProps) {
	const [viewMonth, setViewMonth] = useState<Dayjs>(() =>
		dayjs(defaultMonth ?? selected ?? new Date()).startOf('month')
	)

	const weeks = getMonthWeeks(viewMonth, firstDayOfWeek)
	const selectedKey = selected
		? dayjs(selected).format('YYYY-MM-DD')
		: undefined

	const weekdayHeaders = getWeekDays(dayjs(), firstDayOfWeek).map((d) =>
		d.format('dd')
	)

	return (
		<div
			className={cn('bg-background p-3 w-[280px]', className)}
			data-slot="calendar"
		>
			<div className="flex items-center justify-between mb-2">
				<Button
					aria-label="Previous month"
					onClick={() => setViewMonth((m) => m.subtract(1, 'month'))}
					size="icon"
					variant="ghost"
				>
					<ChevronLeftIcon className="size-4" />
				</Button>
				<div className="text-sm font-medium select-none">
					{viewMonth.format('MMMM YYYY')}
				</div>
				<Button
					aria-label="Next month"
					onClick={() => setViewMonth((m) => m.add(1, 'month'))}
					size="icon"
					variant="ghost"
				>
					<ChevronRightIcon className="size-4" />
				</Button>
			</div>

			<table
				className="w-full border-collapse"
				// biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: date-picker pattern — WAI-ARIA grid role on a table is canonical for calendars
				role="grid"
			>
				<thead>
					<tr>
						{weekdayHeaders.map((label, i) => (
							<th
								className="text-muted-foreground text-xs font-medium select-none py-1"
								// biome-ignore lint/suspicious/noArrayIndexKey: weekday header order is stable
								key={i}
							>
								{label}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{weeks.map((week, weekIdx) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: week row order is stable within a month
						<tr key={weekIdx}>
							{week.map((day) => {
								const isOutside = !day.isSame(viewMonth, 'month')
								const isSelected = day.format('YYYY-MM-DD') === selectedKey
								const isDisabled = disabled?.(day.toDate()) ?? false
								return (
									<td
										className="p-0 text-center"
										data-disabled={isDisabled}
										data-outside={isOutside}
										data-selected={isSelected}
										key={day.toISOString()}
										// biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: date-picker pattern — WAI-ARIA gridcell on td is canonical; keyboard nav lives on the child button
										role="gridcell"
										tabIndex={-1}
									>
										<button
											aria-disabled={isDisabled}
											aria-hidden={isOutside}
											className={cn(
												'w-full aspect-square rounded-md text-sm select-none',
												!isDisabled && 'hover:bg-accent cursor-pointer',
												isOutside && 'text-muted-foreground/50',
												isToday(day) &&
													!isSelected &&
													'bg-accent text-accent-foreground',
												isSelected &&
													'bg-primary text-primary-foreground font-medium',
												isDisabled && 'opacity-50 cursor-not-allowed'
											)}
											data-disabled={isDisabled}
											data-selected={isSelected}
											disabled={isDisabled || isOutside}
											onClick={() => onSelect?.(day.toDate())}
											tabIndex={isOutside ? -1 : 0}
											type="button"
										>
											{day.format('D')}
										</button>
									</td>
								)
							})}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}
