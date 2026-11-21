import type { DateRange } from '@ilamy/types'
import { add, parseDate, toOffsetIso } from '@ilamy/utils/temporal'
import { useEffect, useRef } from 'react'
import type { EventsFetchInfo } from '@/features/calendar/types'
import { useLatestHandler } from '@/hooks/use-latest-handler'

export type RangeFetcher<Row> = (
	info: EventsFetchInfo,
	options: { signal: AbortSignal }
) => Promise<Row[]>

interface RangeFetcherParams<Row> {
	name: 'events' | 'resources'
	fetcher?: RangeFetcher<Row>
	followsRange?: boolean
	getCurrentViewRange: () => DateRange
	timezone?: string
	lazyFetching?: boolean
	loading?: (isLoading: boolean) => void
	onError?: (error: unknown) => void
	onResult: (rows: Row[]) => void
}

const doNothing = () => undefined

interface FetchedRange {
	startMs: number
	endMs: number
	timezone?: string
}

interface FetchDecisionInput {
	fetched?: FetchedRange
	visibleStartMs: number
	visibleEndMs: number
	timezone?: string
	hasAttempted: boolean
	isFetchInFlight: boolean
	lazyFetching: boolean
	followsRange: boolean
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

const surfaceFetchError = (
	name: 'events' | 'resources',
	error: unknown,
	reportError?: (error: unknown) => void
): void => {
	if (reportError) {
		reportError(error)
		return
	}
	// biome-ignore lint/suspicious/noConsole: the only place a failed fetch can surface without an error handler
	console.error(`[@ilamy/calendar] ${name} fetch failed`, error)
}

interface FetchTracker {
	latestRequestId: number
	inFlight?: AbortController
	isLoading: boolean
	lastFetched?: FetchedRange
	hasAttempted: boolean
}

const createFetchTracker = (): FetchTracker => ({
	latestRequestId: 0,
	inFlight: undefined,
	isLoading: false,
	lastFetched: undefined,
	hasAttempted: false,
})

const updateTrackerLoading = (
	tracker: FetchTracker,
	next: boolean,
	reportLoading?: (isLoading: boolean) => void
): void => {
	if (tracker.isLoading !== next) {
		tracker.isLoading = next
		reportLoading?.(next)
	}
}

const resetFetchTracker = (
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

interface ExecuteRangeFetchInput<Row> {
	name: 'events' | 'resources'
	tracker: FetchTracker
	fetchRows: (
		info: EventsFetchInfo,
		options: { signal: AbortSignal }
	) => Promise<Row[]> | undefined
	visible: DateRange
	timezone: string | undefined
	reportLoading?: (isLoading: boolean) => void
	reportError?: (error: unknown) => void
	reportResult?: (rows: Row[]) => void
}

const executeRangeFetch = async <Row>({
	name,
	tracker,
	fetchRows,
	visible,
	timezone,
	reportLoading,
	reportError,
	reportResult,
}: ExecuteRangeFetchInput<Row>): Promise<void> => {
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
		if (!isLatest()) {
			return
		}
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
		if (!isLatest()) {
			return
		}
		tracker.inFlight = undefined
		updateTrackerLoading(tracker, false, reportLoading)
		surfaceFetchError(name, error, reportError)
	}
}

export const useRangeFetcher = <Row>({
	name,
	fetcher,
	followsRange = true,
	getCurrentViewRange,
	timezone,
	lazyFetching = true,
	loading,
	onError,
	onResult,
}: RangeFetcherParams<Row>): { refetch: () => void } => {
	const fetchRows = useLatestHandler(fetcher)
	const reportLoading = useLatestHandler(loading)
	const reportError = useLatestHandler(onError)
	const reportResult = useLatestHandler(onResult)
	const trackerRef = useRef<FetchTracker>(createFetchTracker())

	const visibleNow = getCurrentViewRange()
	const rangeStartMs =
		parseDate(visibleNow.start, timezone)?.epochMilliseconds ?? 0
	const rangeEndMs = parseDate(visibleNow.end, timezone)?.epochMilliseconds ?? 0

	const refetch = useLatestHandler(() => {
		if (!fetchRows) {
			return
		}
		void executeRangeFetch({
			name,
			tracker: trackerRef.current,
			fetchRows,
			visible: getCurrentViewRange(),
			timezone,
			reportLoading,
			reportError,
			reportResult,
		})
	})

	const cancelFetching = useLatestHandler(() => {
		resetFetchTracker(trackerRef.current, reportLoading)
	})

	const hasFetcher = Boolean(fetchRows)
	useEffect(() => {
		if (!hasFetcher) {
			cancelFetching?.()
			return
		}
		const tracker = trackerRef.current
		const mustFetch = mustFetchRange({
			fetched: tracker.lastFetched,
			visibleStartMs: rangeStartMs,
			visibleEndMs: rangeEndMs,
			timezone,
			hasAttempted: tracker.hasAttempted,
			isFetchInFlight: tracker.isLoading,
			lazyFetching,
			followsRange,
		})
		if (mustFetch) {
			refetch?.()
		}
	}, [
		hasFetcher,
		rangeStartMs,
		rangeEndMs,
		timezone,
		lazyFetching,
		followsRange,
		refetch,
		cancelFetching,
	])

	useEffect(
		() => () => {
			cancelFetching?.()
		},
		[cancelFetching]
	)

	return { refetch: refetch ?? doNothing }
}
