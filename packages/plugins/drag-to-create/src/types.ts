import type { CellInfo, OpenEventFormInput } from '@ilamy/calendar'

export interface DragToCreateOptions {
	/**
	 * Fires when a drag-selection is committed. `selection` is a `CellInfo`
	 * (`{ start, end, resource?, allDay? }`) spanning the dragged range, the same
	 * shape `onCellClick` gives consumers. `openEventForm` is the calendar's own
	 * form opener. Omit to get the default (open the form preselected with the
	 * range). Provide to replace the default; call `openEventForm(...)` to still
	 * open the form, or do anything else.
	 */
	onSelect?: (
		selection: CellInfo,
		openEventForm: (input: OpenEventFormInput) => void
	) => void
}
