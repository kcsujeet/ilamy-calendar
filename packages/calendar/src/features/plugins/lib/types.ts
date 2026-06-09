import type {
	CalendarEvent,
	IlamyPlugin,
	PluginDateRange,
	PluginView,
} from '@ilamy/types'
import type { ComponentType, ReactNode } from 'react'

// The plugin SDK contract (IlamyPlugin, PluginMutationArgs, PluginDateRange,
// PluginView) now lives in the shared `@ilamy/types` package so plugins depend
// on a lightweight contract, not the whole calendar. Re-exported here so the
// existing `@/features/plugins/lib/types` call sites across core stay
// unchanged. `PluginRuntime` is the core's internal aggregator and stays here.
export type {
	IlamyPlugin,
	PluginDateRange,
	PluginMutationArgs,
	PluginMutationResult,
	PluginView,
} from '@ilamy/types'

export interface PluginRuntime {
	transformEvents: (
		events: CalendarEvent[],
		range: PluginDateRange
	) => CalendarEvent[]
	getEventManager: (event: CalendarEvent) => IlamyPlugin | undefined
	renderSlot: (slotName: string, context: unknown) => ReactNode[]
	collect: (point: string, context: unknown) => unknown[]
	/** Returns all views registered across all plugins, in plugin order. */
	getViews: () => PluginView[]
	/** Returns all providers declared by plugins, in plugin order (omits plugins with no provider). */
	getProviders: () => Array<ComponentType<{ children: ReactNode }>>
}
