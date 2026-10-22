import { afterEach, describe, expect, it } from 'bun:test'
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { CalendarProvider } from '@/features/calendar/stores/calendar-context/calendar-provider'
import { EventFormDialog } from './event-form-dialog'

/** A button outside the dialog that opens it, the way an event bar does. */
const Invoker = () => {
	const openEventForm = useSmartCalendarContext(
		(context) => context.openEventForm
	)
	return (
		<button onClick={() => openEventForm()} type="button">
			Open form
		</button>
	)
}

const renderDialogWithInvoker = () => {
	render(
		<CalendarProvider dayMaxEvents={5} events={[]} firstDayOfWeek={0}>
			<Invoker />
			<EventFormDialog />
		</CalendarProvider>
	)
	const invoker = screen.getByRole('button', { name: 'Open form' })
	invoker.focus()
	fireEvent.click(invoker)
	return invoker
}

/**
 * WAI-ARIA dialog pattern: "When a dialog closes, focus returns to the element
 * that invoked the dialog". Radix gives focus back to its own `Trigger`, which
 * this dialog does not have, so focus used to fall to <body>.
 */
describe('EventFormDialog focus', () => {
	afterEach(cleanup)

	it('returns focus to the element that opened it when Cancel is pressed', async () => {
		const invoker = renderDialogWithInvoker()
		await screen.findByRole('dialog')

		fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
		await waitFor(() => expect(document.activeElement).toBe(invoker))
	})

	it('returns focus to the element that opened it when Escape is pressed', async () => {
		const invoker = renderDialogWithInvoker()
		const dialog = await screen.findByRole('dialog')

		fireEvent.keyDown(dialog, { key: 'Escape' })

		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
		await waitFor(() => expect(document.activeElement).toBe(invoker))
	})
})
