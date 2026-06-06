import type React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps {
	variant?: 'default' | 'secondary' | 'destructive' | 'outline'
	size?: 'sm' | 'default' | 'lg'
	className?: string
	children: React.ReactNode
}

export const Badge: React.FC<BadgeProps> = ({
	variant = 'default',
	size = 'default',
	className,
	children,
}) => {
	const variants = {
		default: 'bg-primary text-primary-foreground',
		secondary: 'bg-secondary text-secondary-foreground',
		destructive: 'bg-destructive text-destructive-foreground',
		outline: 'border border-input bg-background',
	}

	const sizes = {
		sm: 'px-2 py-0.5 text-xs',
		default: 'px-2.5 py-1 text-sm',
		lg: 'px-3 py-1.5 text-base',
	}

	return (
		<span
			className={cn(
				'inline-flex items-center rounded-full font-medium',
				variants[variant],
				sizes[size],
				className
			)}
		>
			{children}
		</span>
	)
}
