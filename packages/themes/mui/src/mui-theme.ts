import type {
	CalendarComponents,
	CalendarSlotProps,
	CalendarThemeAdapter,
} from '@ilamy/calendar'
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

const buildMuiSlotProps = (theme: Theme): CalendarSlotProps => {
	let borderRadius: string | number = theme.shape.borderRadius
	if (typeof theme.shape.borderRadius === 'number') {
		borderRadius = `${theme.shape.borderRadius}px`
	}

	return {
		root: {
			style: {
				...buildMuiCssVars(theme),
				backgroundColor: theme.palette.background.paper,
				color: theme.palette.text.primary,
				fontFamily: theme.typography.fontFamily,
				borderRadius,
			},
		},
		header: {
			style: {
				backgroundColor: theme.palette.background.paper,
			},
		},
		grid: {
			style: {
				backgroundColor: theme.palette.background.paper,
				border: `1px solid ${theme.palette.divider}`,
			},
		},
		dayHeader: {
			style: {
				backgroundColor: theme.palette.background.default,
				color: theme.palette.text.secondary,
				padding: '8px 0',
				fontWeight: theme.typography.fontWeightMedium,
				fontSize: theme.typography.body2.fontSize,
			},
		},
		resourceHeader: {
			style: {
				backgroundColor: theme.palette.background.default,
				color: theme.palette.text.primary,
				padding: '8px 10px',
				fontWeight: theme.typography.fontWeightMedium,
			},
		},
		cell: {
			style: {
				backgroundColor: theme.palette.background.paper,
				padding: '4px',
			},
		},
		cellToday: {
			style: {
				backgroundColor: theme.palette.background.paper,
				padding: '4px',
			},
		},
		cellNonBusiness: {
			style: {
				backgroundColor: theme.palette.action.disabledBackground,
				color: theme.palette.text.disabled,
				padding: '4px',
			},
		},
		cellDisabled: {
			style: {
				backgroundColor: theme.palette.action.disabledBackground,
				color: theme.palette.text.disabled,
				padding: '4px',
			},
		},
		eventBar: {
			style: {
				backgroundColor: theme.palette.primary.main,
				color: theme.palette.primary.contrastText,
				borderRadius,
				fontSize: theme.typography.caption.fontSize,
			},
		},
		allDayRow: {
			style: {
				backgroundColor: theme.palette.background.default,
				borderBottom: `1px solid ${theme.palette.divider}`,
			},
		},
		nowIndicator: {
			style: {
				color: theme.palette.error.main,
			},
		},
		moreLink: {
			style: {
				color: theme.palette.primary.main,
				fontSize: theme.typography.caption.fontSize,
				fontWeight: theme.typography.fontWeightMedium,
			},
		},
		viewButton: {
			style: {
				backgroundColor: 'transparent',
				color: theme.palette.text.secondary,
				borderRadius,
				padding: '0 12px',
				fontSize: theme.typography.body2.fontSize,
				fontWeight: theme.typography.fontWeightMedium,
				cursor: 'pointer',
			},
		},
		viewButtonActive: {
			style: {
				backgroundColor: theme.palette.primary.main,
				color: theme.palette.primary.contrastText,
				borderRadius,
				padding: '0 12px',
				fontSize: theme.typography.body2.fontSize,
				fontWeight: theme.typography.fontWeightMedium,
				cursor: 'pointer',
			},
		},
	}
}

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
		unstyled: true,
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
