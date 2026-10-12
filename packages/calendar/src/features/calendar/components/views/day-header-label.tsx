import { DayLabel } from '@ilamy/ui/components/day-label'
import { cn } from '@ilamy/ui/lib/utils'
import type { Dayjs } from '@ilamy/utils/dayjs'
import type React from 'react'
import { AnimatedDayLabel } from '@/components/animations/animated-day-label'
import { AnimatedSection } from '@/components/animations/animated-section'
import { useDateTimeFormatters } from '@/features/calendar/hooks/use-date-time-formatters'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { isToday } from '@/utils/date-utils'

interface DayHeaderLabelProps {
	day: Dayjs
	/** Extra classes for the label's wrapper (e.g. `flex-col-reverse`). */
	className?: string
	/** Whether the label fades when its text changes. Gutter rows sit still. */
	animated: boolean
}

/**
 * A `dayHeaderFormat` header: the formatted text IS the header, with no day
 * number added. Today keeps its highlight, filled like the number badge.
 *
 * The text shrinks with its cell: every ancestor down to the text can be
 * narrower than its content (`min-w-0`, `max-w-full`), so a long format ends in
 * an ellipsis inside the cell instead of spilling out of it. The full text is
 * the `title`, readable on hover.
 */
const FormattedDayHeader: React.FC<DayHeaderLabelProps> = ({
	day,
	className,
	animated,
}) => {
	const { formatDayHeader } = useDateTimeFormatters()
	const isTodayHeader = isToday(day)
	const text = formatDayHeader(day)
	const todayClassName =
		isTodayHeader &&
		'rounded-full bg-primary px-2 py-0.5 text-primary-foreground'
	const textElement = (
		<span
			className={cn(
				'inline-block max-w-full truncate align-middle text-center text-xs font-medium text-muted-foreground',
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

/**
 * The label of a day header. Without `dayHeaderFormat`: the day number under a
 * short weekday. With it: the formatted text, whole.
 */
export const DayHeaderLabel: React.FC<DayHeaderLabelProps> = (props) => {
	const { day, className, animated } = props
	const hasDayHeaderFormat = useSmartCalendarContext((ctx) =>
		Boolean(ctx.dayHeaderFormat)
	)

	if (hasDayHeaderFormat) {
		return <FormattedDayHeader {...props} />
	}

	if (animated) {
		return (
			<AnimatedDayLabel
				className={className}
				dayNumber={day.format('D')}
				today={isToday(day)}
				weekday={day.format('ddd')}
			/>
		)
	}

	return (
		<DayLabel
			className={className}
			dayNumber={day.format('D')}
			today={isToday(day)}
			weekday={day.format('ddd')}
		/>
	)
}
