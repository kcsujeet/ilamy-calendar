import { useMemo, useState } from 'react'
import type { BusinessHours } from '@/components/types'
import { DAY_MAX_EVENTS_DEFAULT } from '@/lib/constants'
import { defaultTranslations } from '@/lib/translations/default'
import type { Translations, TranslatorFunction } from '@/lib/translations/types'

export interface CalendarConfigParams {
	firstDayOfWeek: number
	businessHours?: BusinessHours | BusinessHours[]
	locale?: string
	translations?: Translations
	translator?: TranslatorFunction
}

export interface CalendarConfigSlice {
	firstDayOfWeek: number
	dayMaxEvents: number
	businessHours?: BusinessHours | BusinessHours[]
	currentLocale: string
	setCurrentLocale: React.Dispatch<React.SetStateAction<string>>
	t: TranslatorFunction
}

/**
 * Config slice: static configuration, i18n, and locale state. The locale
 * EFFECT (which also touches navigation state) lives in the composer.
 */
export const useCalendarConfig = ({
	firstDayOfWeek,
	businessHours,
	locale,
	translations,
	translator,
}: CalendarConfigParams): CalendarConfigSlice => {
	const [currentLocale, setCurrentLocale] = useState(locale || 'en')

	const t: TranslatorFunction = useMemo(() => {
		if (translator) return translator
		const dict = translations || defaultTranslations
		return (key: string) => dict[key as keyof Translations] || key
	}, [translations, translator])

	return {
		firstDayOfWeek,
		dayMaxEvents: DAY_MAX_EVENTS_DEFAULT,
		businessHours,
		currentLocale,
		setCurrentLocale,
		t,
	}
}
