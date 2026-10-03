import type { PluginView } from '@ilamy/types'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'

// The views the header should offer: all registered views, minus the ones that
// don't support resources when the calendar has resources. Shared by the
// desktop switcher and the compact view menu so the filter lives in one place.
export function useHeaderViews(): PluginView[] {
	const { getViews, resources } = useSmartCalendarContext((ctx) => ({
		getViews: ctx.getViews,
		resources: ctx.resources,
	}))
	const hasResources = Boolean(resources?.length)
	return getViews().filter((v) => !hasResources || v.supportsResources)
}
