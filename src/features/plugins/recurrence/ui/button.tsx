import type * as React from 'react'
import { cn } from './cn'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: 'default' | 'outline'
}

export const Button: React.FC<ButtonProps> = ({
	className,
	variant = 'default',
	type = 'button',
	...props
}) => {
	const variantClass =
		variant === 'outline'
			? 'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground'
			: 'bg-primary text-primary-foreground hover:bg-primary/90'

	return (
		<button
			className={cn(
				'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
				variantClass,
				className
			)}
			type={type}
			{...props}
		/>
	)
}
