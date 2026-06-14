import type { CalendarEvent } from '@ilamy/calendar'
import { useIlamyCalendarContext } from '@ilamy/calendar'
import { useState } from 'react'
import { RecurrenceEditor } from '../components/recurrence-editor/recurrence-editor'
import type { RRuleOptions } from '../types'

interface Props {
	event: CalendarEvent
	onChange: (updates: Partial<CalendarEvent>) => void
}

export const RecurrenceFormSection = ({ event, onChange }: Props) => {
	// Use raw (unexpanded) events: generated instances drop their rrule, so the
	// base series only exists in the raw list.
	const { rawEvents } = useIlamyCalendarContext()
	// Find the base recurring event sharing this event's uid (the parent series).
	const targetUid = event.uid
	let parent: CalendarEvent | undefined
	if (targetUid) {
		parent = rawEvents.find((candidate) => {
			const candidateUid = candidate.uid || `${candidate.id}@ilamy.calendar`
			const isSameSeries = candidateUid === targetUid
			return isSameSeries && Boolean(candidate.rrule)
		})
	}
	const [rrule, setRrule] = useState<RRuleOptions | null>(
		event.rrule ?? parent?.rrule ?? null
	)
	const handleChange = (next: RRuleOptions | null) => {
		if (!next) {
			setRrule(null)
			onChange({ rrule: undefined })
			return
		}
		// Anchor the series to the event's start when the rule omits its own
		// dtstart. A draft event may have no start yet; in that case pass the rule
		// through unanchored rather than dereferencing a missing start.
		const dtstart = next.dtstart ?? event.start?.toDate()
		const resolved = dtstart ? { ...next, dtstart } : next
		setRrule(resolved)
		onChange({ rrule: resolved })
	}
	return (
		<RecurrenceEditor
			onChange={handleChange}
			referenceDate={event.start?.toDate()}
			value={rrule}
		/>
	)
}
