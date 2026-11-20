import type { CalendarSlotProps, CalendarThemeAdapter } from '@ilamy/calendar'
import {
	createStylexCalendarTheme,
	STYLEX_DARK_TOKENS,
	STYLEX_LIGHT_TOKENS,
} from '@ilamy/calendar/themes/stylex'
import { useEffect, useState } from 'react'
import type {
	ThemeAccent,
	ThemeColorMode,
	ThemePreset,
} from '../types/settings-form'

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

const readDocumentDarkMode = (): boolean => {
	if (typeof document === 'undefined') {
		return false
	}
	return document.documentElement.classList.contains('dark')
}

/** Tracks the host document's `.dark` class so `themeMode: 'auto'` stays synced. */
export function useResolvedColorMode(mode: ThemeColorMode): 'light' | 'dark' {
	const [isDocDark, setIsDocDark] = useState(readDocumentDarkMode)

	useEffect(() => {
		if (typeof document === 'undefined') {
			return
		}
		const sync = () => setIsDocDark(readDocumentDarkMode())
		sync()
		const observer = new MutationObserver(sync)
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class'],
		})
		return () => observer.disconnect()
	}, [])

	if (mode === 'auto') {
		return isDocDark ? 'dark' : 'light'
	}
	return mode
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
		return {
			adapter: createStylexCalendarTheme({
				mode,
				tokens: {
					...baseTokens,
					primary: mode === 'dark' ? palette.primaryDark : palette.primary,
					todayBackground:
						mode === 'dark' ? palette.todayDark : palette.todayLight,
				},
			}),
			label: `StyleX (${mode})`,
		}
	}

	if (preset === 'unstyled') {
		return {
			adapter: {
				unstyled: true,
				slotProps: useCustomSlotProps
					? mode === 'dark'
						? CUSTOM_SLOT_PROPS_DARK
						: CUSTOM_SLOT_PROPS_LIGHT
					: undefined,
			},
			label: useCustomSlotProps ? 'Unstyled + slotProps' : 'Bare Unstyled',
		}
	}

	return {
		adapter: undefined,
		label: 'Tailwind / Shadcn',
	}
}
