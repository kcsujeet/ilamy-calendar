import type { CalendarThemeAdapter } from '@ilamy/calendar/react'
import {
	createTheme,
	ThemeProvider as MuiThemeProvider,
	type Theme,
} from '@mui/material/styles'
import { type ReactNode, useMemo } from 'react'
import type { ThemeAccent } from '../../../types/settings-form.types'
import { THEME_ACCENTS } from '../../../utils/demo-themes.utils'

const buildMuiCssVars = (theme: Theme): Record<string, string> => {
	const mutedBg =
		theme.palette.mode === 'dark'
			? theme.palette.background.default
			: theme.palette.grey[100]
	const borderRadius =
		typeof theme.shape.borderRadius === 'number'
			? `${theme.shape.borderRadius}px`
			: String(theme.shape.borderRadius)
	return {
		'--ilamy-bg': theme.palette.background.paper,
		'--ilamy-fg': theme.palette.text.primary,
		'--ilamy-surface': theme.palette.background.default,
		'--ilamy-muted': mutedBg,
		'--ilamy-muted-fg': theme.palette.text.secondary,
		'--ilamy-border': theme.palette.divider,
		'--ilamy-primary': theme.palette.primary.main,
		'--ilamy-primary-fg': theme.palette.primary.contrastText,
		'--ilamy-danger': theme.palette.error.main,
		'--ilamy-radius': borderRadius,
		'--ilamy-font': theme.typography.fontFamily ?? 'inherit',
		'--background': theme.palette.background.paper,
		'--foreground': theme.palette.text.primary,
		'--card': theme.palette.background.paper,
		'--card-foreground': theme.palette.text.primary,
		'--popover': theme.palette.background.paper,
		'--popover-foreground': theme.palette.text.primary,
		'--primary': theme.palette.primary.main,
		'--primary-foreground': theme.palette.primary.contrastText,
		'--secondary': mutedBg,
		'--secondary-foreground': theme.palette.text.primary,
		'--muted': mutedBg,
		'--muted-foreground': theme.palette.text.secondary,
		'--accent': theme.palette.action.hover,
		'--accent-foreground': theme.palette.text.primary,
		'--destructive': theme.palette.error.main,
		'--border': theme.palette.divider,
		'--input': theme.palette.divider,
		'--ring': theme.palette.primary.main,
		colorScheme: theme.palette.mode,
	}
}

interface MuiThemeWrapperProps {
	mode: 'light' | 'dark'
	accent: ThemeAccent
	children: (adapter: CalendarThemeAdapter) => ReactNode
}

export function MuiThemeWrapper({
	mode,
	accent,
	children,
}: MuiThemeWrapperProps) {
	const palette = THEME_ACCENTS[accent]
	const muiTheme = useMemo(
		() =>
			createTheme({
				palette: {
					mode,
					primary: {
						main: mode === 'dark' ? palette.primaryDark : palette.primary,
					},
				},
				shape: { borderRadius: 10 },
			}),
		[mode, palette.primary, palette.primaryDark]
	)
	const adapter = useMemo<CalendarThemeAdapter>(
		() => ({
			unstyled: false,
			slotProps: {
				root: {
					style: {
						...buildMuiCssVars(muiTheme),
						fontFamily: muiTheme.typography.fontFamily,
					},
				},
			},
		}),
		[muiTheme]
	)

	return (
		<MuiThemeProvider theme={muiTheme}>{children(adapter)}</MuiThemeProvider>
	)
}
