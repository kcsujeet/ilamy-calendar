import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from '@ilamy/ui/components/select'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { AnimatedSection } from '@/components/animations/animated-section'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { useDateTimeFormatters } from '@/hooks/use-date-time-formatters'
import { getDayKey, getWeekDays, isToday } from '@/lib/utils/date-utils'
import { keys } from '@/lib/utils/keys'

// Each picker is a Select whose options carry the date they navigate to, so
// onValueChange just looks the chosen option up and selects its date.
interface PickerOption {
	value: string
	label: string
	date: Dayjs
	today?: boolean
}

interface Picker {
	id: string
	hidden: boolean
	title: string
	value: string
	options: PickerOption[]
}

export const TitleContent = () => {
	const { currentDate, view, selectDate, t, firstDayOfWeek } =
		useSmartCalendarContext((ctx) => ({
			currentDate: ctx.currentDate,
			view: ctx.view,
			selectDate: ctx.selectDate,
			t: ctx.t,
			firstDayOfWeek: ctx.firstDayOfWeek,
		}))

	const { formatDateRange } = useDateTimeFormatters()

	const weekDays = getWeekDays(currentDate, firstDayOfWeek)
	const currentWeekStart = weekDays.at(0) ?? currentDate
	const currentWeekEnd = weekDays.at(-1) ?? currentDate
	const currentYear = currentDate.year()

	const monthOptions: PickerOption[] = Array.from(
		{ length: 12 },
		(_, index) => ({
			value: String(index),
			label: currentDate.month(index).format('MMMM'),
			date: currentDate.month(index),
		})
	)

	const yearOptions: PickerOption[] = Array.from({ length: 11 }, (_, i) => {
		const year = currentYear - 5 + i
		return {
			value: String(year),
			label: String(year),
			date: currentDate.year(year),
		}
	})

	const weekOptions: PickerOption[] = Array.from({ length: 7 }, (_, i) => {
		const weekDate = currentDate.subtract(3, 'week').add(i, 'week')
		const days = getWeekDays(weekDate, firstDayOfWeek)
		const start = days.at(0) ?? weekDate
		const end = days.at(-1) ?? weekDate
		return {
			value: getDayKey(start),
			label: formatDateRange(start, end),
			date: start,
		}
	})

	const dayOptions: PickerOption[] = Array.from(
		{ length: currentDate.daysInMonth() },
		(_, i) => {
			const day = currentDate.startOf('month').date(i + 1)
			return {
				value: getDayKey(day),
				label: day.format('ll'),
				date: day,
				today: isToday(day),
			}
		}
	)

	const pickers: Picker[] = [
		{
			id: 'month',
			hidden: view === 'year',
			title: currentDate.format('MMMM'),
			value: String(currentDate.month()),
			options: monthOptions,
		},
		{
			id: 'year',
			hidden: false,
			title: currentDate.format('YYYY'),
			value: String(currentYear),
			options: yearOptions,
		},
		{
			id: 'week',
			hidden: view !== 'week',
			title: formatDateRange(currentWeekStart, currentWeekEnd),
			value: getDayKey(currentWeekStart),
			options: weekOptions,
		},
		{
			id: 'day',
			hidden: view !== 'day',
			title: currentDate.format('dddd, D'),
			value: getDayKey(currentDate),
			options: dayOptions,
		},
	]

	const handleValueChange = (picker: Picker, value: string) => {
		const option = picker.options.find((o) => o.value === value)
		if (option) {
			selectDate(option.date)
		}
	}

	return pickers
		.filter((picker) => !picker.hidden)
		.map((picker) => (
			<Select
				key={picker.id}
				onValueChange={(value) => handleValueChange(picker, value)}
				value={picker.value}
			>
				<SelectTrigger
					aria-label={picker.title}
					className="w-fit gap-1 px-2 font-semibold"
					data-testid="calendar-month-button"
					size="sm"
				>
					{/* Custom trigger content (not SelectValue) keeps each view's distinct
					    title format, e.g. the day picker's "Monday, 5". */}
					<AnimatedSection
						className="flex items-center gap-1 font-semibold"
						transitionKey={keys.listKey(picker.id, getDayKey(currentDate))}
					>
						{picker.title}
					</AnimatedSection>
				</SelectTrigger>
				{/* Don't snap focus back to the trigger on close, otherwise the
				    trigger keeps a focus ring until the next click. */}
				<SelectContent
					className="min-w-40"
					onCloseAutoFocus={(event) => event.preventDefault()}
				>
					{picker.options.map((option) => (
						<SelectItem
							className="whitespace-nowrap"
							key={option.value}
							value={option.value}
						>
							<span className="flex items-center gap-2">
								{option.label}
								{option.today && (
									<span className="bg-primary text-primary-foreground rounded-sm px-1.5 py-0.5 text-xs leading-none">
										{t('today')}
									</span>
								)}
							</span>
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		))
}
