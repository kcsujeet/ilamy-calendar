import { afterEach, describe, expect, it, vi } from 'bun:test'
import type { CalendarEvent, Resource } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { act, renderHook } from '@testing-library/react'
import { StrictMode, useState } from 'react'
import { mustFetchRange } from '@/features/calendar/hooks/calendar-data/use-range-fetcher'
import { useCalendarEngine } from '@/features/calendar/hooks/use-calendar-engine'
import type { EventsFetchInfo } from '@/features/calendar/types'

// Stable, like the array IlamyCalendar passes: a new one each render resyncs the store.
const NO_EVENTS: CalendarEvent[] = []
const OPENS_ON_MID_JANUARY = '2025-01-15T12:00:00.000Z'

const mkEvent = (id: string): CalendarEvent => ({
	id,
	title: id,
	start: dayjs('2025-01-15T10:00:00.000Z'),
	end: dayjs('2025-01-15T11:00:00.000Z'),
})

// Stable, like the consumer's own array.
const OWN_EVENTS: CalendarEvent[] = [mkEvent('own')]

interface FetchCall<Row = CalendarEvent> {
	info: EventsFetchInfo
	signal: AbortSignal
	resolve: (rows: Row[]) => Promise<void>
	reject: (error: unknown) => Promise<void>
}

/** A fetcher whose every call stays pending until the test settles it. */
const mkFetcher = <Row = CalendarEvent>() => {
	const calls: FetchCall<Row>[] = []
	const fetcher = (info: EventsFetchInfo, options: { signal: AbortSignal }) =>
		new Promise<Row[]>((resolve, reject) => {
			calls.push({
				info,
				signal: options.signal,
				resolve: (events) => act(async () => resolve(events)),
				reject: (error) => act(async () => reject(error)),
			})
		})
	return { fetcher, calls }
}

const day = (value: EventsFetchInfo['start']) => value.format('YYYY-MM-DD')
const ids = (rows: CalendarEvent[]) => rows.map((row) => row.id)

const renderEngine = (
	extra: Record<string, unknown> = {},
	options: { wrapper?: typeof StrictMode } = {}
) => {
	const { fetcher, calls } = mkFetcher()
	const loading = vi.fn()
	const onEventsError = vi.fn()
	const view = renderHook(
		(props: Record<string, unknown>) =>
			useCalendarEngine({
				events: NO_EVENTS,
				firstDayOfWeek: 0,
				initialDate: dayjs(OPENS_ON_MID_JANUARY),
				eventsFetcher: fetcher,
				loading,
				onEventsError,
				...props,
			}),
		{ initialProps: extra, wrapper: options.wrapper }
	)
	return { ...view, calls, loading, onEventsError }
}

