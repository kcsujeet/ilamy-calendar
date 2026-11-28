import type { CssMode } from '../../../types/settings-form.types'

export interface HeaderSlotStyleTokens {
	header: string
	arrowGroup: string
	arrowBtn: string
	todayBtn: string
	titleBtn: string
	switcherGroup: string
	viewBtn: string
	viewBtnActive: string
	newBtn: string
}

export function resolvePrimitiveHeaderStyles(
	cssMode: CssMode,
	variant: 'radix' | 'base-ui'
): HeaderSlotStyleTokens {
	const isPill = variant === 'base-ui'
	const controlRadius = isPill ? 'rounded-full' : 'rounded-md'
	const groupRadius = isPill ? 'rounded-full' : 'rounded-lg'

	if (cssMode === 'unstyled') {
		return {
			header:
				'w-full flex flex-wrap items-center justify-between gap-2 min-h-9',
			arrowGroup:
				'inline-flex items-center h-9 border border-current/25 rounded overflow-hidden',
			arrowBtn: 'h-9 px-2.5 text-sm cursor-pointer hover:bg-current/10',
			todayBtn:
				'h-9 px-3 text-sm font-medium border border-current/25 rounded cursor-pointer hover:bg-current/10',
			titleBtn:
				'h-9 px-3 inline-flex items-center gap-1.5 text-sm font-semibold border border-current/25 rounded cursor-pointer hover:bg-current/10',
			switcherGroup:
				'inline-flex items-center h-9 p-0.5 border border-current/25 rounded',
			viewBtn: 'h-8 px-2.5 text-sm cursor-pointer rounded',
			viewBtnActive:
				'h-8 px-2.5 text-sm font-semibold underline cursor-pointer',
			newBtn:
				'h-9 px-3 text-sm font-medium border border-current/25 rounded cursor-pointer hover:bg-current/10',
		}
	}

	if (cssMode === 'tailwind') {
		return {
			header:
				'w-full flex flex-wrap items-center justify-between gap-2 min-h-9 bg-background text-foreground',
			arrowGroup: `inline-flex items-center h-9 border border-border bg-background overflow-hidden ${groupRadius}`,
			arrowBtn:
				'h-9 px-2.5 text-sm font-medium text-foreground hover:bg-muted cursor-pointer transition-colors',
			todayBtn: `h-9 px-3 text-sm font-medium border border-border bg-background text-foreground hover:bg-muted cursor-pointer transition-colors ${controlRadius}`,
			titleBtn: `h-9 px-3 inline-flex items-center gap-1.5 text-sm font-semibold border border-border bg-background text-foreground hover:bg-muted cursor-pointer transition-colors ${controlRadius}`,
			switcherGroup: `inline-flex items-center h-9 p-0.5 bg-muted border border-border/70 ${groupRadius}`,
			viewBtn: `h-8 px-2.5 text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors ${controlRadius}`,
			viewBtnActive: `h-8 px-2.5 text-sm font-medium bg-background text-foreground shadow-xs cursor-pointer ${controlRadius}`,
			newBtn: `h-9 px-3 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer transition-colors ${controlRadius}`,
		}
	}

	// Plain CSS & StyleX honor --ilamy-* CSS variables set on the calendar root.
	return {
		header:
			'w-full flex flex-wrap items-center justify-between gap-2 min-h-9 text-[var(--ilamy-fg)]',
		arrowGroup: `inline-flex items-center h-9 border border-[var(--ilamy-border)] bg-[var(--ilamy-bg)] overflow-hidden ${groupRadius}`,
		arrowBtn:
			'h-9 px-2.5 text-sm font-medium text-[var(--ilamy-fg)] hover:bg-[var(--ilamy-muted)] cursor-pointer transition-colors',
		todayBtn: `h-9 px-3 text-sm font-medium border border-[var(--ilamy-border)] bg-[var(--ilamy-bg)] text-[var(--ilamy-fg)] hover:bg-[var(--ilamy-muted)] cursor-pointer transition-colors ${controlRadius}`,
		titleBtn: `h-9 px-3 inline-flex items-center gap-1.5 text-sm font-semibold border border-[var(--ilamy-border)] bg-[var(--ilamy-bg)] text-[var(--ilamy-fg)] hover:bg-[var(--ilamy-muted)] cursor-pointer transition-colors ${controlRadius}`,
		switcherGroup: `inline-flex items-center h-9 p-0.5 bg-[var(--ilamy-muted)] border border-[var(--ilamy-border)] ${groupRadius}`,
		viewBtn: `h-8 px-2.5 text-sm font-medium text-[var(--ilamy-muted-fg)] hover:text-[var(--ilamy-fg)] cursor-pointer transition-colors ${controlRadius}`,
		viewBtnActive: `h-8 px-2.5 text-sm font-medium bg-[var(--ilamy-bg)] text-[var(--ilamy-fg)] shadow-xs cursor-pointer ${controlRadius}`,
		newBtn: `h-9 px-3 text-sm font-medium bg-[var(--ilamy-primary)] text-[var(--ilamy-primary-fg)] hover:opacity-90 cursor-pointer transition-opacity ${controlRadius}`,
	}
}
