import {
	AnimatePresence,
	type HTMLMotionProps,
	motion,
	type Variants,
} from 'motion/react'
import type * as React from 'react'
import { cn } from '@/lib/utils'

interface AnimatedSectionProps
	extends Omit<HTMLMotionProps<'div'>, 'children' | 'layout' | 'layoutId'> {
	children: React.ReactNode
	transitionKey: string
	delay?: number
	className?: string
	direction?: 'vertical' | 'horizontal'
	layout?: boolean | 'position' | 'size' | 'preserve-aspect'
	layoutId?: string
	'data-testid'?: string
}

const variants: Variants = {
	hidden: ({ direction }: { direction: 'vertical' | 'horizontal' }) => ({
		opacity: 0,
		x: direction === 'horizontal' ? 10 : 0,
		y: direction === 'vertical' ? -10 : 0,
	}),
	visible: ({ delay }: { delay: number }) => ({
		opacity: 1,
		x: 0,
		y: 0,
		transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1], delay },
	}),
	exit: ({ direction }: { direction: 'vertical' | 'horizontal' }) => ({
		opacity: 0,
		x: direction === 'horizontal' ? -10 : 0,
		y: direction === 'vertical' ? -10 : 0,
		transition: { duration: 0.15 },
	}),
}

export const AnimatedSection: React.FC<AnimatedSectionProps> = ({
	children,
	transitionKey,
	delay = 0,
	className,
	direction = 'vertical',
	layout,
	layoutId,
	'data-testid': testId,
	ref,
	...props
}) => (
	<AnimatePresence mode="wait">
		<motion.div
			animate="visible"
			className={cn('inline-block w-full', className)}
			custom={{ delay, direction }}
			data-testid={testId}
			exit="exit"
			initial="hidden"
			key={transitionKey}
			layout={layout}
			layoutId={layoutId}
			ref={ref}
			variants={variants}
			{...props}
		>
			{children}
		</motion.div>
	</AnimatePresence>
)

AnimatedSection.displayName = 'AnimatedSection'
