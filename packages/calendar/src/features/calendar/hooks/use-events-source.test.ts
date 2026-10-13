import { describe, expect, it } from 'bun:test'
import { renderHook } from '@testing-library/react'
import type { IlamyCalendarProps } from '@/features/calendar/types'
import { useEventsSource } from './use-events-source'

const ROW = {
	id: 'a',
	title: 'A',
	start: '2025-01-15T10:00:00.000Z',
	end: '2025-01-15T11:00:00.000Z',
}

const renderSourceHook = (events: IlamyCalendarProps['events']) =>
	renderHook(({ value }) => useEventsSource(value), {
		initialProps: { value: events },
	})

describe('useEventsSource', () => {
	it('normalizes an array and has no fetcher', () => {
		const { result } = renderSourceHook([ROW])
		expect(result.current.eventsFetcher).toBeUndefined()
		expect(result.current.normalizedEvents.map((e) => e.id)).toEqual(['a'])
		expect(result.current.normalizedEvents.at(0)?.start.toISOString()).toBe(
			'2025-01-15T10:00:00.000Z'
		)
	})

	it('keeps the same rows while the array is unchanged', () => {
		const events = [ROW]
		const { result, rerender } = renderSourceHook(events)
		const first = result.current.normalizedEvents
		rerender({ value: events })
		expect(result.current.normalizedEvents).toBe(first)
	})

	it('wraps a function in a fetcher that answers normalized rows', async () => {
		const { result } = renderSourceHook(async () => [ROW])
		expect(result.current.normalizedEvents).toEqual([])
		const fetcher = result.current.eventsFetcher
		const rows = await fetcher?.(
			{} as Parameters<NonNullable<typeof fetcher>>[0],
			{ signal: new AbortController().signal }
		)
		expect(rows?.at(0)?.start.toISOString()).toBe('2025-01-15T10:00:00.000Z')
	})
})
