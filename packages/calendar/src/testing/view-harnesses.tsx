import type { FC } from 'react'
import { dayView } from '@/features/calendar/components/views/day'
import { monthView } from '@/features/calendar/components/views/month'
import { ViewRenderer } from '@/features/calendar/components/views/view-renderer'
import { weekView } from '@/features/calendar/components/views/week'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'

/**
 * Test-only render harnesses for the built-in views. Production wires these
 * views through their `PluginView` spec (`dayView`/`weekView`/`monthView`) via
 * `ViewRenderer`; these wrappers exist so view tests can mount a single built-in
 * view without repeating `<ViewRenderer view={spec} />`. Internal test util:
 * NOT re-exported from the published `@ilamy/calendar/testing` entry.
 *
 * Mounting a view does not make it the active one: the provider's `view` comes
 * from `initialView`, which defaults to `'month'`. A harness whose view differs
 * from the provider's renders a grid while the rest of the calendar believes it
 * is somewhere else, and code reading `view` from context then answers for the
 * wrong one. That used to pass silently, so each harness now refuses to render
 * rather than let a test exercise a configuration it did not ask for.
 */
const useActiveViewGuard = (name: 'day' | 'week' | 'month') => {
	const { view } = useSmartCalendarContext((c) => ({ view: c.view }))
	if (view === name) {
		return
	}
	const harness = name.charAt(0).toUpperCase() + name.slice(1)
	throw new Error(
		`<${harness}View /> was mounted while the calendar's active view is '${view}'. ` +
			`Pass initialView="${name}" to CalendarProvider so the two agree.`
	)
}

export const DayView: FC = () => {
	useActiveViewGuard('day')
	return <ViewRenderer view={dayView} />
}

export const WeekView: FC = () => {
	useActiveViewGuard('week')
	return <ViewRenderer view={weekView} />
}

export const MonthView: FC = () => {
	useActiveViewGuard('month')
	return <ViewRenderer view={monthView} />
}
