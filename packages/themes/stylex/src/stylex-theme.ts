import type {
	CalendarComponents,
	CalendarSlotName,
	CalendarSlotProps,
	CalendarThemeAdapter,
	SlotStyleProps,
	StyleRecord,
} from '@ilamy/calendar'
import { stylexCalendarComponents } from './stylex-components'

/**
 * Shape returned by `stylex.props(...)` from `@stylexjs/stylex`.
 * Kept structurally typed so consumers never need a runtime StyleX compiler
 * inside pre-built library code.
 */
export interface StylexPropsResult {
	readonly className?: string
	readonly style?: Readonly<Record<string, string | number | undefined>>
}

/** Design tokens applied as `--ilamy-*` CSS custom properties on the root slot. */
export interface CalendarStylexTokens {
	background: string
	surface: string
	surfaceMuted: string
	border: string
	text: string
	textMuted: string
	primary: string
	primaryForeground: string
	todayBackground: string
	danger: string
	radius: string
	fontFamily: string
}

export const STYLEX_LIGHT_TOKENS: CalendarStylexTokens = {
	background: '#ffffff',
	surface: '#f8fafc',
	surfaceMuted: '#f1f5f9',
	border: '#e2e8f0',
	text: '#0f172a',
	textMuted: '#64748b',
	primary: '#2563eb',
	primaryForeground: '#ffffff',
	todayBackground: '#eff6ff',
	danger: '#ef4444',
	radius: '8px',
	fontFamily: 'system-ui, -apple-system, sans-serif',
}

export const STYLEX_DARK_TOKENS: CalendarStylexTokens = {
	background: '#0f172a',
	surface: '#1e293b',
	surfaceMuted: '#1e293b',
	border: '#334155',
	text: '#f8fafc',
	textMuted: '#94a3b8',
	primary: '#3b82f6',
	primaryForeground: '#ffffff',
	todayBackground: '#1e3a5f',
	danger: '#f87171',
	radius: '8px',
	fontFamily: 'system-ui, -apple-system, sans-serif',
}

/**
 * Merges one or more `stylex.props(...)` results into a single `SlotStyleProps`
 * entry (`{ className, style }`).
 */
export const stylexSlot = (
	...results: Array<StylexPropsResult | undefined | null | false>
): SlotStyleProps => {
	const classNames: string[] = []
	const style: StyleRecord = {}
	let hasStyle = false

	for (const result of results) {
		if (!result) continue
		if (result.className) {
			classNames.push(result.className)
		}
		if (result.style) {
			Object.assign(style, result.style)
			hasStyle = true
		}
	}

	return {
		className: classNames.length > 0 ? classNames.join(' ') : undefined,
		style: hasStyle ? style : undefined,
	}
}

/**
 * Converts a map of slot names → `stylex.props(...)` outputs into
 * `CalendarSlotProps`.
 */
export const createStylexSlotProps = (
	slots: Partial<Record<CalendarSlotName, StylexPropsResult>>
): CalendarSlotProps => {
	const result: CalendarSlotProps = {}
	for (const key of Object.keys(slots) as CalendarSlotName[]) {
		const entry = slots[key]
		if (entry) {
			result[key] = stylexSlot(entry)
		}
	}
	return result
}

const buildTokenVars = (tokens: CalendarStylexTokens): StyleRecord => ({
	'--ilamy-bg': tokens.background,
	'--ilamy-surface': tokens.surface,
	'--ilamy-surface-muted': tokens.surfaceMuted,
	'--ilamy-border': tokens.border,
	'--ilamy-text': tokens.text,
	'--ilamy-text-muted': tokens.textMuted,
	'--ilamy-primary': tokens.primary,
	'--ilamy-primary-fg': tokens.primaryForeground,
	'--ilamy-today-bg': tokens.todayBackground,
	'--ilamy-danger': tokens.danger,
	'--ilamy-radius': tokens.radius,
	'--ilamy-font': tokens.fontFamily,
	'--background': tokens.background,
	'--foreground': tokens.text,
	'--card': tokens.surface,
	'--card-foreground': tokens.text,
	'--popover': tokens.background,
	'--popover-foreground': tokens.text,
	'--primary': tokens.primary,
	'--primary-foreground': tokens.primaryForeground,
	'--secondary': tokens.surfaceMuted,
	'--secondary-foreground': tokens.text,
	'--muted': tokens.surfaceMuted,
	'--muted-foreground': tokens.textMuted,
	'--accent': tokens.surfaceMuted,
	'--accent-foreground': tokens.text,
	'--destructive': tokens.danger,
	'--border': tokens.border,
	'--input': tokens.border,
	'--ring': tokens.primary,
})

const STYLEX_CELL_BASE_STYLE: StyleRecord = {
	padding: '4px',
}

