import type { CalendarEvent } from '@ilamy/types'
import { parseDate, toOffsetIso, type ZonedDate } from '@ilamy/utils/temporal'
import type { DragPreviewState } from '@/stores/drag-preview-context'

const mustParseUtc = (iso: string): ZonedDate => {
	const parsed = parseDate(iso, 'UTC')
	if (!parsed) {
		throw new Error(`Invalid drag fixture date: ${iso}`)
	}
	return parsed
}

const DRAG_FIXTURE_START = mustParseUtc('2025-01-01T10:00:00.000Z')
const DRAG_FIXTURE_END = mustParseUtc('2025-01-01T12:00:00.000Z')

export const mkDragPreview = (
	overrides: Partial<DragPreviewState> = {}
): DragPreviewState => ({
	event: {
		id: 'event-1',
		title: 'Team Sync',
		start: toOffsetIso(DRAG_FIXTURE_START),
		end: toOffsetIso(DRAG_FIXTURE_END),
	} as CalendarEvent,
	start: DRAG_FIXTURE_START,
	end: DRAG_FIXTURE_END,
	allDay: false,
	isDropAllowed: true,
	...overrides,
})
