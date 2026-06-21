import type { IlamyPlugin } from '@ilamy/calendar'
import { DragToCreateProvider } from './components/drag-to-create-provider'
import type { DragToCreateOptions } from './types'

/**
 * Opt-in drag-to-create plugin. On week/day views, press an empty cell and drag
 * to select a time range; releasing opens the event form preselected with that
 * range (or runs your `onSelect`). Pass to `IlamyCalendar`'s `plugins`.
 */
export const dragToCreatePlugin = (
	options: DragToCreateOptions = {}
): IlamyPlugin => ({
	name: 'drag-to-create',
	provider: ({ children }) => (
		<DragToCreateProvider options={options}>{children}</DragToCreateProvider>
	),
})
