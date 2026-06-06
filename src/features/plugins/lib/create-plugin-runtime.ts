import {
	type ComponentType,
	createElement,
	Fragment,
	type ReactNode,
} from 'react'
import { eventOverlapsRange } from '@/lib/utils/event-utils'
import type { IlamyPlugin, PluginRuntime } from './types'

export const createPluginRuntime = (plugins: IlamyPlugin[]): PluginRuntime => ({
	// Sequential transform chain, then the core applies the range-overlap filter
	// (the baseline every view expects) so plugins only worry about producing
	// events, not range-trimming.
	transformEvents: (events, range) => {
		const transformed = plugins.reduce(
			(acc, plugin) =>
				plugin.transformEvents ? plugin.transformEvents(acc, range) : acc,
			events
		)
		return transformed.filter((event) =>
			eventOverlapsRange(event, range.start, range.end)
		)
	},

	getEventManager: (event) =>
		plugins.find((plugin) => plugin.managesEvent?.(event)),

	collect: (point, context) =>
		plugins.flatMap((plugin) => plugin.contribute?.(point, context) ?? []),

	// Every plugin may contribute to a slot. Each node is keyed by plugin name
	// so consumers can render the returned array directly.
	renderSlot: (slotName, context) => {
		const nodes: ReactNode[] = []
		for (const plugin of plugins) {
			const node = plugin.renderSlot?.(slotName, context)
			const isPresent = node !== null && node !== undefined
			if (isPresent) {
				nodes.push(createElement(Fragment, { key: plugin.name }, node))
			}
		}
		return nodes
	},

	getViews: () => plugins.flatMap((plugin) => plugin.views ?? []),

	getProviders: () =>
		plugins
			.map((plugin) => plugin.provider)
			.filter((p): p is ComponentType<{ children: ReactNode }> => Boolean(p)),
})
