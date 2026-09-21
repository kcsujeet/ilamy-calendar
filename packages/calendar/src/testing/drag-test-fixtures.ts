import type { CalendarEvent } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import type { DragPreviewState } from '@/contexts/drag-preview-context'

/**
 * Shared construction for the drag suites. Five test files were each building
 * their own `DragPreviewState` literal, so a field added to the contract had to
 * be threaded through seven hand-rolled copies.
 */

/** The instant the drag fixtures are anchored to. */
const DRAG_FIXTURE_DAY = dayjs('2025-01-01T00:00:00.000Z')

/**
 * A candidate placement, droppable unless told otherwise. `isDropAllowed` is
 * required on the contract on purpose, so every fixture states it rather than
 * inheriting a default that could quietly forbid a drop.
 */
export const mkDragPreview = (
	overrides: Partial<DragPreviewState> = {}
): DragPreviewState => ({
	event: {
		id: 'event-1',
		title: 'Team Sync',
		start: DRAG_FIXTURE_DAY.hour(10),
		end: DRAG_FIXTURE_DAY.hour(12),
	} as CalendarEvent,
	start: DRAG_FIXTURE_DAY.hour(10),
	end: DRAG_FIXTURE_DAY.hour(12),
	allDay: false,
	isDropAllowed: true,
	...overrides,
})
