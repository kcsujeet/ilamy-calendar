import type {
	CalendarSlotName,
	CalendarSlotProps,
	SlotStyleProps,
} from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import {
	type CSSProperties,
	createContext,
	type ReactNode,
	useContext,
	useMemo,
} from 'react'
import {
	DEFAULT_CALENDAR_COMPONENTS,
	PortalThemeStyleContext,
	UNSTYLED_CALENDAR_COMPONENTS,
} from '@/components/default-calendar-components'
import type { CalendarComponents } from '@/types/calendar.types'

const extractPortalThemeStyle = (
	rootStyle: SlotStyleProps['style']
): CSSProperties | undefined => {
	if (!rootStyle) return undefined
	const vars: Record<string, string | number> = {}
	let hasAny = false
	for (const [key, value] of Object.entries(rootStyle)) {
		if (value === undefined) continue
		if (key.startsWith('--') || key === 'colorScheme' || key === 'fontFamily') {
			vars[key] = value
			hasAny = true
		}
	}
	return hasAny ? (vars as CSSProperties) : undefined
}

export interface CalendarThemeValue {
	unstyled: boolean
	/** True when `unstyled` is set with no theme `slotProps` or custom `components`. */
	isBareUnstyled: boolean
	slotProps: CalendarSlotProps
	components: Required<CalendarComponents>
}

const DEFAULT_THEME: CalendarThemeValue = {
	unstyled: false,
	isBareUnstyled: false,
	slotProps: {},
	components: DEFAULT_CALENDAR_COMPONENTS,
}

const CalendarThemeContext = createContext<CalendarThemeValue>(DEFAULT_THEME)

interface CalendarThemeProviderProps {
	unstyled?: boolean
	slotProps?: CalendarSlotProps
	components?: CalendarComponents
	children: ReactNode
}

/** Provides `unstyled`, `slotProps`, and swappable UI `components` to the calendar tree. */
export const CalendarThemeProvider = ({
	unstyled = false,
	slotProps,
	components,
	children,
}: CalendarThemeProviderProps): ReactNode => {
	const value = useMemo<CalendarThemeValue>(() => {
		const baseComponents = unstyled
			? UNSTYLED_CALENDAR_COMPONENTS
			: DEFAULT_CALENDAR_COMPONENTS
		const hasSlotTheme =
			slotProps !== undefined && Object.keys(slotProps).length > 0
		const hasCustomComponents =
			components !== undefined && Object.keys(components).length > 0
		return {
			unstyled,
			isBareUnstyled: unstyled && !hasSlotTheme && !hasCustomComponents,
			slotProps: slotProps ?? {},
			components: {
				...baseComponents,
				...components,
			},
		}
	}, [unstyled, slotProps, components])

	const portalStyle = useMemo(
		() => extractPortalThemeStyle(slotProps?.root?.style),
		[slotProps?.root?.style]
	)

	return (
		<CalendarThemeContext.Provider value={value}>
			<PortalThemeStyleContext.Provider value={portalStyle}>
				{children}
			</PortalThemeStyleContext.Provider>
		</CalendarThemeContext.Provider>
	)
}

/** Reads the active calendar theme configuration (`unstyled`, `slotProps`, `components`). */
export const useCalendarTheme = (): CalendarThemeValue =>
	useContext(CalendarThemeContext)

/** Returns `className` only when `unstyled` is false. */
export const styledClass = (
	unstyled: boolean,
	className: string
): string | undefined => (unstyled ? undefined : className)

/** Returns the active UI primitive set (default shadcn/Radix merged with overrides). */
export const useCalendarComponents = (): Required<CalendarComponents> => {
	const theme = useContext(CalendarThemeContext)
	return theme.components
}

/**
 * Merges a slot's structural classes (always applied), visual Tailwind defaults
 * (omitted when `unstyled` is true), and consumer `slotProps[slot]`.
 */
export const useSlotProps = (
	slot: CalendarSlotName,
	options: {
		structuralClassName?: string
		defaultClassName?: string
		extraClassName?: string
		style?: CSSProperties
	} = {}
): { className: string | undefined; style: CSSProperties | undefined } => {
	const { unstyled, slotProps } = useContext(CalendarThemeContext)
	const override: SlotStyleProps | undefined = slotProps[slot]
	const className =
		cn(
			options.structuralClassName,
			!unstyled && options.defaultClassName,
			override?.className,
			options.extraClassName
		) || undefined

	const hasStyle = Boolean(options.style || override?.style)
	let style: CSSProperties | undefined
	if (hasStyle) {
		style = {
			...options.style,
			...(override?.style as CSSProperties | undefined),
		}
	}

	return { className, style }
}
