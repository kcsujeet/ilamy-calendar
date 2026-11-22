import { isToday } from '@ilamy/core'
import { DayLabel } from '@ilamy/ui/components/day-label'
import { cn } from '@ilamy/ui/lib/utils'
import { formatDate, type ZonedDate } from '@ilamy/utils/temporal'
import type React from 'react'
import { AnimatedDayLabel } from '@/components/animations/animated-day-label'
import { AnimatedSection } from '@/components/animations/animated-section'
import { useDateTimeFormatters } from '@/hooks/use-date-time-formatters'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { useCalendarTheme } from '@/stores/calendar-theme-context'

interface DayHeaderLabelProps {
	day: ZonedDate
	className?: string
	animated: boolean
}

const FormattedDayHeader: React.FC<DayHeaderLabelProps> = ({
	day,
	className,
	animated,
}) => {
	const { formatDayHeader } = useDateTimeFormatters()
	const { isBareUnstyled } = useCalendarTheme()
	const isTodayHeader = isToday(day)
	const text = formatDayHeader(day)
	const todayClassName =
		!isBareUnstyled &&
		isTodayHeader &&
		'rounded-full bg-primary px-2 py-0.5 text-primary-foreground'
	const textElement = (
		<span
			className={cn(
				'inline-block max-w-full truncate align-middle text-center',
				!isBareUnstyled && 'text-xs font-medium text-muted-foreground',
				todayClassName
			)}
			title={text}
		>
			{text}
		</span>
	)

	let content = textElement
	if (animated) {
		content = (
			<AnimatedSection
				className="block w-auto max-w-full min-w-0"
				transitionKey={text}
			>
				{textElement}
			</AnimatedSection>
		)
	}

	return (
		<div
			className={cn('flex max-w-full min-w-0 justify-center', className)}
			data-today={isTodayHeader ? 'true' : undefined}
		>
			{content}
		</div>
	)
}

export const DayHeaderLabel: React.FC<DayHeaderLabelProps> = (props) => {
	const { day, className, animated } = props
	const { hasDayHeaderFormat, currentLocale } = useSmartCalendarContext(
		(ctx) => ({
			hasDayHeaderFormat: Boolean(ctx.dayHeaderFormat),
			currentLocale: ctx.currentLocale,
		})
	)
	const { isBareUnstyled } = useCalendarTheme()

	if (hasDayHeaderFormat) {
		return <FormattedDayHeader {...props} />
	}

	const dayNumber = String(day.day)
	const weekday = formatDate(day, { weekday: 'short' }, currentLocale)
	const today = isToday(day)

	if (animated && !isBareUnstyled) {
		return (
			<AnimatedDayLabel
				className={className}
				dayNumber={dayNumber}
				today={today}
				weekday={weekday}
			/>
		)
	}

	return (
		<DayLabel
			className={className}
			dayNumber={dayNumber}
			today={today}
			unstyled={isBareUnstyled}
			weekday={weekday}
		/>
	)
}
