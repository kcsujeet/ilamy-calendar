import { beforeEach, describe, expect, it } from 'bun:test'
import { IlamyCalendar } from '@ilamy/calendar'
import { cleanup, render, screen } from '@testing-library/react'
import { icalPlugin } from './index'

describe('icalPlugin integration', () => {
	beforeEach(() => {
		cleanup()
	})

	it('mounts the Export button in SLOT_TOOLBAR by default', () => {
		render(
			<IlamyCalendar
				events={[]}
				initialDate="2025-03-10T00:00:00Z"
				plugins={[icalPlugin()]}
				timezone="UTC"
			/>
		)

		expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
	})

	it('hides the toolbar Export button when showToolbarButton is false', () => {
		render(
			<IlamyCalendar
				events={[]}
				initialDate="2025-03-10T00:00:00Z"
				plugins={[icalPlugin({ showToolbarButton: false })]}
				timezone="UTC"
			/>
		)

		expect(
			screen.queryByRole('button', { name: /export/i })
		).not.toBeInTheDocument()
	})
})
