import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { RRule } from 'rrule'
import type { CalendarEvent } from '@/components/types'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import { isRecurringEvent } from '@/features/recurrence/utils/recurrence-handler'
import dayjs from '@/lib/configs/dayjs-config'
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
				events={[]}
				dayMaxEvents={5}
				firstDayOfWeek={0}
				disableDragAndDrop={false}
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
})