describe('events fetched on demand', () => {
	afterEach(() => {
		dayjs.tz.setDefault()
	})

	it('fetches the visible month grid, padding days included, end exclusive', () => {
		const { calls } = renderEngine()

		expect(calls).toHaveLength(1)
		expect(day(calls[0].info.start)).toBe('2024-12-29')
		expect(day(calls[0].info.end)).toBe('2025-02-09')
		expect(calls[0].info.startStr).toBe(calls[0].info.start.toISOString())
		expect(calls[0].info.endStr).toBe(calls[0].info.end.toISOString())
	})

	it('shows what the fetcher returns', async () => {
		const { result, calls } = renderEngine()

		await calls[0].resolve([mkEvent('a')])

		expect(ids(result.current.rawEvents)).toEqual(['a'])
	})

	it('does not refetch inside the fetched range with lazyFetching', async () => {
		const { result, calls } = renderEngine()
		await calls[0].resolve([])

		act(() => result.current.setView('week'))

		expect(calls).toHaveLength(1)
	})

	it('refetches inside the fetched range with lazyFetching off', async () => {
		const { result, calls } = renderEngine({ lazyFetching: false })
		await calls[0].resolve([])

		act(() => result.current.setView('week'))

		expect(calls).toHaveLength(2)
	})

	it('aborts a superseded fetch and ignores its late result', async () => {
		const { result, calls } = renderEngine()

		act(() => result.current.nextPeriod())
		expect(calls).toHaveLength(2)
		expect(calls[0].signal.aborted).toBe(true)
		expect(calls[1].signal.aborted).toBe(false)

		await calls[0].resolve([mkEvent('stale')])
		expect(result.current.rawEvents).toHaveLength(0)

		await calls[1].resolve([mkEvent('fresh')])
		expect(ids(result.current.rawEvents)).toEqual(['fresh'])
	})

	it('reports loading once per cycle, however many fetches it took', async () => {
		const { result, calls, loading } = renderEngine()
		act(() => result.current.nextPeriod())
		await calls[1].resolve([])

		expect(loading.mock.calls).toEqual([[true], [false]])
	})

	it('keeps the shown events on failure, reports it, and retries the range', async () => {
		const { result, calls, onEventsError } = renderEngine()
		await calls[0].resolve([mkEvent('a')])
		act(() => result.current.nextPeriod())
		const failure = new Error('network down')

		await calls[1].reject(failure)

		expect(onEventsError).toHaveBeenCalledWith(failure)
		expect(ids(result.current.rawEvents)).toEqual(['a'])

		act(() => result.current.prevPeriod())
		expect(calls).toHaveLength(2)
		act(() => result.current.nextPeriod())
		expect(calls).toHaveLength(3)
	})

	it('logs the failure when no onEventsError is given', async () => {
		const consoleError = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined)
		const { calls } = renderEngine({ onEventsError: undefined })

		await calls[0].reject(new Error('boom'))

		expect(consoleError).toHaveBeenCalledTimes(1)
		consoleError.mockRestore()
	})

	it('refetchEvents refetches and keeps events visible until the new ones land', async () => {
		const { result, calls } = renderEngine()
		await calls[0].resolve([mkEvent('old')])

		act(() => result.current.refetchEvents())
		expect(calls).toHaveLength(2)
		expect(ids(result.current.rawEvents)).toEqual(['old'])

		await calls[1].resolve([mkEvent('new')])
		expect(ids(result.current.rawEvents)).toEqual(['new'])
	})

	it('refetches when the time zone changes, even if the range is the same instants', async () => {
		const { rerender, calls } = renderEngine({ timezone: 'UTC' })
		await calls.at(-1)?.resolve([])
		const callsBeforeChange = calls.length

		// Same offset, so the visible range is the same instants in both zones.
		rerender({ timezone: 'Etc/GMT' })

		expect(calls).toHaveLength(callsBeforeChange + 1)
	})

	it('refetches when going back into the fetched range while another fetch is pending', async () => {
		const { result, calls } = renderEngine()
		await calls[0].resolve([mkEvent('a')])
		act(() => result.current.nextPeriod())

		act(() => result.current.prevPeriod())

		expect(calls).toHaveLength(3)
		expect(calls[1].signal.aborted).toBe(true)
	})

	it('does not refetch because the fetcher changed identity', async () => {
		const { rerender, calls } = renderEngine()
		await calls[0].resolve([])
		const otherFetcher = mkFetcher().fetcher

		rerender({ eventsFetcher: otherFetcher })

		expect(calls).toHaveLength(1)
	})

	it('treats a result that is not an array as a failure and stops loading', async () => {
		const { result, calls, loading, onEventsError } = renderEngine()

		await calls[0].resolve(undefined as unknown as CalendarEvent[])

		expect(loading.mock.calls).toEqual([[true], [false]])
		expect(onEventsError).toHaveBeenCalledTimes(1)
		expect(String(onEventsError.mock.calls[0][0])).toContain('array')
		act(() => result.current.nextPeriod())
		expect(calls).toHaveLength(2)
	})

	it('refetchEvents does nothing when events is an array', () => {
		const { result, calls, loading } = renderEngine({
			eventsFetcher: undefined,
		})

		act(() => result.current.refetchEvents())

		expect(calls).toHaveLength(0)
		expect(loading).not.toHaveBeenCalled()
	})

	it('reports loading false when the calendar unmounts mid-fetch', () => {
		const { unmount, loading } = renderEngine()

		unmount()

		expect(loading.mock.calls).toEqual([[true], [false]])
	})

	it('ignores a fetch still in flight when events becomes an array', async () => {
		const { result, calls, rerender, loading } = renderEngine()

		rerender({ eventsFetcher: undefined, events: OWN_EVENTS })
		await calls[0].resolve([mkEvent('stale')])

		expect(ids(result.current.rawEvents)).toEqual(['own'])
		expect(calls[0].signal.aborted).toBe(true)
		expect(loading.mock.calls).toEqual([[true], [false]])
	})

	it('fetches again when a function replaces an array that replaced a function', async () => {
		const { calls, rerender, loading } = renderEngine()
		await calls[0].resolve([mkEvent('a')])

		rerender({ eventsFetcher: undefined, events: OWN_EVENTS })
		rerender({ events: NO_EVENTS })

		expect(calls).toHaveLength(2)
		expect(loading.mock.calls).toEqual([[true], [false], [true]])
	})

	it('still fetches after a StrictMode remount', async () => {
		const { result, calls } = renderEngine({}, { wrapper: StrictMode })
		const live = calls.at(-1)

		expect(live?.signal.aborted).toBe(false)
		await live?.resolve([mkEvent('a')])
		expect(ids(result.current.rawEvents)).toEqual(['a'])
	})

	it('never aborts a request that already settled', async () => {
		const { result, calls } = renderEngine()
		await calls[0].resolve([])

		act(() => result.current.nextPeriod())

		expect(calls[0].signal.aborted).toBe(false)
	})
})

