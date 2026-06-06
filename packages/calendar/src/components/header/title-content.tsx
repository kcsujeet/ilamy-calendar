import { Button } from '@ilamy/ui/components/button'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@ilamy/ui/components/popover'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { useDateTimeFormatters } from '@/hooks/use-date-time-formatters'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'
import { getDayKey, getWeekDays, isToday } from '@/lib/utils/date-utils'
import { keys } from '@/lib/utils/keys'

const TitleContent = () => {
	const { currentDate, view, selectDate, t, firstDayOfWeek } =
		useSmartCalendarContext((ctx) => ({
			currentDate: ctx.currentDate,
			view: ctx.view,
			selectDate: ctx.selectDate,
			t: ctx.t,
			firstDayOfWeek: ctx.firstDayOfWeek,
		}))

	const { formatDateRange } = useDateTimeFormatters()

	const [openPopover, setOpenPopover] = useState<string | null>(null)

	const months = Array.from({ length: 12 }, (_, index) =>
		currentDate.month(index).format('MMMM')
	)

	const currentYear = currentDate.year()
	const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)
	const weekDays = getWeekDays(currentDate, firstDayOfWeek)

	const handleSelectDate = (date: Dayjs) => {
		selectDate(date)
		setOpenPopover(null)
	}

	const renderMonthContent = () => (
		<>
			{months.map((month, index) => (
				<Button
					className={cn(
						'justify-start font-normal',
						currentDate.month() === index && 'bg-primary/10'
					)}
					key={index}
					onClick={() => handleSelectDate(currentDate.month(index))}
					variant="ghost"
				>
					{month}
				</Button>
			))}
		</>
	)

	const renderYearContent = () => (
		<>
			{years.map((year) => (
				<Button
					className={cn(
						'justify-start font-normal',
						currentDate.year() === year && 'bg-primary/10'
					)}
					key={year}
					onClick={() => handleSelectDate(currentDate.year(year))}
					variant="ghost"
				>
					{year}
				</Button>
			))}
		</>
	)

	const renderWeekContent = () => (
		<>
			{Array.from({ length: 7 }, (_, i) => {
				const weekDate = currentDate.subtract(3, 'week').add(i, 'week')
				const days = getWeekDays(weekDate, firstDayOfWeek)
				const start = days[0]
				const end = days[6]
				const isCurrentWeek = weekDate.isSame(currentDate, 'week')

				return (
					<Button
						className={cn(
							'justify-start font-normal',
							isCurrentWeek && 'bg-primary/10'
						)}
						key={getDayKey(start)}
						onClick={() => handleSelectDate(start)}
						variant="ghost"
					>
						<div className="flex w-full items-center justify-between">
							<span>{formatDateRange(start, end)}</span>
						</div>
					</Button>
				)
			})}
		</>
	)

	const renderDayContent = () => {
		const firstDay = currentDate.startOf('month')
		const daysInMonth = currentDate.daysInMonth()

		return (
			<>
				{Array.from({ length: daysInMonth }, (_, i) => {
					const day = firstDay.date(i + 1)
					const isCurrentDay = day.isSame(currentDate, 'day')
					const today = isToday(day)

					return (
						<Button
							className={cn(
								'justify-start font-normal',
								isCurrentDay && 'bg-primary/10'
							)}
							key={getDayKey(day)}
							onClick={() => handleSelectDate(day)}
							variant="ghost"
						>
							<div className="flex w-full items-center justify-between">
								<span>{day.format('ll')}</span>
								{today && (
									<span className="bg-primary text-primary-foreground rounded-sm px-1! text-xs">
										{t('today')}
									</span>
								)}
							</div>
						</Button>
					)
				})}
			</>
		)
	}

	const popovers = [
		{
			id: 'month',
			hidden: view === 'year',
			title: currentDate.format('MMMM'),
			render: renderMonthContent,
		},
		{
			id: 'year',
			hidden: false,
			title: currentDate.format('YYYY'),
			render: renderYearContent,
		},
		{
			id: 'week',
			hidden: view !== 'week',
			title: formatDateRange(weekDays[0], weekDays[6]),
			render: renderWeekContent,
		},
		{
			id: 'day',
			hidden: view !== 'day',
			title: currentDate.format('dddd, D'),
			render: renderDayContent,
		},
	]

	return popovers
		.filter((p) => !p.hidden)
		.map((popover) => (
			<Popover
				key={popover.id}
				onOpenChange={(open) => setOpenPopover(open ? popover.id : null)}
				open={openPopover === popover.id}
			>
				<PopoverTrigger asChild>
					<Button
						className="flex items-center gap-1 px-1! font-semibold"
						data-testid="calendar-month-button"
						variant="ghost"
					>
						<AnimatedSection
							className="flex items-center gap-1 px-1! font-semibold"
							data-testid="calendar-month-button"
							transitionKey={keys.listKey(popover.id, getDayKey(currentDate))}
						>
							{popover.title}
						</AnimatedSection>
						<ChevronDown className="h-4 w-4" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-40 p-0">
					<div className="flex max-h-60 flex-col overflow-auto">
						{popover.render()}
					</div>
				</PopoverContent>
			</Popover>
		))
}

export default TitleContent
