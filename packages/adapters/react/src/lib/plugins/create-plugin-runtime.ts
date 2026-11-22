import type { IlamyPlugin } from '@ilamy/types'
import { overlapsRange, parseDate, resolveZone } from '@ilamy/utils/temporal'
import {
	type ComponentType,
	createElement,
	Fragment,
	type ReactNode,
} from 'react'
import type { PluginRuntime } from './types'

export const createPluginRuntime = (plugins: IlamyPlugin[]): PluginRuntime => ({
	transformEvents: (events, range) => {
		const transformed = plugins.reduce(
			(acc, plugin) =>
				plugin.transformEvents ? plugin.transformEvents(acc, range) : acc,
			events
		)
		const zone = resolveZone(range.timezone)
		const rangeStart = parseDate(range.start, zone)
		const rangeEnd = parseDate(range.end, zone)
		if (!(rangeStart && rangeEnd)) {
			return transformed
		}
		return transformed.filter((event) => {
			const start = parseDate(event.start, zone)
			const end = parseDate(event.end, zone)
			if (!(start && end)) {
				return false
			}
			return overlapsRange({ start, end }, rangeStart, rangeEnd)
		})
	},

	getEventManager: (event) =>
		plugins.find((plugin) => plugin.managesEvent?.(event)),

	collect: (point, context) =>
		plugins.flatMap((plugin) => plugin.contribute?.(point, context) ?? []),

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
