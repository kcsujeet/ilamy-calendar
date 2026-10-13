import { afterEach, describe, expect, it, spyOn } from 'bun:test'
import { renderHook } from '@testing-library/react'
import type { IlamyCalendarProps } from '@/features/calendar/types'
import { useHiddenDaysToDraw } from './use-hidden-days-to-draw'

type Props = {
	hiddenDays?: IlamyCalendarProps['hiddenDays']
	weekends?: boolean
}

const renderHiddenDaysHook = (initialProps: Props) =>
	renderHook(
		({ hiddenDays, weekends }: Props) =>
			useHiddenDaysToDraw(hiddenDays, weekends),
		{ initialProps }
	)

const EVERY_DAY = [
	'sunday',
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
] as const

describe('useHiddenDaysToDraw', () => {
	afterEach(() => {
		spyOn(console, 'warn').mockRestore()
	})

	it('resolves nothing when no day is hidden', () => {
		const { result } = renderHiddenDaysHook({})
		expect(result.current).toBeUndefined()
	})

	it('resolves hiddenDays and weekends:false together as weekday numbers', () => {
		const { result } = renderHiddenDaysHook({
			hiddenDays: ['wednesday'],
			weekends: false,
		})
		expect([...(result.current ?? [])].sort()).toEqual([0, 3, 6])
	})

	it('keeps the same Set for an inline array with the same values', () => {
		const { result, rerender } = renderHiddenDaysHook({
			hiddenDays: ['saturday'],
		})
		const first = result.current
		rerender({ hiddenDays: ['saturday'] })
		expect(result.current).toBe(first)
	})

	it('drops the request and warns once when every day is hidden', () => {
		const warn = spyOn(console, 'warn').mockImplementation(() => {})
		const { result } = renderHiddenDaysHook({ hiddenDays: [...EVERY_DAY] })
		expect(result.current).toBeUndefined()
		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn).toHaveBeenCalledWith(
			'[@ilamy/calendar] `hiddenDays` and `weekends` together hide every day of the week, so they are ignored.'
		)
	})
})