const mkResource = (id: string): Resource => ({ id, title: id })
const resourceIds = (rows: Resource[]) => rows.map((row) => row.id)
const NO_RESOURCES: Resource[] = []

const renderResourcesEngine = (extra: Record<string, unknown> = {}) => {
	const { fetcher, calls } = mkFetcher<Resource>()
	const loading = vi.fn()
	const onResourcesError = vi.fn()
	const resourcesSet = vi.fn()
	const view = renderHook(
		(props: Record<string, unknown>) =>
			useCalendarEngine({
				events: NO_EVENTS,
				firstDayOfWeek: 0,
				initialDate: dayjs(OPENS_ON_MID_JANUARY),
				resourcesFetcher: fetcher,
				loading,
				onResourcesError,
				resourcesSet,
				...props,
			}),
		{ initialProps: extra }
	)
	return { ...view, calls, loading, onResourcesError, resourcesSet }
}

describe('resources fetched on demand', () => {
	afterEach(() => {
		dayjs.tz.setDefault()
	})

	it('keeps an array of resources as it is and reports it once', () => {
		const rooms = [mkResource('a')]
		const { result, resourcesSet, rerender } = renderResourcesEngine({
			resourcesFetcher: undefined,
			resources: rooms,
		})

		rerender({ resourcesFetcher: undefined, resources: rooms })

		expect(result.current.resources).toBe(rooms)
		expect(resourcesSet.mock.calls).toEqual([[rooms]])
	})

	it('does not report resources when there are none yet', () => {
		const { resourcesSet } = renderResourcesEngine({
			resourcesFetcher: undefined,
		})

		expect(resourcesSet).not.toHaveBeenCalled()
	})

	it('fetches once on mount with the visible month grid, end exclusive', () => {
		const { calls, result } = renderResourcesEngine()

		expect(calls).toHaveLength(1)
		expect(day(calls[0].info.start)).toBe('2024-12-29')
		expect(day(calls[0].info.end)).toBe('2025-02-09')
		expect(result.current.resources).toBeUndefined()
	})

	it('shows what the fetcher returns and reports it', async () => {
		const { result, calls, resourcesSet } = renderResourcesEngine()

		await calls[0].resolve([mkResource('a')])

		expect(resourceIds(result.current.resources ?? [])).toEqual(['a'])
		expect(resourcesSet).toHaveBeenCalledTimes(1)
		expect(resourceIds(resourcesSet.mock.calls[0][0])).toEqual(['a'])
	})

	it('does not refetch on navigation by default', async () => {
		const { result, calls } = renderResourcesEngine()
		await calls[0].resolve([])

		act(() => result.current.nextPeriod())
		act(() => result.current.nextPeriod())

		expect(calls).toHaveLength(1)
	})

	it('does not refetch on navigation while the first fetch is still pending', () => {
		const { result, calls } = renderResourcesEngine()

		act(() => result.current.nextPeriod())

		expect(calls).toHaveLength(1)
	})

	it('does not retry a failed first fetch on navigation by default', async () => {
		const { result, calls } = renderResourcesEngine({
			onResourcesError: vi.fn(),
		})
		await calls[0].reject(new Error('network down'))

		act(() => result.current.nextPeriod())
		act(() => result.current.nextPeriod())

		expect(calls).toHaveLength(1)
	})

	it('retries a failed first fetch on navigation with refetchResourcesOnNavigate', async () => {
		const { result, calls } = renderResourcesEngine({
			onResourcesError: vi.fn(),
			refetchResourcesOnNavigate: true,
		})
		await calls[0].reject(new Error('network down'))

		act(() => result.current.nextPeriod())

		expect(calls).toHaveLength(2)
	})

	it('refetchResources retries a failed first fetch', async () => {
		const { result, calls } = renderResourcesEngine({
			onResourcesError: vi.fn(),
		})
		await calls[0].reject(new Error('network down'))

		act(() => result.current.refetchResources())

		expect(calls).toHaveLength(2)
	})

	it('refetches when the view leaves the fetched range with refetchResourcesOnNavigate', async () => {
		const { result, calls } = renderResourcesEngine({
			refetchResourcesOnNavigate: true,
		})
		await calls[0].resolve([])

		act(() => result.current.setView('week'))
		expect(calls).toHaveLength(1)
		act(() => result.current.setView('month'))
		expect(calls).toHaveLength(1)

		act(() => result.current.nextPeriod())
		expect(calls).toHaveLength(2)
		expect(day(calls[1].info.end)).toBe('2025-03-09')
	})

	it('aborts a superseded fetch and ignores its late result', async () => {
		const { result, calls } = renderResourcesEngine({
			refetchResourcesOnNavigate: true,
		})

		act(() => result.current.nextPeriod())
		expect(calls).toHaveLength(2)
		expect(calls[0].signal.aborted).toBe(true)

		await calls[0].resolve([mkResource('stale')])
		expect(result.current.resources).toBeUndefined()

		await calls[1].resolve([mkResource('fresh')])
		expect(resourceIds(result.current.resources ?? [])).toEqual(['fresh'])
	})

	it('keeps the shown resources on failure and reports it', async () => {
		const { result, calls, onResourcesError } = renderResourcesEngine()
		await calls[0].resolve([mkResource('a')])
		act(() => result.current.refetchResources())
		const failure = new Error('network down')

		await calls[1].reject(failure)

		expect(onResourcesError).toHaveBeenCalledWith(failure)
		expect(resourceIds(result.current.resources ?? [])).toEqual(['a'])
	})

	it('logs the failure when no onResourcesError is given', async () => {
		const consoleError = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined)
		const { calls } = renderResourcesEngine({ onResourcesError: undefined })

		await calls[0].reject(new Error('boom'))

		expect(consoleError).toHaveBeenCalledTimes(1)
		consoleError.mockRestore()
	})

	it('treats a result that is not an array as a failure', async () => {
		const { calls, loading, onResourcesError } = renderResourcesEngine()

		await calls[0].resolve(undefined as unknown as Resource[])

		expect(loading.mock.calls).toEqual([[true], [false]])
		expect(String(onResourcesError.mock.calls[0][0])).toContain('resources')
	})

	it('refetchResources refetches and keeps resources until the new ones land', async () => {
		const { result, calls, resourcesSet } = renderResourcesEngine()
		await calls[0].resolve([mkResource('old')])

		act(() => result.current.refetchResources())
		expect(calls).toHaveLength(2)
		expect(resourceIds(result.current.resources ?? [])).toEqual(['old'])

		await calls[1].resolve([mkResource('new')])
		expect(resourceIds(result.current.resources ?? [])).toEqual(['new'])
		expect(resourcesSet).toHaveBeenCalledTimes(2)
	})

	it('refetchResources does nothing when resources is an array', () => {
		const { result, calls } = renderResourcesEngine({
			resourcesFetcher: undefined,
			resources: NO_RESOURCES,
		})

		act(() => result.current.refetchResources())

		expect(calls).toHaveLength(0)
	})

	it('does not refetch because the fetcher changed identity, nor report again on a re-render', async () => {
		const { rerender, calls, resourcesSet } = renderResourcesEngine()
		await calls[0].resolve([mkResource('a')])

		rerender({ resourcesFetcher: mkFetcher<Resource>().fetcher })

		expect(calls).toHaveLength(1)
		expect(resourcesSet).toHaveBeenCalledTimes(1)
	})

	it('reports loading once while events and resources both load', async () => {
		const events = mkFetcher()
		const { calls, loading } = renderResourcesEngine({
			eventsFetcher: events.fetcher,
		})
		expect(loading.mock.calls).toEqual([[true]])

		await events.calls[0].resolve([])
		expect(loading.mock.calls).toEqual([[true]])

		await calls[0].resolve([])
		expect(loading.mock.calls).toEqual([[true], [false]])
	})

	it('reports loading false when the calendar unmounts mid-fetch', () => {
		const { unmount, loading } = renderResourcesEngine()

		unmount()

		expect(loading.mock.calls).toEqual([[true], [false]])
	})
})

