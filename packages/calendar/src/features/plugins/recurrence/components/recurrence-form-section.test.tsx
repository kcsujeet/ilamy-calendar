/** @jsxImportSource preact */
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { type CalendarEvent, createTranslator } from '@ilamy/calendar'
import { fireEvent, screen } from '@testing-library/react'
import { render as preactRender } from 'preact'
import { act } from 'preact/test-utils'
import { RecurrenceFormSection } from './recurrence-form-section'

describe('RecurrenceFormSection', () => {
	const containers: HTMLElement[] = []

	afterEach(() => {
		for (const el of containers.splice(0)) {
			preactRender(null, el)
			el.remove()
		}
	})

	it('enables recurrence without throwing when the event has no start', () => {
		const container = document.createElement('div')
		document.body.appendChild(container)
		containers.push(container)

		const onChange = mock(() => {})
		const event = {
			id: 'draft',
			title: 'No start yet',
		} as unknown as CalendarEvent

		act(() => {
			preactRender(
				<RecurrenceFormSection
					context={{
						event,
						onChange,
						rawEvents: [],
						timezone: 'UTC',
						locale: 'en-US',
						firstDayOfWeek: 0,
						t: createTranslator(),
					}}
				/>,
				container
			)
		})

		const toggle = screen.getByTestId('toggle-recurrence')
		expect(() =>
			act(() => {
				fireEvent.click(toggle)
			})
		).not.toThrow()
		expect(onChange).toHaveBeenCalled()
	})
})
