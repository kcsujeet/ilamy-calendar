import type { ReactNode } from 'react'
import {
	CalendarProvider,
	type CalendarProviderProps,
} from '@/features/calendar/contexts/calendar-context/provider'

type CalendarTestProviderProps = Partial<CalendarProviderProps> & {
	children: ReactNode
}

/**
 * Public test harness for plugin authors. Mounts children inside the calendar
 * context with sensible defaults so context-consuming plugin components (slot
 * sections, plugin views) can be unit-tested in isolation, without the full
 * `<IlamyCalendar>`. Override any provider prop as needed.
 *
 * @example
 * render(
 *   <CalendarTestProvider>
 *     <MyPluginFormSection event={event} onChange={onChange} />
 *   </CalendarTestProvider>
 * )
 */
export const CalendarTestProvider = ({
	children,
	...overrides
}: CalendarTestProviderProps): ReactNode => (
	<CalendarProvider dayMaxEvents={5} {...overrides}>
		{children}
	</CalendarProvider>
)
