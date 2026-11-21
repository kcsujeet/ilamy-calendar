import { describe, expect, it } from 'bun:test'
import { isRecurringEvent } from '@ilamy/calendar-recurrence'
import type { CalendarEvent } from '@ilamy/types'
import { cleanup, render, screen } from '@testing-library/react'
import type React from 'react'
import { renderToString } from 'react-dom/server'
import { RRule } from 'rrule'
import { CalendarProvider } from '@/app/calendar-provider'
import { IlamyCalendar } from '@/app/ilamy-calendar'
import { useDragPreview } from '@/stores/drag-preview-context'
import { CalendarDndContext } from './calendar-dnd-context'

describe('CalendarDndContext', () => {
	const createRecurringEvent = (): CalendarEvent => ({
		id: 'recurring-event-1',
		title: 'Weekly Meeting',
		start: '2025-01-15T09:00:00+00:00',
		end: '2025-01-15T10:00:00+00:00',
		color: 'bg-green-500',
		allDay: false,
		rrule: {
			freq: RRule.WEEKLY,
			byweekday: [RRule.MO],
			interval: 1,
			dtstart: new Date('2025-01-15T00:00:00.000Z'),
		},
		uid: 'recurring-event-1@calendar',
	})

	const renderWithCalendarProvider = (providerProps = {}) => {
		cleanup()
		return render(
			<CalendarProvider
				dayMaxEvents={5}
				editable={true}
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
		it('should render children', () => {
			renderWithCalendarProvider()
			expect(screen.getByTestId('calendar-content')).toBeInTheDocument()
		})

		it('should NOT show RecurrenceEditDialog initially', () => {
			renderWithCalendarProvider()
			const dialog = screen.queryByRole('dialog')
			expect(dialog).not.toBeInTheDocument()
		})

		it('should provide a drag preview that is null before any drag', () => {
			cleanup()
			let previewValue: unknown = 'uninitialized'
			function TestPreviewConsumer() {
				previewValue = useDragPreview()
				return <div data-testid="preview-consumer" />
			}
			render(
				<CalendarProvider
					dayMaxEvents={5}
					editable={true}
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

	/*
	 * dnd-kit puts a live region in the page, and drag instructions on every bar, for
	 * as long as its context is mounted. A calendar where nothing can move must
	 * not carry them. In v4.0 (D8), `editable` defaults to `false`.
	 */
	describe('Mounting', () => {
		const movableEvent: CalendarEvent = {
			id: 'a',
			title: 'A',
			start: '2025-03-12T10:00:00+00:00',
			end: '2025-03-12T11:00:00+00:00',
		}

		const renderCalendar = (
			props: Partial<React.ComponentProps<typeof IlamyCalendar>>,
			events: CalendarEvent[] = [movableEvent]
		) => {
			cleanup()
			const { container } = render(
				<IlamyCalendar
					events={events}
					initialDate="2025-03-12T00:00:00Z"
					initialView="week"
					timezone="UTC"
					{...props}
				/>
			)
			return {
				hasLiveRegion: document.querySelector('[id*="DndLiveRegion"]') !== null,
				describedByCount:
					container.querySelectorAll('[aria-describedby]').length,
			}
		}

		it('mounts nothing by default because editable defaults to false (D8)', () => {
			const page = renderCalendar({})

			expect(page.hasLiveRegion).toBe(false)
			expect(page.describedByCount).toBe(0)
		})

		it('mounts when editable is true', () => {
			const page = renderCalendar({ editable: true })

			expect(page.hasLiveRegion).toBe(true)
		})

		// Only the Mouse and Touch sensors are registered, so dnd-kit's default
		// "press the space bar to pick up" text would promise a keyboard drag that
		// does nothing (WCAG 4.1.2). Keyboard moving is not offered.
		it('does not describe a keyboard drag the bars cannot do', () => {
			renderCalendar({ editable: true })
			const describedBars = document.querySelectorAll('[aria-describedby]')
			const descriptions = [...describedBars].map((bar) => {
				const descriptionId = bar.getAttribute('aria-describedby') ?? ''
				return document.getElementById(descriptionId)?.textContent?.trim()
			})

			expect(descriptions).toEqual([''])
		})

		it('mounts nothing when the calendar is not editable and no event opts in', () => {
			const page = renderCalendar({ editable: false })

			expect(page.hasLiveRegion).toBe(false)
			expect(page.describedByCount).toBe(0)
		})

		it('mounts when one event opts in under a non-editable calendar', () => {
			const optedIn = { ...movableEvent, startEditable: true }
			const page = renderCalendar({ editable: false }, [optedIn])

			expect(page.hasLiveRegion).toBe(true)
		})

		it('mounts when eventStartEditable re-enables moving under editable=false', () => {
			const page = renderCalendar({
				editable: false,
				eventStartEditable: true,
			})

			expect(page.hasLiveRegion).toBe(true)
		})

		it('mounts when events can only be resized', () => {
			const page = renderCalendar({
				editable: false,
				eventDurationEditable: true,
			})

			expect(page.hasLiveRegion).toBe(true)
		})

		it('mounts when events can only be moved', () => {
			const page = renderCalendar({
				editable: true,
				eventDurationEditable: false,
			})

			expect(page.hasLiveRegion).toBe(true)
		})

		it('mounts when one event opts in to resizing under a non-editable calendar', () => {
			const optedIn = { ...movableEvent, durationEditable: true }
			const page = renderCalendar({ editable: false }, [optedIn])

			expect(page.hasLiveRegion).toBe(true)
		})

		it('marks only the movable bar when one event is locked', () => {
			const locked = { ...movableEvent, id: 'b', title: 'B', editable: false }
			const page = renderCalendar({ editable: true }, [movableEvent, locked])

			expect(page.describedByCount).toBe(1)
		})
	})

	describe('isRecurringEvent Utility', () => {
		it('should return false for regular events without uid or rrule', () => {
			const regularEvent: CalendarEvent = {
				id: 'regular',
				title: 'Regular',
				start: '2025-01-15T09:00:00+00:00',
				end: '2025-01-15T10:00:00+00:00',
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
				start: '2025-01-15T09:00:00+00:00',
				end: '2025-01-15T10:00:00+00:00',
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
				start: '2025-01-15T09:00:00+00:00',
				end: '2025-01-15T10:00:00+00:00',
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
	 * counter. Passing a stable React `useId()` to DndContext keeps SSR markup
	 * identical across requests.
	 */
	describe('Server Rendering', () => {
		const ssrEvent: CalendarEvent = {
			id: 'a',
			title: 'A',
			start: '2025-03-31T10:00:00+00:00',
			end: '2025-03-31T11:00:00+00:00',
		}

		const renderOnce = () =>
			renderToString(
				<IlamyCalendar
					editable={true}
					events={[ssrEvent]}
					initialDate="2025-03-31T00:00:00Z"
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
