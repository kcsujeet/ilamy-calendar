import type { CalendarSlotProps } from '@ilamy/calendar'
import type { CalendarThemeAdapter } from '@ilamy/calendar/react'
import type { ThemeAccent, ThemePreset } from '../types/settings-form.types'

interface StylexTokenSet {
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

const STYLEX_LIGHT_TOKENS: StylexTokenSet = {
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

const STYLEX_DARK_TOKENS: StylexTokenSet = {
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

const buildStylexTokenVars = (
	tokens: StylexTokenSet,
	mode: 'light' | 'dark'
): CalendarSlotProps => ({
	root: {
		style: {
			'--ilamy-bg': tokens.background,
			'--ilamy-fg': tokens.text,
			'--ilamy-surface': tokens.surface,
			'--ilamy-muted': tokens.surfaceMuted,
			'--ilamy-muted-fg': tokens.textMuted,
			'--ilamy-border': tokens.border,
			'--ilamy-primary': tokens.primary,
			'--ilamy-primary-fg': tokens.primaryForeground,
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
			colorScheme: mode,
		},
	},
})

export interface AccentPalette {
	label: string
	primary: string
	primaryDark: string
	todayLight: string
	todayDark: string
	swatch: string
}

export const THEME_ACCENTS: Record<ThemeAccent, AccentPalette> = {
	indigo: {
		label: 'Indigo',
		primary: '#4f46e5',
		primaryDark: '#818cf8',
		todayLight: '#eef2ff',
		todayDark: '#1e1b4b',
		swatch: '#4f46e5',
	},
	emerald: {
		label: 'Emerald',
		primary: '#059669',
		primaryDark: '#34d399',
		todayLight: '#ecfdf5',
		todayDark: '#064e3b',
		swatch: '#059669',
	},
	rose: {
		label: 'Rose',
		primary: '#e11d48',
		primaryDark: '#fb7185',
		todayLight: '#fff1f2',
		todayDark: '#4c0519',
		swatch: '#e11d48',
	},
	amber: {
		label: 'Amber',
		primary: '#d97706',
		primaryDark: '#fbbf24',
		todayLight: '#fffbeb',
		todayDark: '#451a03',
		swatch: '#d97706',
	},
}

const CUSTOM_SLOT_PROPS_LIGHT: CalendarSlotProps = {
	root: {
		style: {
			'--background': '#fafaf9',
			'--foreground': '#1c1917',
			'--card': '#ffffff',
			'--card-foreground': '#1c1917',
			'--popover': '#ffffff',
			'--popover-foreground': '#1c1917',
			'--primary': '#292524',
			'--primary-foreground': '#fafaf9',
			'--muted': '#e7e5e4',
			'--muted-foreground': '#57534e',
			'--accent': '#e7e5e4',
			'--accent-foreground': '#1c1917',
			'--border': '#d6d3d1',
			'--input': '#a8a29e',
			backgroundColor: '#fafaf9',
			color: '#1c1917',
			border: '2px solid #292524',
			borderRadius: '14px',
			fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
		},
	},
	header: {
		style: {
			backgroundColor: '#f5f5f4',
			borderBottom: '2px solid #292524',
			padding: '10px 14px',
		},
	},
	navButton: {
		style: {
			backgroundColor: '#ffffff',
			color: '#1c1917',
			border: '1px solid #292524',
			borderRadius: '6px',
			padding: '6px 12px',
			fontSize: '0.875rem',
			fontWeight: 600,
		},
	},
	viewButton: {
		style: {
			color: '#57534e',
			borderRadius: '6px',
			padding: '4px 12px',
			fontSize: '0.875rem',
			fontWeight: 600,
		},
	},
	viewButtonActive: {
		style: {
			backgroundColor: '#292524',
			color: '#fafaf9',
			borderRadius: '6px',
			padding: '4px 12px',
			fontSize: '0.875rem',
			fontWeight: 700,
		},
	},
	dayHeader: {
		style: {
			backgroundColor: '#e7e5e4',
			color: '#44403c',
			borderRight: '1px solid #d6d3d1',
			borderBottom: '1px solid #292524',
			padding: '8px 6px',
			fontSize: '0.875rem',
			fontWeight: 700,
			textAlign: 'center',
		},
	},
	resourceHeader: {
		style: {
			backgroundColor: '#e7e5e4',
			color: '#1c1917',
			borderRight: '1px solid #d6d3d1',
			borderBottom: '1px solid #d6d3d1',
			padding: '8px 10px',
			fontSize: '0.75rem',
			fontWeight: 700,
		},
	},
	cell: {
		style: {
			backgroundColor: '#ffffff',
			borderRight: '1px solid #d6d3d1',
			borderBottom: '1px solid #d6d3d1',
			padding: '6px',
		},
	},
	cellToday: {
		style: {
			backgroundColor: '#fef3c7',
			borderRight: '1px solid #d6d3d1',
			borderBottom: '1px solid #d6d3d1',
			padding: '6px',
		},
	},
	cellNonBusiness: {
		style: {
			backgroundColor: '#f5f5f4',
			color: '#78716c',
			borderRight: '1px solid #d6d3d1',
			borderBottom: '1px solid #d6d3d1',
			padding: '6px',
		},
	},
	eventBar: {
		style: {
			borderRadius: '6px',
			border: '1px solid #292524',
			fontSize: '0.75rem',
			fontWeight: 600,
		},
	},
}

const CUSTOM_SLOT_PROPS_DARK: CalendarSlotProps = {
	root: {
		style: {
			'--background': '#1c1917',
			'--foreground': '#fafaf9',
			'--card': '#292524',
			'--card-foreground': '#fafaf9',
			'--popover': '#1c1917',
			'--popover-foreground': '#fafaf9',
			'--primary': '#f59e0b',
			'--primary-foreground': '#1c1917',
			'--muted': '#292524',
			'--muted-foreground': '#a8a29e',
			'--accent': '#44403c',
			'--accent-foreground': '#fafaf9',
			'--border': '#44403c',
			'--input': '#57534e',
			colorScheme: 'dark',
			backgroundColor: '#1c1917',
			color: '#fafaf9',
			border: '2px solid #57534e',
			borderRadius: '14px',
			fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
		},
	},
	header: {
		style: {
			backgroundColor: '#292524',
			borderBottom: '2px solid #57534e',
			padding: '10px 14px',
		},
	},
	navButton: {
		style: {
			backgroundColor: '#1c1917',
			color: '#fafaf9',
			border: '1px solid #57534e',
			borderRadius: '6px',
			padding: '6px 12px',
			fontSize: '0.875rem',
			fontWeight: 600,
		},
	},
	viewButton: {
		style: {
			color: '#a8a29e',
			borderRadius: '6px',
			padding: '4px 12px',
			fontSize: '0.875rem',
			fontWeight: 600,
		},
	},
	viewButtonActive: {
		style: {
			backgroundColor: '#f59e0b',
			color: '#1c1917',
			borderRadius: '6px',
			padding: '4px 12px',
			fontSize: '0.875rem',
			fontWeight: 700,
		},
	},
	dayHeader: {
		style: {
			backgroundColor: '#292524',
			color: '#d6d3d1',
			borderRight: '1px solid #44403c',
			borderBottom: '1px solid #57534e',
			padding: '8px 6px',
			fontSize: '0.875rem',
			fontWeight: 700,
			textAlign: 'center',
		},
	},
	resourceHeader: {
		style: {
			backgroundColor: '#292524',
			color: '#fafaf9',
			borderRight: '1px solid #44403c',
			borderBottom: '1px solid #44403c',
			padding: '8px 10px',
			fontSize: '0.75rem',
			fontWeight: 700,
		},
	},
	cell: {
		style: {
			backgroundColor: '#1c1917',
			borderRight: '1px solid #44403c',
			borderBottom: '1px solid #44403c',
			padding: '6px',
		},
	},
	cellToday: {
		style: {
			backgroundColor: '#451a03',
			borderRight: '1px solid #44403c',
			borderBottom: '1px solid #44403c',
			padding: '6px',
		},
	},
	cellNonBusiness: {
		style: {
			backgroundColor: '#292524',
			color: '#a8a29e',
			borderRight: '1px solid #44403c',
			borderBottom: '1px solid #44403c',
			padding: '6px',
		},
	},
	eventBar: {
		style: {
			borderRadius: '6px',
			border: '1px solid #a8a29e',
			fontSize: '0.75rem',
			fontWeight: 600,
		},
	},
}

export interface ResolvedDemoTheme {
	adapter: CalendarThemeAdapter | undefined
	label: string
}

export function resolveDemoTheme(options: {
	preset: ThemePreset
	mode: 'light' | 'dark'
	accent: ThemeAccent
	useCustomSlotProps: boolean
}): ResolvedDemoTheme {
	const { preset, mode, accent, useCustomSlotProps } = options
	const palette = THEME_ACCENTS[accent]

	if (preset === 'mui') {
		return {
			adapter: undefined,
			label: `Material UI (${mode})`,
		}
	}

	if (preset === 'stylex') {
		const baseTokens =
			mode === 'dark' ? STYLEX_DARK_TOKENS : STYLEX_LIGHT_TOKENS
		const slotProps = buildStylexTokenVars(
			{
				...baseTokens,
				primary: mode === 'dark' ? palette.primaryDark : palette.primary,
				todayBackground:
					mode === 'dark' ? palette.todayDark : palette.todayLight,
			},
			mode
		)
		return {
			adapter: {
				unstyled: false,
				slotProps,
			},
			label: `StyleX (${mode})`,
		}
	}

	if (preset === 'unstyled') {
		let modeSlotProps = CUSTOM_SLOT_PROPS_LIGHT
		if (mode === 'dark') {
			modeSlotProps = CUSTOM_SLOT_PROPS_DARK
		}
		const slotProps = useCustomSlotProps ? modeSlotProps : undefined
		return {
			adapter: {
				unstyled: true,
				slotProps,
			},
			label: useCustomSlotProps ? 'Unstyled + slotProps' : 'Bare Unstyled',
		}
	}

	return {
		adapter: undefined,
		label: 'Tailwind / Shadcn',
	}
}
