import '@ilamy/calendar'
import type { RRuleOptions } from './types'

declare module '@ilamy/calendar' {
	interface CalendarEvent {
		rrule?: RRuleOptions
		recurrenceId?: string
		exdates?: string[]
	}
}

/**
 * Marker re-exported by the recurrence entry so the declaration bundler keeps
 * this module — and therefore the `declare module '@ilamy/calendar'`
 * augmentation above — in the emitted `recurrence.d.ts`. A side-effect-only
 * `import './augment'` is otherwise tree-shaken from the type bundle, which
 * would strip `rrule`/`recurrenceId`/`exdates` from the public `CalendarEvent`.
 */
export type RecurrenceAugmentation = RRuleOptions
