import { describe, expect, it } from 'bun:test'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { CalendarTestProvider } from '@/testing'
import { useCalendarDrag } from './use-calendar-drag'

const wrapper = ({ children }: { children: ReactNode }) => (
	<CalendarTestProvider>{children}</CalendarTestProvider>
)

/** The sensors the hook hands dnd-kit, before and after a re-render. */
const renderSensorsAcrossRerender = () => {
	const { result, rerender } = renderHook(() => useCalendarDrag(() => {}), {
		wrapper,
	})
	const before = result.current.sensors
	rerender()
	return { before, after: result.current.sensors }
}

describe('useCalendarDrag', () => {
	it('keeps one sensor list across re-renders', () => {
		// dnd-kit's useSensor memoizes on the options object; a new list on
		// every render rebuilt its context and re-rendered every cell.
		const { before, after } = renderSensorsAcrossRerender()
		expect(after).toBe(before)
	})
})
