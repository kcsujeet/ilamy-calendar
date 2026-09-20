import { describe, expect, it } from 'bun:test'
import { isRecurringEvent } from '@ilamy/calendar-recurrence'
import type { CalendarEvent } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { RRule } from 'rrule'
import { useDragPreview } from '@/contexts/drag-preview-context'
import { IlamyCalendar } from '@/features/calendar/components/ilamy-calendar'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import { CalendarDndContext } from './calendar-dnd-context'

describe('CalendarDndContext', () => {
	const createRecurringEvent = (): CalendarEvent => ({
		id: 'recurring-event-1',
		title: 'Weekly Meeting',
		start: dayjs('2025-01-15T09:00:00.000Z'),
		end: dayjs('2025-01-15T10:00:00.000Z'),
		color: 'bg-green-500',
		allDay: false,
		rrule: {
			freq: RRule.WEEKLY,
			byweekday: [RRule.MO],
			interval: 1,
			dtstart: dayjs('2025-01-15T00:00:00.000Z').toDate(),
		},
		uid: 'recurring-event-1@calendar',
	})

	const renderWithCalendarProvider = (providerProps = {}) => {
		return render(
			<CalendarProvider
				dayMaxEvents={5}
				disableDragAndDrop={false}
				events={[]}
				firstDayOfWeek={0}
				{...providerProps}
			>
				<CalendarDndContext>
					<div data-testid="calendar-content">Test Content</div>
				</CalendarDndContext>
			</CalendarProvider>
		)
	}

	describe('Context Rendering', () => {
		it('should render with DndContext when drag and drop is enabled', () => {
			renderWithCalendarProvider({ disableDragAndDrop: false })
			expect(screen.getByTestId('calendar-content')).toBeInTheDocument()
		})

		it('should render without DndContext when drag and drop is disabled', () => {
			renderWithCalendarProvider({ disableDragAndDrop: true })
			expect(screen.getByTestId('calendar-content')).toBeInTheDocument()
		})

		it('should NOT show RecurrenceEditDialog initially', () => {
			renderWithCalendarProvider()
			const dialog = screen.queryByRole('dialog')
			expect(dialog).not.toBeInTheDocument()
		})

		it('should provide a drag preview that is null before any drag', () => {
			let previewValue: unknown = 'uninitialized'
			function TestPreviewConsumer() {
				previewValue = useDragPreview()
				return <div data-testid="preview-consumer" />
			}
			render(
				<CalendarProvider
					dayMaxEvents={5}
					disableDragAndDrop={false}
					events={[]}
					firstDayOfWeek={0}
				>
					<CalendarDndContext>
						<TestPreviewConsumer />
					</CalendarDndContext>
				</CalendarProvider>
			)
			expect(previewValue).toBeNull()
		})
	})

	describe('isRecurringEvent Utility', () => {
		it('should return false for regular events without uid or rrule', () => {
			const regularEvent: CalendarEvent = {
				id: 'regular',
				title: 'Regular',
				start: dayjs('2025-01-15T09:00:00.000Z'),
				end: dayjs('2025-01-15T10:00:00.000Z'),
				allDay: false,
			}

			expect(isRecurringEvent(regularEvent)).toBe(false)
			expect(regularEvent.uid).toBeUndefined()
			expect(regularEvent.rrule).toBeUndefined()
			expect(regularEvent.recurrenceId).toBeUndefined()
		})

		it('should return true for events with rrule', () => {
			const recurringEvent = createRecurringEvent()

			expect(isRecurringEvent(recurringEvent)).toBe(true)
			expect(recurringEvent.rrule).toBeDefined()
			expect(recurringEvent.rrule?.freq).toBe(RRule.WEEKLY)
		})

		it('should return true for events with uid', () => {
			const instance: CalendarEvent = {
				id: 'instance',
				title: 'Instance',
				start: dayjs('2025-01-15T09:00:00.000Z'),
				end: dayjs('2025-01-15T10:00:00.000Z'),
				uid: 'recurring@calendar',
				allDay: false,
			}

			expect(isRecurringEvent(instance)).toBe(true)
			expect(instance.uid).toBe('recurring@calendar')
		})

		it('should return true for events with recurrenceId', () => {
			const modifiedInstance: CalendarEvent = {
				id: 'modified',
				title: 'Modified',
				start: dayjs('2025-01-15T09:00:00.000Z'),
				end: dayjs('2025-01-15T10:00:00.000Z'),
				uid: 'recurring@calendar',
				recurrenceId: '2025-01-15T09:00:00.000Z',
				allDay: false,
			}

			expect(isRecurringEvent(modifiedInstance)).toBe(true)
			expect(modifiedInstance.recurrenceId).toBe('2025-01-15T09:00:00.000Z')
		})
	})
	/*
	 * dnd-kit numbers the ids behind `aria-describedby` from a module-level
	 * counter. A browser gets a fresh module per page load; a server does not,
	 * so the counter carries from one request to the next and the markup drifts
	 * away from what the client will produce. Rendering twice in one process is
	 * exactly what two successive requests do, so it is what this asserts.
	 */
	describe('Server Rendering', () => {
		const ssrEvent: CalendarEvent = {
			id: 'a',
			title: 'A',
			start: dayjs('2025-03-31T10:00:00.000Z'),
			end: dayjs('2025-03-31T11:00:00.000Z'),
		}

		// Draggables are what carry the attribute, so the calendar needs an
		// event on screen for this to be testing anything at all. The zone is
		// pinned so the event lands in the rendered week wherever this runs.
		const renderOnce = () =>
			renderToString(
				<IlamyCalendar
					events={[ssrEvent]}
					initialDate={dayjs('2025-03-31T00:00:00.000Z')}
					initialView="week"
					timezone="UTC"
				/>
			)

		const describedByIds = (html: string) => [
			...new Set(
				[...html.matchAll(/aria-describedby="([^"]*)"/g)].map((match) =>
					match.at(1)
				)
			),
		]

		it('emits the same describedby ids on every render', () => {
			const first = describedByIds(renderOnce())
			const second = describedByIds(renderOnce())

			expect(first).toHaveLength(1)
			expect(second).toEqual(first)
		})
	})
})
