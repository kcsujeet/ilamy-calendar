import type { CalendarThemeAdapter } from '@ilamy/calendar/react'
import { createMuiCalendarTheme } from '@ilamy/calendar/themes/mui'
import {
	createTheme,
	ThemeProvider as MuiThemeProvider,
} from '@mui/material/styles'
import { type ReactNode, useMemo } from 'react'
import type { ThemeAccent } from '../../../types/settings-form.types'
import { THEME_ACCENTS } from '../../../utils/demo-themes.utils'

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
	const adapter = useMemo(
		() => createMuiCalendarTheme({ theme: muiTheme }),
		[muiTheme]
	)

	return (
		<MuiThemeProvider theme={muiTheme}>{children(adapter)}</MuiThemeProvider>
	)
}
