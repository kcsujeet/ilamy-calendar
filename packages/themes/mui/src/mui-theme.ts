import type { CalendarSlotProps } from '@ilamy/calendar'
import type {
	CalendarComponents,
	CalendarThemeAdapter,
} from '@ilamy/calendar/react'
import { createTheme, type Theme, useTheme } from '@mui/material/styles'
import { useMemo } from 'react'
import { buildMuiCssVars, muiCalendarComponents } from './mui-components'

export interface MuiCalendarThemeOptions {
	/** Custom MUI theme; defaults to the active `useTheme()` (or default MUI theme). */
	theme?: Theme
	/** Extra slot overrides merged on top of the MUI theme's slot styles. */
	slotProps?: CalendarSlotProps
	/** Extra component overrides merged on top of `muiCalendarComponents`. */
	components?: CalendarComponents
}

const buildMuiSlotProps = (theme: Theme): CalendarSlotProps => ({
	root: {
		style: {
			...buildMuiCssVars(theme),
			fontFamily: theme.typography.fontFamily,
		},
	},
})

const mergeSlotProps = (
	base: CalendarSlotProps,
	overrides?: CalendarSlotProps
): CalendarSlotProps => {
	if (!overrides) {
		return base
	}
	const merged: CalendarSlotProps = { ...base }
	for (const key of Object.keys(overrides) as Array<keyof CalendarSlotProps>) {
		const baseSlot = base[key]
		const overrideSlot = overrides[key]
		if (!overrideSlot) continue
		merged[key] = {
			className:
				[baseSlot?.className, overrideSlot.className]
					.filter(Boolean)
					.join(' ') || undefined,
			style: { ...baseSlot?.style, ...overrideSlot.style },
		}
	}
	return merged
}

/**
 * Builds a `<IlamyCalendar {...adapter} />` theme adapter from a Material UI
 * `Theme` object, automatically honoring palette, typography, spacing, shape,
 * and dark mode.
 */
export const createMuiCalendarTheme = (
	options: MuiCalendarThemeOptions = {}
): CalendarThemeAdapter => {
	const resolvedTheme = options.theme ?? createTheme()
	return {
		unstyled: false,
		slotProps: mergeSlotProps(
			buildMuiSlotProps(resolvedTheme),
			options.slotProps
		),
		components: {
			...muiCalendarComponents,
			...options.components,
		},
	}
}

/**
 * React hook returning a Material UI `CalendarThemeAdapter` synced with the
 * nearest MUI `<ThemeProvider>` (including light/dark mode toggles).
 *
 * @example
 * const muiTheme = useMuiCalendarTheme()
 * <IlamyCalendar {...muiTheme} events={events} />
 */
export const useMuiCalendarTheme = ({
	slotProps,
	components,
}: Omit<MuiCalendarThemeOptions, 'theme'> = {}): CalendarThemeAdapter => {
	const theme = useTheme()
	return useMemo(
		() => createMuiCalendarTheme({ slotProps, components, theme }),
		[theme, slotProps, components]
	)
}