const buildDefaultStylexSlots = (
	tokens: CalendarStylexTokens,
	mode: 'light' | 'dark'
): CalendarSlotProps => ({
	root: {
		style: {
			...buildTokenVars(tokens),
			colorScheme: mode,
			backgroundColor: 'var(--ilamy-bg)',
			color: 'var(--ilamy-text)',
			fontFamily: 'var(--ilamy-font)',
		},
	},
	header: {
		style: {
			backgroundColor: 'var(--ilamy-bg)',
		},
	},
	toolbar: {
		style: {
			gap: '8px',
		},
	},
	navButton: {
		style: {
			backgroundColor: 'var(--ilamy-bg)',
			color: 'var(--ilamy-text)',
			border: '1px solid var(--ilamy-border)',
			borderRadius: '6px',
			height: '36px',
			padding: '0 12px',
			fontSize: '0.875rem',
			fontWeight: 500,
		},
	},
	grid: {
		style: {
			backgroundColor: 'var(--ilamy-bg)',
			border: '1px solid var(--ilamy-border)',
		},
	},
	dayHeader: {
		style: {
			backgroundColor: 'var(--ilamy-surface)',
			color: 'var(--ilamy-text-muted)',
			padding: '8px 0',
			fontWeight: 500,
			fontSize: '0.875rem',
			textAlign: 'center',
		},
	},
	resourceHeader: {
		style: {
			backgroundColor: 'var(--ilamy-surface)',
			color: 'var(--ilamy-text)',
			padding: '8px 10px',
			fontWeight: 600,
			fontSize: '0.875rem',
		},
	},
	cell: {
		style: {
			...STYLEX_CELL_BASE_STYLE,
			backgroundColor: 'var(--ilamy-bg)',
		},
	},
	cellToday: {
		style: {
			...STYLEX_CELL_BASE_STYLE,
			backgroundColor: 'var(--ilamy-bg)',
		},
	},
	cellNonBusiness: {
		style: {
			...STYLEX_CELL_BASE_STYLE,
			backgroundColor: 'var(--ilamy-surface-muted)',
			color: 'var(--ilamy-text-muted)',
		},
	},
	cellDisabled: {
		style: {
			...STYLEX_CELL_BASE_STYLE,
			backgroundColor: 'var(--ilamy-surface-muted)',
			color: 'var(--ilamy-text-muted)',
			opacity: 0.55,
		},
	},
	eventBar: {
		style: {
			backgroundColor: 'var(--ilamy-primary)',
			color: 'var(--ilamy-primary-fg)',
			borderRadius: '6px',
			fontSize: '0.75rem',
		},
	},
	allDayRow: {
		style: {
			backgroundColor: 'var(--ilamy-surface)',
			borderBottom: '1px solid var(--ilamy-border)',
		},
	},
	nowIndicator: {
		style: {
			color: 'var(--ilamy-danger)',
		},
	},
	moreLink: {
		style: {
			color: 'var(--ilamy-primary)',
			fontSize: '0.75rem',
			fontWeight: 500,
		},
	},
	viewButton: {
		style: {
			backgroundColor: 'transparent',
			color: 'var(--ilamy-text-muted)',
			borderRadius: '6px',
			padding: '0 12px',
			fontSize: '0.875rem',
			fontWeight: 500,
		},
	},
	viewButtonActive: {
		style: {
			backgroundColor: 'var(--ilamy-primary)',
			color: 'var(--ilamy-primary-fg)',
			borderRadius: '6px',
			padding: '0 12px',
			fontSize: '0.875rem',
			fontWeight: 600,
		},
	},
})

export interface StylexCalendarThemeOptions {
	/** Built-in palette preset. Defaults to `'light'`. */
	mode?: 'light' | 'dark'
	/** Token overrides merged into the preset `--ilamy-*` CSS variables. */
	tokens?: Partial<CalendarStylexTokens>
	/**
	 * Per-slot `stylex.props(...)` outputs merged over the base token styles.
	 * Pass compiled StyleX styles directly: `{ eventBar: stylex.props(styles.event) }`.
	 */
	slots?: Partial<Record<CalendarSlotName, StylexPropsResult>>
	/** Optional swappable UI primitives (Button, Dialog, Input, Select, Popover). */
	components?: CalendarComponents
}

/**
 * Builds a StyleX-compatible `CalendarThemeAdapter` (`unstyled: true`,
 * CSS custom property tokens, and deterministic `stylex.props(...)` slot merging).
 *
 * @example
 * const theme = createStylexCalendarTheme({
 *   mode: 'dark',
 *   slots: { eventBar: stylex.props(styles.eventBar) },
 * })
 * <IlamyCalendar {...theme} events={events} />
 */
export const createStylexCalendarTheme = (
	options: StylexCalendarThemeOptions = {}
): CalendarThemeAdapter => {
	const mode = options.mode === 'dark' ? 'dark' : 'light'
	const baseTokens = mode === 'dark' ? STYLEX_DARK_TOKENS : STYLEX_LIGHT_TOKENS
	const resolvedTokens: CalendarStylexTokens = {
		...baseTokens,
		...options.tokens,
	}
	const baseSlots = buildDefaultStylexSlots(resolvedTokens, mode)
	const mergedSlots: CalendarSlotProps = { ...baseSlots }

	if (options.slots) {
		for (const key of Object.keys(options.slots) as CalendarSlotName[]) {
			const override = options.slots[key]
			if (!override) continue
			mergedSlots[key] = stylexSlot(baseSlots[key], override)
		}
	}

	return {
		unstyled: true,
		slotProps: mergedSlots,
		components: {
			...stylexCalendarComponents,
			...options.components,
		},
	}
}

/** Ready-to-use light StyleX calendar theme adapter. */
export const stylexCalendarTheme: CalendarThemeAdapter =
	createStylexCalendarTheme({ mode: 'light' })

/** Ready-to-use dark StyleX calendar theme adapter. */
export const stylexCalendarDarkTheme: CalendarThemeAdapter =
	createStylexCalendarTheme({ mode: 'dark' })
