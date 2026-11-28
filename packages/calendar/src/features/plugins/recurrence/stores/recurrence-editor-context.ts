import type { TranslatorFunction } from '@ilamy/calendar'
import { createContext } from 'preact'
import { useContext } from 'preact/hooks'
import type { Weekday } from 'rrule'
import type { RRuleOptions } from '../types'
import type { RecurrencePreset } from '../utils/recurrence-presets'

export type EndType = 'never' | 'count' | 'until'
type MonthlyMode = 'day' | 'weekday'

export interface RecurrenceEditorContextValue {
	opts: RRuleOptions | null
	custom: boolean
	reference: Date
	timezone: string
	locale: string
	firstDayOfWeek: number
	t: TranslatorFunction
	update: (changes: Partial<RRuleOptions>) => void
	selectPreset: (preset: RecurrencePreset) => void
	toggleDay: (day: Weekday) => void
	setMonthlyMode: (mode: MonthlyMode) => void
	setEndType: (type: EndType) => void
	setUntil: (date: Date | undefined) => void
}

const RecurrenceEditorContext = createContext<
	RecurrenceEditorContextValue | undefined
>(undefined)

export const RecurrenceEditorProvider = RecurrenceEditorContext.Provider

export const useRecurrenceEditor = (): RecurrenceEditorContextValue => {
	const ctx = useContext(RecurrenceEditorContext)
	if (!ctx) {
		throw new Error('useRecurrenceEditor must be used within RecurrenceEditor')
	}
	return ctx
}
