import { describe, expect, it } from 'bun:test'
import { resolveEventBarSurface } from './event-color.utils'

const mkEvent = (overrides: { backgroundColor?: string; color?: string }) => ({
	id: 'evt-1',
	title: 'Sample',
	start: '2026-11-18T10:00:00.000Z',
	end: '2026-11-18T11:00:00.000Z',
	...overrides,
})

describe('resolveEventBarSurface', () => {
	it('pairs dark Tailwind background classes without an explicit text color with #ffffff', () => {
		expect(
			resolveEventBarSurface(
				mkEvent({ backgroundColor: 'bg-rose-600' }),
				false,
				false
			)
		).toEqual({
			className: 'bg-rose-600',
			style: { color: '#ffffff' },
			hasCustomColor: true,
		})
	})

	it('pairs light Tailwind background classes without an explicit text color with #000000', () => {
		expect(
			resolveEventBarSurface(
				mkEvent({ backgroundColor: 'bg-amber-100' }),
				false,
				false
			)
		).toEqual({
			className: 'bg-amber-100',
			style: { color: '#000000' },
			hasCustomColor: true,
		})
	})

	it('respects explicit Tailwind text classes and embedded text-* tokens', () => {
		expect(
			resolveEventBarSurface(
				mkEvent({ backgroundColor: 'bg-rose-600', color: 'text-amber-200' }),
				false,
				false
			)
		).toEqual({
			className: 'bg-rose-600 text-amber-200',
			style: undefined,
			hasCustomColor: true,
		})

		expect(
			resolveEventBarSurface(
				mkEvent({ backgroundColor: 'bg-rose-600 text-rose-50' }),
				false,
				false
			)
		).toEqual({
			className: 'bg-rose-600 text-rose-50',
			style: undefined,
			hasCustomColor: true,
		})
	})

	it('keeps a readable fallback fill for text-only CSS color events in unstyled mode', () => {
		expect(
			resolveEventBarSurface(mkEvent({ color: '#7c3aed' }), true, false)
		).toEqual({
			className: undefined,
			style: { backgroundColor: '#dbeafe', color: '#7c3aed' },
			hasCustomColor: true,
		})
	})
})
