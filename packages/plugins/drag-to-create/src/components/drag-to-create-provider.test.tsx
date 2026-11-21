import { afterEach, describe, expect, it } from 'bun:test'
import { useIlamyCalendarContext } from '@ilamy/calendar'
import { CalendarTestProvider } from '@ilamy/calendar/testing'
import { act, render, screen } from '@testing-library/react'
import { DragToCreateProvider } from './drag-to-create-provider'

const FormProbe = () => {
	const { selectedEvent } = useIlamyCalendarContext()
	return (
		<div data-testid="probe">{JSON.stringify(selectedEvent?.resourceId)}</div>
	)
}

const renderDragInRoom = (resourceId: string | number) => {
	const resources = [{ id: resourceId, title: 'Room' }]
	render(
		<CalendarTestProvider resources={resources}>
			<DragToCreateProvider options={{}}>
				<div
					data-end="2025-03-12T10:00:00.000Z"
					data-resource-id={String(resourceId)}
					data-start="2025-03-12T09:00:00.000Z"
					data-testid="cell"
				/>
				<FormProbe />
			</DragToCreateProvider>
		</CalendarTestProvider>
	)
}

const dragAcrossCell = () => {
	const pointer = { button: 0, isPrimary: true, pointerId: 1, bubbles: true }
	const cell = screen.getByTestId('cell')
	const at = { ...pointer, clientX: 10, clientY: 10 }
	// happy-dom has no layout, so the cell under the pointer is stated outright.
	document.elementsFromPoint = () => [cell]
	act(() => {
		cell.dispatchEvent(new PointerEvent('pointerdown', pointer))
		window.dispatchEvent(new PointerEvent('pointermove', at))
		window.dispatchEvent(new PointerEvent('pointerup', at))
	})
}

const originalElementsFromPoint = document.elementsFromPoint

describe('DragToCreateProvider', () => {
	afterEach(() => {
		document.elementsFromPoint = originalElementsFromPoint
	})

	// A cell attribute is always a string, but resource ids are `string | number`:
	// the form must get the resource's own id back, or the event is stored under
	// "0" and no lane draws it.
	it('opens the form with the resource id as the resource declares it', () => {
		renderDragInRoom(0)
		dragAcrossCell()
		expect(screen.getByTestId('probe').textContent).toBe('0')
	})

	it('keeps a string resource id a string', () => {
		renderDragInRoom('room-a')
		dragAcrossCell()
		expect(screen.getByTestId('probe').textContent).toBe('"room-a"')
	})

	describe('selectConstraint: businessHours', () => {
		const SelectionProbe = () => {
			const { selectedEvent, isEventFormOpen } = useIlamyCalendarContext()
			let selectionText = 'closed'
			if (isEventFormOpen) {
				selectionText = `${selectedEvent?.start}|${selectedEvent?.end}|${Boolean(selectedEvent?.allDay)}`
			}
			return <div data-testid="selection">{selectionText}</div>
		}

		const dragBetween = (from: HTMLElement, to: HTMLElement) => {
			const pointer = {
				button: 0,
				isPrimary: true,
				pointerId: 1,
				bubbles: true,
			}
			document.elementsFromPoint = () => [to]
			act(() => {
				from.dispatchEvent(
					new PointerEvent('pointerdown', {
						...pointer,
						clientX: 0,
						clientY: 0,
					})
				)
				window.dispatchEvent(
					new PointerEvent('pointermove', {
						...pointer,
						clientX: 10,
						clientY: 10,
					})
				)
				window.dispatchEvent(
					new PointerEvent('pointerup', {
						...pointer,
						clientX: 10,
						clientY: 10,
					})
				)
			})
		}

		it('allows selecting outside business hours when selectConstraint is unset', () => {
			render(
				<CalendarTestProvider
					businessHours={{ startTime: 9, endTime: 17 }}
					timezone="UTC"
				>
					<DragToCreateProvider options={{}}>
						<div
							data-end="2025-03-12T08:00:00Z"
							data-start="2025-03-12T07:00:00Z"
							data-testid="early"
						/>
						<SelectionProbe />
					</DragToCreateProvider>
				</CalendarTestProvider>
			)

			const early = screen.getByTestId('early')
			dragBetween(early, early)
			expect(screen.getByTestId('selection').textContent).toBe(
				'2025-03-12T07:00:00+00:00|2025-03-12T08:00:00+00:00|false'
			)
		})

		it('refuses starting a selection outside business hours when selectConstraint is businessHours', () => {
			render(
				<CalendarTestProvider
					businessHours={{ startTime: 9, endTime: 17 }}
					selectConstraint="businessHours"
					timezone="UTC"
				>
					<DragToCreateProvider options={{}}>
						<div
							data-end="2025-03-12T08:00:00Z"
							data-start="2025-03-12T07:00:00Z"
							data-testid="early"
						/>
						<SelectionProbe />
					</DragToCreateProvider>
				</CalendarTestProvider>
			)

			const early = screen.getByTestId('early')
			dragBetween(early, early)
			expect(screen.getByTestId('selection').textContent).toBe('closed')
		})

		it('clamps the selection to business hours when dragging across the closing hour', () => {
			render(
				<CalendarTestProvider
					businessHours={{ startTime: 9, endTime: 17 }}
					selectConstraint="businessHours"
					timezone="UTC"
				>
					<DragToCreateProvider options={{}}>
						<div
							data-end="2025-03-12T17:00:00Z"
							data-start="2025-03-12T16:00:00Z"
							data-testid="in-hours"
						/>
						<div
							data-end="2025-03-12T18:00:00Z"
							data-start="2025-03-12T17:00:00Z"
							data-testid="after-hours"
						/>
						<SelectionProbe />
					</DragToCreateProvider>
				</CalendarTestProvider>
			)

			dragBetween(
				screen.getByTestId('in-hours'),
				screen.getByTestId('after-hours')
			)
			expect(screen.getByTestId('selection').textContent).toBe(
				'2025-03-12T16:00:00+00:00|2025-03-12T17:00:00+00:00|false'
			)
		})

		it('passes allDay: true for month-grid cells marked data-all-day="true"', () => {
			render(
				<CalendarTestProvider timezone="UTC">
					<DragToCreateProvider options={{}}>
						<div
							data-all-day="true"
							data-end="2025-03-13T00:00:00Z"
							data-start="2025-03-12T00:00:00Z"
							data-testid="month-day"
						/>
						<SelectionProbe />
					</DragToCreateProvider>
				</CalendarTestProvider>
			)

			const day = screen.getByTestId('month-day')
			dragBetween(day, day)
			expect(screen.getByTestId('selection').textContent).toBe(
				'2025-03-12T00:00:00+00:00|2025-03-13T00:00:00+00:00|true'
			)
		})
	})
})