describe('resource axis presence', () => {
	const axisOf = (extra: Record<string, unknown>) =>
		renderResourcesEngine({ resourcesFetcher: undefined, ...extra }).result
			.current.hasResourceAxis

	it('is a resource axis from the first render while a resources function is pending', () => {
		const { result } = renderResourcesEngine()

		expect(result.current.hasResourceAxis).toBe(true)
		expect(result.current.resources).toBeUndefined()
	})

	it('stays a resource axis when the function fails or resolves to none', async () => {
		const { result, calls } = renderResourcesEngine()

		await calls[0].resolve([])

		expect(result.current.hasResourceAxis).toBe(true)
	})

	it('follows the array: resources make an axis, none or an empty array do not', () => {
		expect(axisOf({ resources: [mkResource('a')] })).toBe(true)
		expect(axisOf({ resources: NO_RESOURCES })).toBe(false)
		expect(axisOf({})).toBe(false)
	})
})

describe('resourcesSet reports content, not identity', () => {
	// An inline array is a new identity on every render, and a consumer that
	// stores what it is told re-renders the calendar.
	const renderStoringConsumer = (title: string, role = 'admin') => {
		let renders = 0
		const resourcesSet = vi.fn()
		const view = renderHook(
			(props: { title: string; role: string }) => {
				const [, store] = useState<Resource[]>()
				renders += 1
				return useCalendarEngine({
					events: NO_EVENTS,
					firstDayOfWeek: 0,
					initialDate: dayjs(OPENS_ON_MID_JANUARY),
					resources: [
						{ id: 'a', title: props.title, data: { role: props.role } },
					],
					resourcesSet: (set) => {
						resourcesSet(set)
						store(set)
					},
				})
			},
			{ initialProps: { title, role } }
		)
		return { ...view, resourcesSet, renders: () => renders }
	}

	it('does not loop for an inline array, and reports it once', () => {
		const { resourcesSet, renders, rerender } = renderStoringConsumer('Room')

		rerender({ title: 'Room', role: 'admin' })

		expect(resourcesSet).toHaveBeenCalledTimes(1)
		expect(renders()).toBe(3)
	})

	it('reports again when a resource field really changes', () => {
		const { resourcesSet, rerender } = renderStoringConsumer('Room')

		rerender({ title: 'Room B', role: 'admin' })

		expect(resourcesSet).toHaveBeenCalledTimes(2)
		expect(resourcesSet.mock.calls.at(-1)?.[0]).toEqual([
			{ id: 'a', title: 'Room B', data: { role: 'admin' } },
		])
	})

	it('compares an inline `data` literal by its values, and reports a changed value', () => {
		const { resourcesSet, rerender } = renderStoringConsumer('Room', 'admin')

		rerender({ title: 'Room', role: 'admin' })
		expect(resourcesSet).toHaveBeenCalledTimes(1)

		rerender({ title: 'Room', role: 'guest' })
		expect(resourcesSet).toHaveBeenCalledTimes(2)
	})

	it('reports again when a refetch adds a resource', async () => {
		const { result, calls, resourcesSet } = renderResourcesEngine()
		await calls[0].resolve([mkResource('a')])

		act(() => result.current.refetchResources())
		await calls[1].resolve([mkResource('a'), mkResource('b')])

		expect(resourcesSet).toHaveBeenCalledTimes(2)
	})

	it('does not report a refetch that returned the same content', async () => {
		const { result, calls, resourcesSet } = renderResourcesEngine()
		await calls[0].resolve([mkResource('a')])

		act(() => result.current.refetchResources())
		await calls[1].resolve([mkResource('a')])

		expect(resourcesSet).toHaveBeenCalledTimes(1)
	})
})

