import type { CalendarEvent } from '@ilamy/calendar'
import { useIlamyCalendarContext } from '@ilamy/calendar'
import { parseDate, resolveZone, toDate } from '@ilamy/utils/temporal'
import { useState } from 'react'
import { RecurrenceEditor } from '../components/recurrence-editor/recurrence-editor'
import type { RRuleOptions } from '../types'

interface Props {
	event: CalendarEvent
	onChange: (updates: Partial<CalendarEvent>) => void
}

export const RecurrenceFormSection = ({ event, onChange }: Props) => {
	const { rawEvents, timezone } = useIlamyCalendarContext()
	const zone = event.timezone ?? resolveZone(timezone)
	const parsedStart = event.start ? parseDate(event.start, zone) : undefined
	const startAsDate = parsedStart ? toDate(parsedStart) : undefined

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
		const dtstart = next.dtstart ?? startAsDate
		const resolved = dtstart ? { ...next, dtstart } : next
		setRrule(resolved)
		onChange({ rrule: resolved })
	}
	return (
		<RecurrenceEditor
			onChange={handleChange}
			referenceDate={startAsDate}
			value={rrule}
		/>
	)
}
