import { afterEach, describe, expect, it, vi } from 'bun:test'
import type { CalendarEvent } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { act, renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
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

interface FetchCall {
	info: EventsFetchInfo
	signal: AbortSignal
	resolve: (events: CalendarEvent[]) => Promise<void>
	reject: (error: unknown) => Promise<void>
}

/** A fetcher whose every call stays pending until the test settles it. */
const mkFetcher = () => {
	const calls: FetchCall[] = []
	const fetcher = (info: EventsFetchInfo, options: { signal: AbortSignal }) =>
		new Promise<CalendarEvent[]>((resolve, reject) => {
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