describe('mustFetchRange', () => {
	const fetched = { startMs: 100, endMs: 200, timezone: 'UTC' }
	const decide = (overrides: Partial<Parameters<typeof mustFetchRange>[0]>) =>
		mustFetchRange({
			fetched,
			visibleStartMs: 120,
			visibleEndMs: 180,
			timezone: 'UTC',
			hasAttempted: true,
			isFetchInFlight: false,
			lazyFetching: true,
			followsRange: true,
			...overrides,
		})

	it('fetches when nothing was fetched yet', () => {
		expect(decide({ fetched: undefined, hasAttempted: false })).toBe(true)
	})

	it('does not fetch inside the fetched range', () => {
		expect(decide({})).toBe(false)
	})

	it('fetches when the range leaves the fetched one', () => {
		expect(decide({ visibleStartMs: 90 })).toBe(true)
		expect(decide({ visibleEndMs: 210 })).toBe(true)
	})

	it('fetches when the zone changes, a fetch is in flight, or lazyFetching is off', () => {
		expect(decide({ timezone: 'Asia/Tokyo' })).toBe(true)
		expect(decide({ isFetchInFlight: true })).toBe(true)
		expect(decide({ lazyFetching: false })).toBe(true)
	})

	it('fetches range-independent data once, and never again because of the range', () => {
		expect(
			decide({ followsRange: false, fetched: undefined, hasAttempted: false })
		).toBe(true)
		expect(decide({ followsRange: false, visibleStartMs: 90 })).toBe(false)
	})

	// Was "fetched: undefined -> true", which could not tell never tried from
	// tried and failed. A failure records no range, so the retry belongs to
	// refetch(); FullCalendar's resource-function docs call the function once
	// and again only with refetchResourcesOnNavigate.
	it('does not retry range-independent data that was attempted and failed', () => {
		expect(
			decide({ followsRange: false, fetched: undefined, hasAttempted: true })
		).toBe(false)
	})

	it('retries a failed range for range-following data', () => {
		expect(decide({ fetched: undefined, hasAttempted: true })).toBe(true)
	})
})
