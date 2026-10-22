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
})
