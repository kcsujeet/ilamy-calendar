import { createContext, useContext } from 'react'
import type { Weekday } from 'rrule'
import type { RRuleOptions } from '../types'
import type { RecurrencePreset } from '../utils/recurrence-presets'

export type EndType = 'never' | 'count' | 'until'
export type MonthlyMode = 'day' | 'weekday'

// The editor's state and mutations, shared with the field sub-components so each
// derives the values it needs from `opts`/`reference` instead of taking props.
export interface RecurrenceEditorContextValue {
	opts: RRuleOptions | null
	custom: boolean
	reference: Date
	update: (changes: Partial<RRuleOptions>) => void
	selectPreset: (preset: RecurrencePreset) => void
	toggleDay: (day: Weekday) => void
	setMonthlyMode: (mode: MonthlyMode) => void
	setEndType: (type: EndType) => void
	setUntil: (date: Date | undefined) => void
}

const RecurrenceEditorContext =
	createContext<RecurrenceEditorContextValue | null>(null)

export const RecurrenceEditorProvider = RecurrenceEditorContext.Provider

export const useRecurrenceEditor = () => {
	const context = useContext(RecurrenceEditorContext)
	if (!context) {
		throw new Error(
			'useRecurrenceEditor must be used within a RecurrenceEditor'
		)
	}
	return context
}
