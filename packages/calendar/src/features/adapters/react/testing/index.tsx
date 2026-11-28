/** @jsxImportSource react */
import { type ReactNode, useMemo, useRef, useState } from 'react'
import {
	createCalendarController,
	createPluginRuntime,
	normalizeEvent,
} from '../../../../index'
import {
	CalendarContext,
	type CalendarContextSource,
} from '../calendar-context'
import type { IlamyCalendarProps } from '../types'

type CalendarTestProviderProps = Partial<IlamyCalendarProps> & {
	children: ReactNode
}

/**
 * Public test harness for plugin authors. Mounts children inside the calendar
 * context with sensible defaults so context-consuming plugin components can be
 * unit-tested without mounting the full `<IlamyCalendar>`.
 */
export const CalendarTestProvider = ({
	children,
	...overrides
}: CalendarTestProviderProps): ReactNode => {
	const overridesRef = useRef(overrides)
	overridesRef.current = overrides

	const [controller] = useState(() => {
		const runtime = createPluginRuntime(overrides.plugins)
		const zone = overrides.timezone ?? 'UTC'
		const initialEvents = Array.isArray(overrides.events)
			? overrides.events.map((ev) =>
					normalizeEvent(runtime.normalizeEvent(ev, zone), zone)
				)
			: undefined
		return createCalendarController({
			initialDate: overrides.initialDate,
			initialView: overrides.initialView ?? 'month',
			events: initialEvents,
			resources: Array.isArray(overrides.resources)
				? overrides.resources
				: undefined,
			timezone: overrides.timezone,
			locale: overrides.locale,
			firstDayOfWeek: overrides.firstDayOfWeek,
			hiddenDays: overrides.hiddenDays,
			weekends: overrides.weekends,
			pluginViews: runtime.getViews(),
			onDateChange: overrides.onDateChange,
			onViewChange: overrides.onViewChange,
		})
	})

	const source = useMemo<CalendarContextSource>(
		() => ({
			controller,
			getMounted: () => undefined,
			getOptions: () => ({ dayMaxEvents: 5, ...overridesRef.current }),
			subscribeAll: (listener) => controller.subscribe(listener),
			getSnapshotKey: () => {
				const st = controller.getState()
				return `${st.currentDate}:${st.view}:${st.timezone}:${st.locale}:${st.events.length}:${st.resources.length}`
			},
		}),
		[controller]
	)

	return (
		<CalendarContext.Provider value={source}>
			{children}
		</CalendarContext.Provider>
	)
}
