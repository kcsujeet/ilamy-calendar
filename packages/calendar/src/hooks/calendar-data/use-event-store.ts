import { shareInDevBuild } from '@ilamy/core'
import type { CalendarEvent, DateRange, PublicDateInput } from '@ilamy/types'
import { parseDate, toOffsetIso } from '@ilamy/utils/temporal'
import {
	type Dispatch,
	type SetStateAction,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import type { PluginRuntime } from '@/lib/plugins/types'

const MAX_CACHED_RANGES = 32

const toRangeIso = (input: PublicDateInput, timezone?: string): string => {
	const parsed = parseDate(input, timezone)
	if (parsed) {
		return toOffsetIso(parsed)
	}
	return String(input)
}

interface EventStoreParams {
	events: CalendarEvent[]
	pluginRuntime: PluginRuntime
	getCurrentViewRange: () => DateRange
	timezone?: string
}

export interface EventStore {
	currentEvents: CalendarEvent[]
	setCurrentEvents: Dispatch<SetStateAction<CalendarEvent[]>>
	getEventsForDateRange: (
		startDate: PublicDateInput,
		endDate: PublicDateInput
	) => CalendarEvent[]
	processedEvents: CalendarEvent[]
}

export const useEventStore = ({
	events,
	pluginRuntime,
	getCurrentViewRange,
	timezone,
}: EventStoreParams): EventStore => {
	const [currentEvents, setCurrentEvents] = useState<CalendarEvent[]>(events)
	const lastEventsProp = useRef(events)

	useEffect(() => {
		if (events !== lastEventsProp.current) {
			setCurrentEvents(events)
			lastEventsProp.current = events
		}
	}, [events])

	const getEventsForDateRange = useMemo(() => {
		const rangeAnswers = new Map<string, CalendarEvent[]>()
		return (
			startInput: PublicDateInput,
			endInput: PublicDateInput
		): CalendarEvent[] => {
			const startIso = toRangeIso(startInput, timezone)
			const endIso = toRangeIso(endInput, timezone)
			const rangeKey = `${startIso}|${endIso}`
			const knownAnswer = rangeAnswers.get(rangeKey)
			if (knownAnswer) {
				return knownAnswer
			}
			const answer = pluginRuntime.transformEvents(currentEvents, {
				start: startIso,
				end: endIso,
				timezone,
			})
			if (rangeAnswers.size >= MAX_CACHED_RANGES) {
				rangeAnswers.clear()
			}
			const sharedAnswer = shareInDevBuild(answer)
			rangeAnswers.set(rangeKey, sharedAnswer)
			return sharedAnswer
		}
	}, [currentEvents, pluginRuntime, timezone])

	const processedEvents = useMemo(() => {
		const { start, end } = getCurrentViewRange()
		return getEventsForDateRange(start, end)
	}, [getEventsForDateRange, getCurrentViewRange])

	return {
		currentEvents,
		setCurrentEvents,
		getEventsForDateRange,
		processedEvents,
	}
}
