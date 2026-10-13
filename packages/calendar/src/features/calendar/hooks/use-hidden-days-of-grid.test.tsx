import { describe, expect, it } from 'bun:test'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { CalendarProvider } from '@/features/calendar/stores/calendar-context/calendar-provider'
import { useHiddenDaysOfGrid } from './use-hidden-days-of-grid'

const SATURDAY = 6

const renderGridHook = (gridType: 'day' | 'hour') => {
	const wrapper = ({ children }: { children: ReactNode }) => (
		<CalendarProvider hiddenDays={new Set([SATURDAY])}>
			{children}
		</CalendarProvider>
	)
	return renderHook(() => useHiddenDaysOfGrid(gridType), { wrapper }).result
		.current
}

describe('useHiddenDaysOfGrid', () => {
	it('gives a day grid the hidden weekdays', () => {
		expect([...(renderGridHook('day') ?? [])]).toEqual([SATURDAY])
	})

	it('gives an hour grid nothing, it never hides columns', () => {
		expect(renderGridHook('hour')).toBeUndefined()
	})
})
