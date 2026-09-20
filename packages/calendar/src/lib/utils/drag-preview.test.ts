import { describe, expect, test } from 'bun:test'
import type { CalendarEvent } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import type { DragPreviewState } from '@/contexts/drag-preview-context'
import { getDragPreviewEvent, isPreviewOnTarget } from './drag-preview'

const at = (hour: number, minute = 0) =>
	dayjs('2025-01-01T00:00:00.000Z').hour(hour).minute(minute)

const mkPreview = (
	overrides: Partial<DragPreviewState> = {}
): DragPreviewState => ({
	event: {
		id: 'event-1',
		title: 'Team Sync',
		start: at(9),
		end: at(10),
	} as CalendarEvent,
	start: at(10),
	end: at(12),
	allDay: false,
	...overrides,
})

// The grid range the preview is tested against: `rangeEnd` is the LAST instant
// shown, matching `overlapsRange`'s inclusive convention.
const wholeDay = {
	rangeStart: at(0),
	rangeEnd: at(23, 59).second(59).millisecond(999),
}

describe('isPreviewOnTarget', () => {
	test('returns false when there is no drag in progress', () => {
		expect(isPreviewOnTarget(null, wholeDay)).toBe(false)
	})

	test('returns true when the preview overlaps the target range', () => {
		expect(isPreviewOnTarget(mkPreview(), wholeDay)).toBe(true)
	})

	test('returns false when the preview ends exactly at the range start', () => {
		const preview = mkPreview({ start: at(8), end: at(10) })
		const range = { rangeStart: at(10), rangeEnd: at(11) }

		expect(isPreviewOnTarget(preview, range)).toBe(false)
	})

	test('returns false when the preview starts after the range ends', () => {
		const preview = mkPreview({ start: at(14), end: at(15) })
		const range = { rangeStart: at(10), rangeEnd: at(12) }

		expect(isPreviewOnTarget(preview, range)).toBe(false)
	})

	test('returns false when an all-day target is offered a timed preview', () => {
		const target = { ...wholeDay, allDay: true }

		expect(isPreviewOnTarget(mkPreview({ allDay: false }), target)).toBe(false)
	})

	test('returns true when an all-day target is offered an all-day preview', () => {
		const preview = mkPreview({ allDay: true })
		const target = { ...wholeDay, allDay: true }

		expect(isPreviewOnTarget(preview, target)).toBe(true)
	})

	test('returns true when a timed target is offered an all-day preview', () => {
		const preview = mkPreview({ allDay: true })

		expect(isPreviewOnTarget(preview, { ...wholeDay, allDay: false })).toBe(
			true
		)
	})

	test('returns false when the preview belongs to another resource', () => {
		const preview = mkPreview({ resourceId: 'room-a' })
		const target = { ...wholeDay, resourceId: 'room-b' }

		expect(isPreviewOnTarget(preview, target)).toBe(false)
	})

	test('returns true when the preview targets this resource', () => {
		const preview = mkPreview({ resourceId: 'room-a' })
		const target = { ...wholeDay, resourceId: 'room-a' }

		expect(isPreviewOnTarget(preview, target)).toBe(true)
	})

	test('returns true on a calendar with no resource axis', () => {
		const preview = mkPreview({ resourceId: undefined })

		expect(isPreviewOnTarget(preview, wholeDay)).toBe(true)
	})
})

describe('getDragPreviewEvent', () => {
	test('returns null when the preview is not on the target', () => {
		const preview = mkPreview({ start: at(14), end: at(15) })
		const range = { rangeStart: at(10), rangeEnd: at(12) }

		expect(getDragPreviewEvent(preview, range)).toBeNull()
	})

	test('returns the dragged event moved to the candidate times', () => {
		const previewEvent = getDragPreviewEvent(mkPreview(), wholeDay)

		expect(previewEvent?.id).toBe('event-1')
		expect(previewEvent?.title).toBe('Team Sync')
		expect(previewEvent?.start.toISOString()).toBe('2025-01-01T10:00:00.000Z')
		expect(previewEvent?.end.toISOString()).toBe('2025-01-01T12:00:00.000Z')
	})

	test('carries the candidate all-day flag, not the original one', () => {
		const preview = mkPreview({ allDay: true })

		expect(getDragPreviewEvent(preview, wholeDay)?.allDay).toBe(true)
	})
})
