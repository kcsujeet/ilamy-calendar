import { defaultTranslations, type Translations } from '@ilamy/calendar'
import { cs } from './cs'
import { de } from './de'
import { en } from './en'
import { es } from './es'
import { fr } from './fr'
import { it } from './it'
import { ja } from './ja'
import { ko } from './ko'
import { pt } from './pt'
import { ru } from './ru'
import { zh } from './zh'

// The docs only override a subset of keys; everything else falls back to the
// calendar's built-in defaults, so new calendar translation keys never break
// the docs build.
export const translations: Record<string, Partial<Translations>> = {
	en,
	es,
	fr,
	de,
	cs,
	it,
	pt,
	ru,
	zh,
	ja,
	ko,
}

export const getTranslations = (locale: string): Translations => ({
	...defaultTranslations,
	...(translations[locale] ?? translations.en),
})

export const supportedLocales = Object.keys(translations)

export { cs, de, en, es, fr, it, ja, ko, pt, ru, zh }
