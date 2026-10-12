import type { BusinessHours } from '@ilamy/types'
import { useMemo, useState } from 'react'
import { DAY_MAX_EVENTS_DEFAULT } from '@/config/constants'
import { defaultTranslations } from '@/config/translations/default'
import type {
	Translations,
	TranslatorFunction,
} from '@/config/translations/types'

interface CalendarConfigParams {
	firstDayOfWeek: number
	/** Max stacked events per day in horizontal grids. @default DAY_MAX_EVENTS_DEFAULT */
	dayMaxEvents?: number
	businessHours?: BusinessHours | BusinessHours[]
	locale?: string
	translations?: Translations
	translator?: TranslatorFunction
	/** Resource arrangement preference. Only applies when `resources` is set. @default 'horizontal' */
	orientation?: 'horizontal' | 'vertical'
	/** Week-view granularity for resource weeks. @default 'hourly' */
	weekViewGranularity?: 'hourly' | 'daily'
}

export interface CalendarConfigSlice {
	firstDayOfWeek: number
	dayMaxEvents: number
	businessHours?: BusinessHours | BusinessHours[]
	currentLocale: string
	setCurrentLocale: React.Dispatch<React.SetStateAction<string>>
	t: TranslatorFunction
	orientation: 'horizontal' | 'vertical'
	weekViewGranularity: 'hourly' | 'daily'
}

/**
 * Config slice: static configuration, i18n, and locale state. The locale
 * EFFECT (which also touches navigation state) lives in the composer.
 */
export const useCalendarConfig = ({
	firstDayOfWeek,
	dayMaxEvents = DAY_MAX_EVENTS_DEFAULT,
	businessHours,
	locale,
	translations,
	translator,
	orientation = 'horizontal',
	weekViewGranularity = 'hourly',
}: CalendarConfigParams): CalendarConfigSlice => {
	const [currentLocale, setCurrentLocale] = useState(locale || 'en')

	const t: TranslatorFunction = useMemo(() => {
		if (translator) return translator
		const dict = translations || defaultTranslations
		return (key: string) => dict[key as keyof Translations] || key
	}, [translations, translator])

	return useMemo(
		() => ({
			firstDayOfWeek,
			dayMaxEvents,
			businessHours,
			currentLocale,
			setCurrentLocale,
			t,
			orientation,
			weekViewGranularity,
		}),
		[
			firstDayOfWeek,
			dayMaxEvents,
			businessHours,
			currentLocale,
			t,
			orientation,
			weekViewGranularity,
		]
	)
}
