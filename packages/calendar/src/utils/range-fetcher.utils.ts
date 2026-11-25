import type { DateRange, EventsFetchInfo } from '../types/calendar.types'
import { add, parseDate, toOffsetIso } from './temporal'

export type RangeFetcher<Row> = (
	info: EventsFetchInfo,
	options: { signal: AbortSignal }
) => Promise<Row[]>

export interface FetchedRange {
	startMs: number
	endMs: number
	timezone?: string
}

export interface FetchDecisionInput {
	fetched?: FetchedRange
	visibleStartMs: number
	visibleEndMs: number
	timezone?: string
	hasAttempted: boolean
	isFetchInFlight: boolean
	lazyFetching: boolean
	followsRange: boolean
}

export interface FetchTracker {
	latestRequestId: number
	inFlight?: AbortController
	isLoading: boolean
	lastFetched?: FetchedRange
	hasAttempted: boolean
}

export interface ExecuteRangeFetchInput<Row> {
	name: 'events' | 'resources'
	tracker: FetchTracker
	fetchRows?: (
		info: EventsFetchInfo,
		options: { signal: AbortSignal }
	) => Promise<Row[]> | undefined
	visible: DateRange
	timezone: string | undefined
	reportLoading?: (isLoading: boolean) => void
	reportError?: (error: unknown) => void
	reportResult?: (rows: Row[]) => void
}

export const mustFetchRange = ({
	fetched,
	visibleStartMs,
	visibleEndMs,
	timezone,
	hasAttempted,
	isFetchInFlight,
	lazyFetching,
	followsRange,
}: FetchDecisionInput): boolean => {
	if (!fetched) {
		return followsRange || !hasAttempted
	}
	if (!followsRange) {
		return false
	}
	const isZoneChanged = fetched.timezone !== timezone
	const isOutsideFetchedRange =
		visibleStartMs < fetched.startMs || visibleEndMs > fetched.endMs
	return (
		isFetchInFlight || isZoneChanged || isOutsideFetchedRange || !lazyFetching
	)
}

export const createFetchTracker = (): FetchTracker => ({
	latestRequestId: 0,
	inFlight: undefined,
	isLoading: false,
	lastFetched: undefined,
	hasAttempted: false,
})

const buildFetchPayload = (
	visible: DateRange,
	timezone: string | undefined
): { info: EventsFetchInfo; fetchedRange: FetchedRange } => {
	const startZoned = parseDate(visible.start, timezone)
	const endZoned = parseDate(visible.end, timezone)
	let exclusiveEndIso = visible.end
	if (endZoned) {
		exclusiveEndIso = toOffsetIso(add(endZoned, 1, 'millisecond'))
	}
	return {
		info: {
			start: visible.start,
			end: exclusiveEndIso,
			startStr: visible.start,
			endStr: exclusiveEndIso,
			timezone,
		},
		fetchedRange: {
			startMs: startZoned?.epochMilliseconds ?? 0,
			endMs: endZoned?.epochMilliseconds ?? 0,
			timezone,
		},
	}
}

const updateTrackerLoading = (
	tracker: FetchTracker,
	next: boolean,
	reportLoading?: (isLoading: boolean) => void
): void => {
	if (tracker.isLoading === next) return
	tracker.isLoading = next
	reportLoading?.(next)
}

export const resetFetchTracker = (
	tracker: FetchTracker,
	reportLoading?: (isLoading: boolean) => void
): void => {
	tracker.latestRequestId += 1
	tracker.inFlight?.abort()
	tracker.inFlight = undefined
	tracker.lastFetched = undefined
	tracker.hasAttempted = false
	updateTrackerLoading(tracker, false, reportLoading)
}

export const abortFetchTracker = (tracker: FetchTracker): void => {
	tracker.latestRequestId += 1
	tracker.inFlight?.abort()
	tracker.inFlight = undefined
}

const surfaceFetchError = (
	name: 'events' | 'resources',
	error: unknown,
	reportError?: (error: unknown) => void
): void => {
	if (reportError) {
		reportError(error)
		return
	}
	console.error(`[@ilamy/calendar] ${name} fetch failed`, error)
}

export const executeRangeFetch = async <Row>({
	name,
	tracker,
	fetchRows,
	visible,
	timezone,
	reportLoading,
	reportError,
	reportResult,
}: ExecuteRangeFetchInput<Row>): Promise<void> => {
	if (!fetchRows) return
	tracker.inFlight?.abort()
	const controller = new AbortController()
	tracker.inFlight = controller
	tracker.hasAttempted = true
	tracker.latestRequestId += 1
	const requestId = tracker.latestRequestId
	const isLatest = () => requestId === tracker.latestRequestId

	const { info, fetchedRange } = buildFetchPayload(visible, timezone)
	updateTrackerLoading(tracker, true, reportLoading)
	try {
		const fetched = await fetchRows(info, { signal: controller.signal })
		if (!isLatest()) return
		tracker.inFlight = undefined
		if (!Array.isArray(fetched)) {
			throw new TypeError(
				`[@ilamy/calendar] the \`${name}\` function must resolve to an array`
			)
		}
		tracker.lastFetched = fetchedRange
		reportResult?.(fetched)
		updateTrackerLoading(tracker, false, reportLoading)
	} catch (error) {
		if (!isLatest()) return
		tracker.inFlight = undefined
		updateTrackerLoading(tracker, false, reportLoading)
		surfaceFetchError(name, error, reportError)
	}
}
