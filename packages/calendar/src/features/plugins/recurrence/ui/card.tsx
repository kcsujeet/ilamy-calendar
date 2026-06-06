import type * as React from 'react'
import { cn } from './cn'

type DivProps = React.HTMLAttributes<HTMLDivElement>

export const Card: React.FC<DivProps> = ({ className, ...props }) => {
	return (
		<div
			className={cn(
				'rounded-xl border bg-card text-card-foreground shadow-sm',
				className
			)}
			{...props}
		/>
	)
}

export const CardHeader: React.FC<DivProps> = ({ className, ...props }) => {
	return (
		<div className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />
	)
}

export const CardTitle: React.FC<DivProps> = ({ className, ...props }) => {
	return (
		<h3 className={cn('font-semibold leading-none', className)} {...props} />
	)
}

export const CardContent: React.FC<DivProps> = ({ className, ...props }) => {
	return <div className={cn('p-6', className)} {...props} />
}
