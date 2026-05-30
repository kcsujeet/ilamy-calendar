import type React from 'react'
import type { CalendarEvent } from '@/components/types'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { eventOverlapsRange } from '@/lib/utils/event-utils'

export interface PluginDateRange {
	start: Dayjs
	end: Dayjs
}

export interface PluginEditArgs {
	event: CalendarEvent
	updates: Partial<CalendarEvent>
	currentEvents: CalendarEvent[]
	scope: unknown
}

export interface PluginDeleteArgs {
	event: CalendarEvent
	currentEvents: CalendarEvent[]
	scope: unknown
}

export interface PluginEditDialogProps {
	event: CalendarEvent
	operation: 'edit' | 'delete'
	onConfirm: (scope: unknown) => void
	onCancel: () => void
}

export interface PluginFormSectionProps {
	event: CalendarEvent
	onChange: (updates: Partial<CalendarEvent>) => void
}

/**
 * A calendar plugin contributes optional behavior and UI. The core defines this
 * contract and stays agnostic of any specific plugin (e.g. recurrence). `scope`
 * is opaque to the core: a plugin's `renderEditDialog` produces it and its
 * `applyEdit` / `applyDelete` consume it.
 */
export interface IlamyPlugin {
	name: string
	expandEvent?: (
		event: CalendarEvent,
		range: PluginDateRange,
		allEvents: CalendarEvent[]
	) => CalendarEvent[] | null
	ownsEvent?: (event: CalendarEvent) => boolean
	applyEdit?: (args: PluginEditArgs) => CalendarEvent[]
	applyDelete?: (args: PluginDeleteArgs) => CalendarEvent[]
	renderEditDialog?: (props: PluginEditDialogProps) => React.ReactNode
	renderFormSection?: (props: PluginFormSectionProps) => React.ReactNode
}

export interface PluginRuntime {
	expandEvents: (
		events: CalendarEvent[],
		range: PluginDateRange
	) => CalendarEvent[]
	getOwner: (event: CalendarEvent) => IlamyPlugin | undefined
	getFormSectionPlugins: () => IlamyPlugin[]
}

const expandOne = (
	plugins: IlamyPlugin[],
	event: CalendarEvent,
	range: PluginDateRange,
	allEvents: CalendarEvent[]
): CalendarEvent[] => {
	for (const plugin of plugins) {
		const expanded = plugin.expandEvent?.(event, range, allEvents)
		if (expanded) {
			return expanded
		}
	}
	return eventOverlapsRange(event, range.start, range.end) ? [event] : []
}

export const createPluginRuntime = (plugins: IlamyPlugin[]): PluginRuntime => ({
	expandEvents: (events, range) =>
		events.flatMap((event) => expandOne(plugins, event, range, events)),
	getOwner: (event) => plugins.find((plugin) => plugin.ownsEvent?.(event)),
	getFormSectionPlugins: () =>
		plugins.filter((plugin) => Boolean(plugin.renderFormSection)),
})
