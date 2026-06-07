import '@ilamy/calendar'
import type { RRuleOptions } from './types'

// The augmentation targets `@ilamy/calendar`, the package whose runtime exposes
// events (e.g. `useIlamyCalendarContext().rawEvents`). Declaration merging is
// scoped to this plugin's compilation, so within recurrence every
// `@ilamy/calendar` CalendarEvent (imported here AND returned by the calendar
// runtime) gains `rrule`/`recurrenceId`/`exdates`. Augmenting the upstream
// `@ilamy/types` instead would not reach the CalendarEvent the calendar's own
// dist bundle inlines, so the runtime-returned events would lack these fields.
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
 * augmentation above — in the emitted `index.d.ts`. A side-effect-only
 * `import './augment'` is otherwise tree-shaken from the type bundle, which
 * would strip `rrule`/`recurrenceId`/`exdates` from the public `CalendarEvent`.
 */
export type RecurrenceAugmentation = RRuleOptions
