import type { ReactNode } from 'react'
import type { CalendarEvent } from '@/components/types'
import type { Dayjs } from '@/lib/configs/dayjs-config'

export interface PluginDateRange {
	start: Dayjs
	end: Dayjs
}

export interface PluginMutationArgs {
	event: CalendarEvent
	updates?: Partial<CalendarEvent>
	currentEvents: CalendarEvent[]
	scope: unknown
}

/**
 * A calendar plugin contributes optional behavior and UI through generic hooks
 * named after pipeline moments and mount points, never after a feature. The
 * core stays agnostic of any specific plugin (e.g. recurrence).
 *
 * Hooks follow the Rollup/Vite execution kinds:
 * - `transformEvents` is sequential: each plugin receives the previous
 *   plugin's output, forming a transform chain.
 * - `managesEvent` is first-match: the first plugin whose managesEvent returns
 *   true owns its scoped mutations.
 * - `renderSlot` is additive: every plugin may contribute to a mount point.
 *
 * `slotName` is an opaque string identifier and `context` is opaque to the
 * core. The built-in slot names and their context shapes live in `slots.ts`,
 * which this contract does NOT depend on, so adding a slot never changes this
 * interface. A plugin narrows `context` by `slotName` at its boundary.
 *
 * `scope` is opaque to the core: the owner produces it (via the mutation-scope
 * slot) and consumes it in `applyEdit` / `applyDelete`. A plugin that provides
 * `applyEdit` / `applyDelete` should also render the mutation-scope slot so the
 * core can gather that scope before mutating.
 */
export interface IlamyPlugin {
	name: string
	transformEvents?: (
		events: CalendarEvent[],
		range: PluginDateRange
	) => CalendarEvent[]
	managesEvent?: (event: CalendarEvent) => boolean
	applyEdit?: (args: PluginMutationArgs) => CalendarEvent[]
	applyDelete?: (args: PluginMutationArgs) => CalendarEvent[]
	renderSlot?: (slotName: string, context: unknown) => ReactNode
}

export interface PluginRuntime {
	transformEvents: (
		events: CalendarEvent[],
		range: PluginDateRange
	) => CalendarEvent[]
	getEventManager: (event: CalendarEvent) => IlamyPlugin | undefined
	renderSlot: (slotName: string, context: unknown) => ReactNode[]
}
