import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { renderHook } from '@testing-library/react'
import {
	useInvalidSlotPropsWarning,
	useOrientationWarning,
} from './use-calendar-prop-warnings'

describe('calendar prop warnings', () => {
	let warn: ReturnType<typeof spyOn<Console, 'warn'>>

	beforeEach(() => {
		warn = spyOn(console, 'warn').mockImplementation(() => {})
	})

	afterEach(() => {
		warn.mockRestore()
	})

	describe('useOrientationWarning', () => {
		it('warns when orientation is given without resources', () => {
			renderHook(() => useOrientationWarning('vertical', false))
			expect(warn).toHaveBeenCalledTimes(1)
			expect(warn).toHaveBeenCalledWith(
				'[@ilamy/calendar] `orientation` was provided without `resources` — it only applies when the calendar has resources, so it is ignored.'
			)
		})

		it('is silent with resources', () => {
			renderHook(() => useOrientationWarning('vertical', true))
			expect(warn).not.toHaveBeenCalled()
		})

		it('is silent without orientation', () => {
			renderHook(() => useOrientationWarning(undefined, false))
			expect(warn).not.toHaveBeenCalled()
		})
	})

	describe('useInvalidSlotPropsWarning', () => {
		it('names the unusable props', () => {
			renderHook(() => useInvalidSlotPropsWarning('nonsense', '18:00'))
			expect(warn).toHaveBeenCalledTimes(1)
			expect(warn.mock.calls.at(0)?.at(0)).toContain(
				'`slotMinTime, slotMaxTime`'
			)
		})

		it('is silent for a usable range', () => {
			renderHook(() => useInvalidSlotPropsWarning('08:00', '18:00'))
			expect(warn).not.toHaveBeenCalled()
		})
	})
})
