import type { FC } from 'react'
import { dayView } from '@/features/calendar/components/views/day'
import { monthView } from '@/features/calendar/components/views/month'
import { ViewRenderer } from '@/features/calendar/components/views/view-renderer'
import { weekView } from '@/features/calendar/components/views/week'

/**
 * Test-only render harnesses for the built-in views. Production wires these
 * views through their `PluginView` spec (`dayView`/`weekView`/`monthView`) via
 * `ViewRenderer`; these wrappers exist so view tests can mount a single built-in
 * view without repeating `<ViewRenderer view={spec} />`. Internal test util:
 * NOT re-exported from the published `@ilamy/calendar/testing` entry.
 */
export const DayView: FC = () => <ViewRenderer view={dayView} />
export const WeekView: FC = () => <ViewRenderer view={weekView} />
export const MonthView: FC = () => <ViewRenderer view={monthView} />
