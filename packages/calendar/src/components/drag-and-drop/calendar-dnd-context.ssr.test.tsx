import { describe, expect, test } from 'bun:test'
import type { CalendarEvent } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { renderToString } from 'react-dom/server'
import { IlamyCalendar } from '@/features/calendar/components/ilamy-calendar'

/*
 * dnd-kit numbers the ids behind `aria-describedby` from a module-level
 * counter. A browser gets a fresh module per page load; a server does not, so
 * the counter carries from one request to the next and the markup drifts away
 * from what the client will produce. Rendering twice in one process is exactly
 * what two successive requests do, so it is what this asserts.
 */
describe('CalendarDndContext server rendering', () => {
	const events: CalendarEvent[] = [
		{
			id: 'a',
			title: 'A',
			start: dayjs('2025-03-31T10:00:00.000Z'),
			end: dayjs('2025-03-31T11:00:00.000Z'),
		},
	]

	const renderOnce = () =>
		renderToString(
			<IlamyCalendar
				events={events}
				initialDate={dayjs('2025-03-31')}
				initialView="week"
			/>
		)

	// Draggables are what carry the attribute, so the calendar needs an event
	// on screen for this to be testing anything at all.
	const describedByIds = (html: string) => [
		...new Set(
			[...html.matchAll(/aria-describedby="([^"]*)"/g)].map((match) =>
				match.at(1)
			)
		),
	]

	test('emits the same describedby ids on every render', () => {
		const first = describedByIds(renderOnce())
		const second = describedByIds(renderOnce())
		const third = describedByIds(renderOnce())

		expect(first.length).toBeGreaterThan(0)
		expect(second).toEqual(first)
		expect(third).toEqual(first)
	})
})
