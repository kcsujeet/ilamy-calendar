import type * as React from 'react'
import { useEffect } from 'react'
import { cn } from './cn'

type DivProps = React.HTMLAttributes<HTMLDivElement>

interface DialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	children: React.ReactNode
}

/**
 * Minimal accessible modal. Fixed overlay + centered panel. Closes on Escape
 * and on overlay click. No Radix / external dependency — Tailwind + React only.
 */
export const Dialog: React.FC<DialogProps> = ({
	open,
	onOpenChange,
	children,
}) => {
	useEffect(() => {
		if (!open) {
			return
		}
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onOpenChange(false)
			}
		}
		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [open, onOpenChange])

	if (!open) {
		return null
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			onClick={() => onOpenChange(false)}
			onKeyDown={(event) => {
				if (event.key === 'Escape') {
					onOpenChange(false)
				}
			}}
			role="presentation"
		>
			{children}
		</div>
	)
}

interface DialogContentProps extends DivProps {
	onClose?: () => void
}

export const DialogContent: React.FC<DialogContentProps> = ({
	className,
	children,
	onClose,
	...props
}) => {
	return (
		<div
			aria-modal="true"
			className={cn(
				'relative w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg',
				className
			)}
			onClick={(event) => event.stopPropagation()}
			onKeyDown={(event) => event.stopPropagation()}
			role="dialog"
			{...props}
		>
			<button
				aria-label="Close"
				className="absolute top-4 right-4 rounded-sm opacity-70 outline-none transition-opacity hover:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/50"
				onClick={onClose}
				type="button"
			>
				<span aria-hidden="true">×</span>
			</button>
			{children}
		</div>
	)
}

export const DialogHeader: React.FC<DivProps> = ({ className, ...props }) => {
	return (
		<div
			className={cn('flex flex-col gap-1.5 text-left', className)}
			{...props}
		/>
	)
}

export const DialogTitle: React.FC<DivProps> = ({ className, ...props }) => {
	return (
		<h2
			className={cn('text-lg font-semibold leading-none', className)}
			{...props}
		/>
	)
}

export const DialogDescription: React.FC<DivProps> = ({
	className,
	...props
}) => {
	return (
		<p className={cn('text-sm text-muted-foreground', className)} {...props} />
	)
}

export const DialogFooter: React.FC<DivProps> = ({ className, ...props }) => {
	return (
		<div
			className={cn(
				'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
				className
			)}
			{...props}
		/>
	)
}
