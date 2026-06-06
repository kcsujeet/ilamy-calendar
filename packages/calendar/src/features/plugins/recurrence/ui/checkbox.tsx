import type * as React from 'react'
import { cn } from './cn'

type CheckboxProps = Omit<
	React.InputHTMLAttributes<HTMLInputElement>,
	'onChange' | 'type'
> & {
	onCheckedChange?: (checked: boolean) => void
}

export const Checkbox: React.FC<CheckboxProps> = ({
	className,
	onCheckedChange,
	...props
}) => {
	return (
		<input
			className={cn(
				'size-4 shrink-0 rounded-[4px] border border-input accent-primary outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
				className
			)}
			onChange={(event) => onCheckedChange?.(event.target.checked)}
			type="checkbox"
			{...props}
		/>
	)
}
