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
	const parent = targetUid
		? rawEvents.find(
				(e) => (e.uid || `${e.id}@ilamy.calendar`) === targetUid && e.rrule
			)
		: undefined
	const [rrule, setRrule] = useState<RRuleOptions | null>(
		event.rrule ?? parent?.rrule ?? null
	)
	const handleChange = (next: RRuleOptions | null) => {
		if (!next) {
			setRrule(null)
			onChange({ rrule: undefined })
			return
		}
		// Anchor the series to the event's start when the rule omits its own dtstart.
		const anchored: RRuleOptions = {
			...next,
			dtstart: next.dtstart ?? event.start.toDate(),
		}
		setRrule(anchored)
		onChange({ rrule: anchored })
	}
	return <RecurrenceEditor onChange={handleChange} value={rrule} />
}
