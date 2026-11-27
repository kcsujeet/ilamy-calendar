import type { CalendarSlotProps } from '@ilamy/calendar'
import type { CalendarThemeAdapter } from '@ilamy/calendar/react'
import type { CssMode, ThemeAccent } from '../types/settings-form.types'

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

const TAILWIND_SLOT_PROPS: CalendarSlotProps = {
	root: {
		className: [
			'bg-background text-foreground text-[14px] leading-[1.4]',
			"[&_[data-ilamy-slot='arrow-group']]:bg-background [&_[data-ilamy-slot='arrow-group']]:border [&_[data-ilamy-slot='arrow-group']]:border-border [&_[data-ilamy-slot='arrow-group']]:rounded-md",
			"[&_[data-ilamy-slot='arrow-group']>[data-ilamy-slot='nav-button']]:border-0 [&_[data-ilamy-slot='arrow-group']>[data-ilamy-slot='nav-button']]:rounded-none [&_[data-ilamy-slot='arrow-group']>[data-ilamy-slot='nav-button']]:px-2.5",
			"[&_[data-ilamy-slot='view-switcher']]:bg-muted [&_[data-ilamy-slot='view-switcher']]:rounded-md [&_[data-ilamy-slot='view-switcher']]:p-[3px]",
			"[&_[data-ilamy-slot='month-header']]:bg-background [&_[data-ilamy-slot='month-header']]:border-b [&_[data-ilamy-slot='month-header']]:border-border",
			"[&_[data-ilamy-slot='grid-header']]:bg-background [&_[data-ilamy-slot='grid-header']:not(:has([data-ilamy-part='all-day-row']))]:border-b [&_[data-ilamy-slot='grid-header']:not(:has([data-ilamy-part='all-day-row']))]:border-border",
			"[&_[data-ilamy-part='all-day-row']]:border-t [&_[data-ilamy-part='all-day-row']]:border-b [&_[data-ilamy-part='all-day-row']]:border-border [&_[data-ilamy-part='all-day-label']]:bg-background [&_[data-ilamy-part='all-day-label']]:text-muted-foreground [&_[data-ilamy-part='all-day-label']]:border-r [&_[data-ilamy-part='all-day-label']]:border-border [&_[data-ilamy-part='all-day-label']]:text-xs",
			"[&_[data-ilamy-part='all-day-cell']:not(:last-child):not([data-last-col='true'])]:border-r [&_[data-ilamy-part='all-day-cell']:not(:last-child):not([data-last-col='true'])]:border-border",
			"[&_[data-ilamy-part='col-header-label']]:leading-6 [&_[data-ilamy-today-badge]]:inline-flex [&_[data-ilamy-today-badge]]:items-center [&_[data-ilamy-today-badge]]:justify-center [&_[data-ilamy-today-badge]]:min-w-6 [&_[data-ilamy-today-badge]]:h-6 [&_[data-ilamy-today-badge]]:px-1.5 [&_[data-ilamy-today-badge]]:rounded-full [&_[data-ilamy-today-badge]]:bg-primary [&_[data-ilamy-today-badge]]:text-primary-foreground [&_[data-ilamy-today-badge]]:text-xs [&_[data-ilamy-today-badge]]:font-semibold",
			"[&_[data-ilamy-part='cell-day-num']]:text-xs [&_[data-ilamy-part='cell-day-num']]:font-medium [&_[data-ilamy-part='cell-day-num']]:rounded-full",
			"[&_[data-ilamy-part='header-corner']]:bg-background [&_[data-ilamy-part='header-corner']]:text-muted-foreground [&_[data-ilamy-part='header-corner']]:border-r [&_[data-ilamy-part='header-corner']]:border-border [&_[data-ilamy-part='header-corner']]:p-2 [&_[data-ilamy-part='header-corner']]:text-xs [&_[data-ilamy-part='header-corner']]:font-medium",
			"[&_[data-ilamy-part='time-col-header']]:bg-background [&_[data-ilamy-part='time-col-header']]:px-1 [&_[data-ilamy-part='time-col-header']]:py-2 [&_[data-ilamy-part='time-col-header']]:text-xs [&_[data-ilamy-part='time-col-header']]:font-medium [&_[data-ilamy-part='time-col-header']]:text-muted-foreground [&_[data-ilamy-part='time-col-header']:not(:last-child)]:border-r [&_[data-ilamy-part='time-col-header']:not(:last-child)]:border-border",
			"[&_[data-ilamy-part='day-banner']]:bg-background [&_[data-ilamy-part='day-banner']]:border-b [&_[data-ilamy-part='day-banner']]:border-border [&_[data-ilamy-part='day-banner']]:px-3 [&_[data-ilamy-part='day-banner']]:py-2.5 [&_[data-ilamy-part='day-banner']]:text-base [&_[data-ilamy-part='day-banner']]:font-semibold",
			"[&_[data-ilamy-part='time-axis']]:bg-background [&_[data-ilamy-part='time-axis']]:border-r [&_[data-ilamy-part='time-axis']]:border-border",
			"[&_[data-ilamy-part='time-axis-hour']]:text-muted-foreground [&_[data-ilamy-part='time-axis-hour']]:text-[11px] [&_[data-ilamy-part='time-axis-hour']]:border-b [&_[data-ilamy-part='time-axis-hour']]:border-border/60",
			"[&_[data-ilamy-part='time-col']:not(:last-child)]:border-r [&_[data-ilamy-part='time-col']:not(:last-child)]:border-border",
			"[&_[data-ilamy-part='res-h-day-group']]:bg-background [&_[data-ilamy-part='res-h-day-group']]:border-b [&_[data-ilamy-part='res-h-day-group']]:border-border [&_[data-ilamy-part='res-h-day-group']]:py-1.5 [&_[data-ilamy-part='res-h-day-group']]:text-xs [&_[data-ilamy-part='res-h-day-group']]:font-medium [&_[data-ilamy-part='res-h-day-group']:not(:last-child):not([data-last-col='true'])]:border-r [&_[data-ilamy-part='res-h-day-group']:not(:last-child):not([data-last-col='true'])]:border-border",
			"[&_[data-ilamy-part='res-h-hour-cell']]:bg-background [&_[data-ilamy-part='res-h-hour-cell']]:text-muted-foreground [&_[data-ilamy-part='res-h-hour-cell']]:py-2 [&_[data-ilamy-part='res-h-hour-cell']]:text-xs [&_[data-ilamy-part='res-h-hour-cell']:not(:last-child):not([data-last-col='true'])]:border-r [&_[data-ilamy-part='res-h-hour-cell']:not(:last-child):not([data-last-col='true'])]:border-border",
			"[&_[data-ilamy-part='view-menu-dropdown']]:bg-background [&_[data-ilamy-part='view-menu-dropdown']]:text-foreground [&_[data-ilamy-part='view-menu-dropdown']]:border [&_[data-ilamy-part='view-menu-dropdown']]:border-border [&_[data-ilamy-part='view-menu-dropdown']]:rounded-md [&_[data-ilamy-part='view-menu-dropdown']]:p-1 [&_[data-ilamy-part='view-menu-dropdown']]:shadow-lg",
			"[&_[data-ilamy-part='view-menu-item']]:px-2.5 [&_[data-ilamy-part='view-menu-item']]:py-1.5 [&_[data-ilamy-part='view-menu-item']]:rounded-sm [&_[data-ilamy-part='view-menu-item']]:text-sm [&_[data-ilamy-part='view-menu-item']]:font-medium hover:[&_[data-ilamy-part='view-menu-item']]:bg-muted",
			"[&_[data-ilamy-part='year-card']]:bg-card [&_[data-ilamy-part='year-card']]:border [&_[data-ilamy-part='year-card']]:border-border [&_[data-ilamy-part='year-card']]:rounded-lg [&_[data-ilamy-part='year-card']]:p-3",
			"[&_[data-ilamy-part='year-month-btn']]:text-base [&_[data-ilamy-part='year-month-btn']]:font-semibold",
			"[&_[data-ilamy-part='year-count-badge']]:rounded-full [&_[data-ilamy-part='year-count-badge']]:bg-primary [&_[data-ilamy-part='year-count-badge']]:px-2 [&_[data-ilamy-part='year-count-badge']]:py-0.5 [&_[data-ilamy-part='year-count-badge']]:text-xs [&_[data-ilamy-part='year-count-badge']]:text-primary-foreground",
			"[&_[data-ilamy-part='year-weekday']]:text-[10px] [&_[data-ilamy-part='year-weekday']]:text-muted-foreground [&_[data-ilamy-part='year-weekday']]:text-center",
			"[&_[data-ilamy-part='year-day-btn']]:rounded [&_[data-ilamy-part='year-day-btn']]:text-[11px] hover:[&_[data-ilamy-part='year-day-btn']]:bg-muted [&_[data-ilamy-part='year-day-btn'][data-outside-month='true']]:text-muted-foreground [&_[data-ilamy-part='year-day-btn'][data-today='true']]:rounded-full [&_[data-ilamy-part='year-day-btn'][data-today='true']]:bg-primary [&_[data-ilamy-part='year-day-btn'][data-today='true']]:text-primary-foreground",
			"[&_[data-ilamy-part='year-day-dot']]:rounded-full [&_[data-ilamy-part='year-day-dot']]:bg-primary",
			"[&_[data-ilamy-part='agenda-day']]:border-b [&_[data-ilamy-part='agenda-day']]:border-border [&_[data-ilamy-part='agenda-day']]:px-2 [&_[data-ilamy-part='agenda-day']]:py-3",
			"[&_[data-ilamy-part='agenda-row']]:rounded-sm [&_[data-ilamy-part='agenda-row']]:px-2 [&_[data-ilamy-part='agenda-row']]:py-1 [&_[data-ilamy-part='agenda-row']]:text-sm hover:[&_[data-ilamy-part='agenda-row']]:bg-muted",
			"[&_[data-ilamy-part='agenda-time']]:text-xs [&_[data-ilamy-part='agenda-time']]:text-muted-foreground",
			"[&_[data-ilamy-part='agenda-dot']]:rounded-full [&_[data-ilamy-part='agenda-dot']]:border [&_[data-ilamy-part='agenda-dot']]:border-border [&_[data-ilamy-part='agenda-dot']]:bg-primary",
			"[&_[data-ilamy-part='agenda-badge']]:text-xs [&_[data-ilamy-part='agenda-badge']]:text-muted-foreground",
			"[&_[data-ilamy-part='dialog']]:bg-background [&_[data-ilamy-part='dialog']]:text-foreground [&_[data-ilamy-part='dialog']]:border [&_[data-ilamy-part='dialog']]:border-border [&_[data-ilamy-part='dialog']]:rounded-lg [&_[data-ilamy-part='dialog']]:p-5 [&_[data-ilamy-part='dialog']]:shadow-xl backdrop:[&_[data-ilamy-part='dialog']]:bg-black/50",
			"[&_[data-ilamy-part='dialog-header']]:pb-2 [&_[data-ilamy-part='dialog-title']]:text-lg [&_[data-ilamy-part='dialog-title']]:font-semibold [&_[data-ilamy-part='dialog-subtitle']]:text-sm [&_[data-ilamy-part='dialog-subtitle']]:text-muted-foreground",
			"[&_[data-ilamy-part='dialog-close']]:rounded [&_[data-ilamy-part='dialog-close']]:p-1 [&_[data-ilamy-part='dialog-close']]:text-muted-foreground hover:[&_[data-ilamy-part='dialog-close']]:bg-muted hover:[&_[data-ilamy-part='dialog-close']]:text-foreground",
			"[&_[data-ilamy-part='dialog-body']]:px-1 [&_[data-ilamy-part='dialog-body']]:py-2 [&_[data-ilamy-part='dialog-body']]:-mx-1 [&_[data-ilamy-part='dialog-footer']]:pt-3.5",
			"[&_[data-ilamy-part='form-label']]:mb-1.5 [&_[data-ilamy-part='form-label']]:block [&_[data-ilamy-part='form-label']]:text-sm [&_[data-ilamy-part='form-label']]:font-medium",
			"[&_[data-ilamy-slot='input']]:w-full [&_[data-ilamy-slot='input']]:h-9 [&_[data-ilamy-slot='input']]:rounded-md [&_[data-ilamy-slot='input']]:border [&_[data-ilamy-slot='input']]:border-input [&_[data-ilamy-slot='input']]:bg-background [&_[data-ilamy-slot='input']]:px-2.5 [&_[data-ilamy-slot='input']]:py-1.5 [&_[data-ilamy-slot='input']]:text-sm [&_[data-ilamy-slot='input']]:text-foreground",
			"[&_[data-ilamy-slot='textarea']]:w-full [&_[data-ilamy-slot='textarea']]:min-h-18 [&_[data-ilamy-slot='textarea']]:rounded-md [&_[data-ilamy-slot='textarea']]:border [&_[data-ilamy-slot='textarea']]:border-input [&_[data-ilamy-slot='textarea']]:bg-background [&_[data-ilamy-slot='textarea']]:px-2.5 [&_[data-ilamy-slot='textarea']]:py-1.5 [&_[data-ilamy-slot='textarea']]:text-sm [&_[data-ilamy-slot='textarea']]:text-foreground",
			"[&_[data-ilamy-slot='select']]:w-full [&_[data-ilamy-slot='select']]:h-9 [&_[data-ilamy-slot='select']]:rounded-md [&_[data-ilamy-slot='select']]:border [&_[data-ilamy-slot='select']]:border-input [&_[data-ilamy-slot='select']]:bg-background [&_[data-ilamy-slot='select']]:px-2.5 [&_[data-ilamy-slot='select']]:py-1.5 [&_[data-ilamy-slot='select']]:text-sm [&_[data-ilamy-slot='select']]:text-foreground",
			"[&_[data-ilamy-part='btn']]:inline-flex [&_[data-ilamy-part='btn']]:items-center [&_[data-ilamy-part='btn']]:justify-center [&_[data-ilamy-part='btn']]:gap-1.5 [&_[data-ilamy-part='btn']]:h-8.5 [&_[data-ilamy-part='btn']]:rounded-md [&_[data-ilamy-part='btn']]:border [&_[data-ilamy-part='btn']]:border-border [&_[data-ilamy-part='btn']]:bg-background [&_[data-ilamy-part='btn']]:px-3.5 [&_[data-ilamy-part='btn']]:text-xs [&_[data-ilamy-part='btn']]:font-medium [&_[data-ilamy-part='btn']]:text-foreground hover:[&_[data-ilamy-part='btn']]:bg-muted",
			"[&_[data-ilamy-part='btn'][data-variant='primary']]:bg-primary [&_[data-ilamy-part='btn'][data-variant='primary']]:text-primary-foreground [&_[data-ilamy-part='btn'][data-variant='primary']]:border-transparent",
			"[&_[data-ilamy-part='btn'][data-variant='danger']]:mr-auto [&_[data-ilamy-part='btn'][data-variant='danger']]:bg-destructive [&_[data-ilamy-part='btn'][data-variant='danger']]:text-white [&_[data-ilamy-part='btn'][data-variant='danger']]:border-transparent",
			"[&_[data-ilamy-part='color-swatch']]:rounded-full [&_[data-ilamy-part='color-swatch']]:border [&_[data-ilamy-part='color-swatch']]:border-border [&_[data-ilamy-part='color-swatch'][data-selected='true']]:ring-2 [&_[data-ilamy-part='color-swatch'][data-selected='true']]:ring-primary [&_[data-ilamy-part='color-swatch'][data-selected='true']]:ring-offset-2",
			"[&_[data-ilamy-part='popover']]:bg-background [&_[data-ilamy-part='popover']]:text-foreground [&_[data-ilamy-part='popover']]:border [&_[data-ilamy-part='popover']]:border-border [&_[data-ilamy-part='popover']]:rounded-md [&_[data-ilamy-part='popover']]:p-2.5 [&_[data-ilamy-part='popover']]:shadow-lg",
			"[&_[data-ilamy-part='picker-title']]:text-sm [&_[data-ilamy-part='picker-title']]:font-semibold",
			"[&_[data-ilamy-part='picker-cell']]:rounded [&_[data-ilamy-part='picker-cell']]:px-2 [&_[data-ilamy-part='picker-cell']]:py-1.5 [&_[data-ilamy-part='picker-cell']]:text-xs hover:[&_[data-ilamy-part='picker-cell']]:bg-muted [&_[data-ilamy-part='picker-cell'][data-outside-month='true']]:text-muted-foreground [&_[data-ilamy-part='picker-cell'][data-selected='true']]:bg-primary [&_[data-ilamy-part='picker-cell'][data-selected='true']]:text-primary-foreground",
			"[&_[data-ilamy-part='repeat-card']]:rounded-lg [&_[data-ilamy-part='repeat-card']]:border [&_[data-ilamy-part='repeat-card']]:border-border [&_[data-ilamy-part='repeat-card']]:p-3",
			"[&_[data-ilamy-part='repeat-count-input']]:h-7 [&_[data-ilamy-part='repeat-count-input']]:px-2 [&_[data-ilamy-part='repeat-count-input']]:text-xs",
		].join(' '),
	},
	header: {
		className: 'bg-background',
	},
	navButton: {
		className:
			'bg-background text-foreground border border-border rounded-md px-3 text-sm leading-5 font-medium hover:bg-muted data-[variant=primary]:bg-primary data-[variant=primary]:text-primary-foreground data-[variant=primary]:border-transparent',
	},
	viewButton: {
		className:
			'bg-transparent text-muted-foreground border-0 rounded-sm px-3 text-sm leading-5 font-medium',
	},
	viewButtonActive: {
		className:
			'bg-background text-foreground border-0 rounded-sm px-3 text-sm leading-5 font-medium shadow-xs',
	},
	grid: {
		className: [
			'bg-background border border-border rounded-none',
			"[&_[data-ilamy-slot='grid-row']>[data-ilamy-slot='cell']]:p-1 [&_[data-ilamy-part='grid-row-grid']>[data-ilamy-slot='cell']]:p-1",
			"[&_[data-ilamy-slot='grid-row']:not([data-ilamy-grid-lines='true'])>[data-ilamy-slot='cell']:not(:last-child):not([data-last-col='true'])]:border-r [&_[data-ilamy-slot='grid-row']:not([data-ilamy-grid-lines='true'])>[data-ilamy-slot='cell']:not(:last-child):not([data-last-col='true'])]:border-border",
			"[&_[data-ilamy-part='grid-row-grid']:not([data-ilamy-grid-lines='true'])>[data-ilamy-slot='cell']:not(:last-child):not([data-last-col='true'])]:border-r [&_[data-ilamy-part='grid-row-grid']:not([data-ilamy-grid-lines='true'])>[data-ilamy-slot='cell']:not(:last-child):not([data-last-col='true'])]:border-border",
			"[&_[data-ilamy-part='res-h-track']>[data-ilamy-slot='cell']:not(:last-child):not([data-last-col='true'])]:border-r [&_[data-ilamy-part='res-h-track']>[data-ilamy-slot='cell']:not(:last-child):not([data-last-col='true'])]:border-border",
			"[&_[data-ilamy-slot='grid-row']:not(:last-child)>[data-ilamy-slot='cell']]:border-b [&_[data-ilamy-slot='grid-row']:not(:last-child)>[data-ilamy-slot='cell']]:border-border",
			"[&_[data-ilamy-part='month-row']:not(:last-child)_[data-ilamy-slot='cell']]:border-b [&_[data-ilamy-part='month-row']:not(:last-child)_[data-ilamy-slot='cell']]:border-border",
			"[&_[data-ilamy-part='res-h-row']:not(:last-child)_[data-ilamy-part='grid-row-grid']>[data-ilamy-slot='cell']]:border-b [&_[data-ilamy-part='res-h-row']:not(:last-child)_[data-ilamy-part='grid-row-grid']>[data-ilamy-slot='cell']]:border-border",
			"[&_[data-ilamy-part='res-h-row']:not(:last-child)_[data-ilamy-part='res-h-track']>[data-ilamy-slot='cell']]:border-b [&_[data-ilamy-part='res-h-row']:not(:last-child)_[data-ilamy-part='res-h-track']>[data-ilamy-slot='cell']]:border-border",
			"[&_[data-ilamy-part='time-col']>[data-ilamy-slot='cell']:not(:last-child):not([data-last-row='true'])]:border-b [&_[data-ilamy-part='time-col']>[data-ilamy-slot='cell']:not(:last-child):not([data-last-row='true'])]:border-border/35",
			"[&_[data-ilamy-part='time-col']>[data-ilamy-slot='cell'][data-hour-end='true']:not(:last-child):not([data-last-row='true'])]:border-b [&_[data-ilamy-part='time-col']>[data-ilamy-slot='cell'][data-hour-end='true']:not(:last-child):not([data-last-row='true'])]:border-border/80",
		].join(' '),
	},
	dayHeader: {
		className:
			"bg-background text-foreground py-2 text-sm leading-5 font-medium [&:not(:last-child):not([data-last-col='true'])]:border-r [&:not(:last-child):not([data-last-col='true'])]:border-border",
	},
	resourceHeader: {
		className:
			"bg-background text-foreground px-2.5 py-2 text-sm font-medium border-r border-border [&:not([data-ilamy-part='header-corner'])]:border-b [&:not([data-ilamy-part='header-corner'])]:border-border",
	},
	cell: {
		className:
			"bg-background [&[data-outside-month='true']]:bg-muted/35 [&[data-outside-month='true']]:text-muted-foreground [&[data-drop-target='valid']]:outline-2 [&[data-drop-target='valid']]:outline-primary [&[data-drop-target='valid']]:-outline-offset-2",
	},
	cellToday: {
		className:
			"bg-background [&[data-drop-target='valid']]:outline-2 [&[data-drop-target='valid']]:outline-primary [&[data-drop-target='valid']]:-outline-offset-2",
	},
	cellNonBusiness: {
		className:
			"bg-muted/55 text-muted-foreground [&[data-drop-target='valid']]:outline-2 [&[data-drop-target='valid']]:outline-primary [&[data-drop-target='valid']]:-outline-offset-2",
	},
	cellDisabled: {
		className: 'bg-muted text-muted-foreground opacity-55 cursor-not-allowed',
	},
	allDayRow: {
		className: 'bg-background',
	},
	eventBar: {
		className:
			"rounded-sm text-xs font-medium [&:not([data-custom-color='true'])]:bg-primary [&:not([data-custom-color='true'])]:text-primary-foreground [&[data-truncated-start='true']]:rounded-l-none [&[data-truncated-end='true']]:rounded-r-none [&>[data-ilamy-part='event-bar-content']]:px-1.5 [&>[data-ilamy-part='event-bar-content']]:py-1 [&[data-compact='true']>[data-ilamy-part='event-bar-content']]:py-0 [&>[data-ilamy-part='event-bar-content']]:border [&>[data-ilamy-part='event-bar-content']]:border-card [&>[data-ilamy-part='event-bar-content']]:rounded-inherit",
	},
	nowIndicator: {
		className:
			"text-destructive [&>[data-ilamy-part='now-line-dot']]:size-2 [&>[data-ilamy-part='now-line-dot']]:rounded-full [&>[data-ilamy-part='now-line-dot']]:bg-destructive [&>[data-ilamy-part='now-line-bar']]:h-0.5 [&>[data-ilamy-part='now-line-bar']]:flex-1 [&>[data-ilamy-part='now-line-bar']]:bg-destructive",
	},
	moreLink: {
		className:
			'text-muted-foreground text-xs font-medium px-1.5 py-0.5 hover:text-foreground hover:underline',
	},
}

export interface ResolvedDemoTheme {
	adapter: CalendarThemeAdapter | undefined
	label: string
}

export function resolveDemoCss(options: {
	cssMode: CssMode
	mode: 'light' | 'dark'
	accent: ThemeAccent
	useCustomSlotProps: boolean
}): ResolvedDemoTheme {
	const { cssMode, mode, accent, useCustomSlotProps } = options
	const palette = THEME_ACCENTS[accent]

	if (cssMode === 'stylex') {
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

	if (cssMode === 'tailwind') {
		return {
			adapter: {
				unstyled: true,
				slotProps: TAILWIND_SLOT_PROPS,
			},
			label: 'Tailwind',
		}
	}

	if (cssMode === 'unstyled') {
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
			label: useCustomSlotProps ? 'Unstyled + slotProps' : 'Unstyled',
		}
	}

	return {
		adapter: undefined,
		label: 'Plain CSS',
	}
}
