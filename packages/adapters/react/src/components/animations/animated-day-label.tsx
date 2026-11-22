import { DayLabel } from '@ilamy/ui/components/day-label'
import type React from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'

interface AnimatedDayLabelProps {
	/** True when this day is today. Forwarded to `DayLabel`. */
	today: boolean
	/** Day-of-month, e.g. "13". */
	dayNumber: string
	/** Weekday label, e.g. "Mon". Omit to render the number alone. */
	weekday?: string
	/** Extra classes for `DayLabel`'s wrapper (e.g. `flex-col-reverse`). */
	className?: string
}

/**
 * A `DayLabel` whose two halves animate independently, each keyed to the text
 * it renders, so the fade plays on whichever half actually changed.
 *
 * Which half that is depends on the header. A week column keeps its weekday and
 * moves its number: Monday's column still says "Mon" next week, with a new
 * date under it. A month column does the reverse, because the first column is
 * day 1 of every month while the weekday beneath it moves. Animating the label
 * as one unit re-introduced the half that had not moved, which reads as a blink
 * rather than as a change.
 */
export const AnimatedDayLabel: React.FC<AnimatedDayLabelProps> = ({
	today,
	dayNumber,
	weekday,
	className,
}) => (
	<DayLabel
		className={className}
		dayNumber={
			<AnimatedSection className="w-auto" transitionKey={dayNumber}>
				{dayNumber}
			</AnimatedSection>
		}
		today={today}
		weekday={
			weekday == null ? undefined : (
				<AnimatedSection transitionKey={weekday}>{weekday}</AnimatedSection>
			)
		}
	/>
)
