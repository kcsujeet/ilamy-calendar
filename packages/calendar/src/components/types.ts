// The public event model (CalendarEvent, WeekDays, BusinessHours) now lives in
// the shared `@ilamy/types` package, the lightweight contract a plugin depends
// on. Re-exported here so the existing `@/components/types` call sites across
// core stay unchanged.
export type {
	BusinessHours,
	CalendarEvent,
	WeekDays,
} from '@ilamy/types'
