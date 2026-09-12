import { DayLabel } from '@ilamy/ui/components/day-label'
import type React from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'

interface AnimatedDayLabelProps {
	/** True when this day is today. Forwarded to `DayLabel`. */
	today: boolean
	/** Day-of-month, e.g. "13". This is the part that animates. */
	dayNumber: string
	/** Weekday label, e.g. "Mon". Omit to render the number alone. */
	weekday?: string
	/** Extra classes for `DayLabel`'s wrapper (e.g. `flex-col-reverse`). */
	className?: string
}

/**
 * A `DayLabel` whose number animates when it changes and whose weekday does
 * not. Navigating a calendar moves the number while the weekday stays put —
 * Monday's column is still headed "Mon" — so replaying the whole label reads as
 * a blink rather than as the number having moved. Keying the animation to the
 * number means it plays when, and only when, there is a change to show.
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
		weekday={weekday}
	/>
)
