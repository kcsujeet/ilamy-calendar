import { useRequiredContext } from '@ilamy/ui/hooks/use-required-context'
import { createContext } from 'react'
import type { Weekday } from 'rrule'
import type { RRuleOptions } from '../types'
import type { RecurrencePreset } from '../utils/recurrence-presets'

export type EndType = 'never' | 'count' | 'until'
type MonthlyMode = 'day' | 'weekday'

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

const RecurrenceEditorContext = createContext<
	RecurrenceEditorContextValue | undefined
>(undefined)

export const RecurrenceEditorProvider = RecurrenceEditorContext.Provider

export const useRecurrenceEditor = (): RecurrenceEditorContextValue =>
	useRequiredContext(
		RecurrenceEditorContext,
		'useRecurrenceEditor',
		'RecurrenceEditor'
	)
