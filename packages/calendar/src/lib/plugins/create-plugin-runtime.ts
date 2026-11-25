import type {
	CalendarEvent,
	CalendarEventInput,
} from '../../types/calendar.types'
import type {
	CalendarPlugin,
	CalendarPluginView,
	PluginDragToCreateConfig,
	PluginRuntime,
} from '../../types/plugin.types'
import { overlapsRange, parseDate, resolveZone } from '../../utils/temporal'

const EMPTY_PLUGINS: readonly CalendarPlugin[] = []

/**
 * Aggregates framework-agnostic calendar plugins into a single runtime used by
 * the headless controller, DOM renderer, and framework adapters.
 */
export const createPluginRuntime = (
	plugins: readonly CalendarPlugin[] = EMPTY_PLUGINS
): PluginRuntime => {
	const views: CalendarPluginView[] = plugins.flatMap(
		(plugin) => plugin.views ?? []
	)

	return {
		plugins,

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

		normalizeEvent: (event: CalendarEventInput, timezone: string) =>
			plugins.reduce(
				(acc, plugin) =>
					plugin.normalizeEvent ? plugin.normalizeEvent(acc, timezone) : acc,
				event
			),

		getEventManager: (event: CalendarEvent) =>
			plugins.find((plugin) => plugin.managesEvent?.(event)),

		collect: (point: string, context: unknown) =>
			plugins.flatMap((plugin) => plugin.contribute?.(point, context) ?? []),

		getViews: () => views,

		getView: (name: string) => views.find((view) => view.name === name),

		getDragToCreate: (): PluginDragToCreateConfig | undefined => {
			for (const plugin of plugins) {
				if (plugin.dragToCreate) {
					return plugin.dragToCreate
				}
			}
			return undefined
		},
	}
}
