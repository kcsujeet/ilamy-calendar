import { cn } from '@ilamy/ui/lib/utils'
import type * as React from 'react'

interface AnimatedSectionProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode
	transitionKey: string
	delay?: number
	direction?: 'vertical' | 'horizontal'
	'data-testid'?: string
	ref?: React.Ref<HTMLDivElement>
}

// CSS-only enter animation via the tailwindcss-animate peer plugin (the same
// utilities the @ilamy/ui shadcn components use), replacing motion/react,
// which cost consumers ~123kB min (~28% of the bundle) for a 200ms fade.
// Changing `transitionKey` remounts the div, which replays the animation;
// `fill-mode-backwards` keeps the element hidden until its stagger `delay`
// (seconds) elapses.
export const AnimatedSection: React.FC<AnimatedSectionProps> = ({
	children,
	transitionKey,
	delay = 0,
	className,
	direction = 'vertical',
	'data-testid': testId,
	ref,
	style,
	...props
}) => {
	const slideInClass =
		direction === 'horizontal'
			? 'slide-in-from-right-2.5'
			: 'slide-in-from-top-2.5'

	return (
		<div
			className={cn(
				'inline-block w-full animate-in fade-in fill-mode-backwards duration-200 ease-in-out',
				slideInClass,
				className
			)}
			data-testid={testId}
			key={transitionKey}
			ref={ref}
			style={{ animationDelay: `${delay}s`, ...style }}
			{...props}
		>
			{children}
		</div>
	)
}

AnimatedSection.displayName = 'AnimatedSection'
