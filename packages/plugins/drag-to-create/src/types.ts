import type { CellInfo, OpenEventFormInput } from '@ilamy/calendar'

/** Helpers handed to a custom `onSelect` so it can act without React hooks. */
export interface DragToCreateContext {
	openEventForm: (input: OpenEventFormInput) => void
}

export interface DragToCreateOptions {
	/**
	 * Fires when a drag-selection is committed. `selection` is a `CellInfo`
	 * (`{ start, end, resource?, allDay? }`) spanning the dragged range, the same
	 * shape `onCellClick` gives consumers. Omit to get the default (open the event
	 * form preselected with the range). Provide to replace the default; call
	 * `ctx.openEventForm(...)` to still open the form, or do anything else.
	 */
	onSelect?: (selection: CellInfo, ctx: DragToCreateContext) => void
}
