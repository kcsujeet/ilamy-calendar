import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Page objects wrap the testids the components emit, so a markup change breaks
 * one file rather than twenty specs. They deliberately expose *questions the
 * specs ask* ("which days are shown", "where is this event") rather than raw
 * selectors, so a spec reads as a statement about the calendar.
 */

export class CalendarPage {
	constructor(readonly page: Page) {}

	get root(): Locator {
		return this.page.getByTestId('ilamy-calendar')
	}

	get title(): Locator {
		return this.page.getByTestId('calendar-title')
	}

	next(): Promise<void> {
		return this.page.getByLabel('Next').click()
	}

	previous(): Promise<void> {
		return this.page.getByLabel('Previous').click()
	}

	today(): Promise<void> {
		return this.page.getByRole('button', { name: 'Today', exact: true }).click()
	}

	/** The one cell marked today, if the pinned date is on screen at all. */
	get todayMarker(): Locator {
		return this.page.getByTestId('day-number-today')
	}

	/** An event bar, found by its title the way a person would find it. */
	event(title: string): Locator {
		return this.root.getByText(title, { exact: false })
	}

	/**
	 * The events as the calendar currently reports them to its consumer. The
	 * month grid draws bars in an overlay rather than inside the day cells, so
	 * "where is this event now" is a question the DOM cannot answer; this is
	 * what `onEventUpdate` has actually handed back.
	 */
	async eventState(): Promise<
		Array<{
			id: string
			title: string
			start: string
			end: string
			resourceId: string | null
		}>
	> {
		const raw = await this.page.getByTestId('event-state').textContent()
		return JSON.parse(raw ?? '[]')
	}

	async eventNamed(title: string) {
		const state = await this.eventState()
		const found = state.find((event) => event.title === title)
		if (!found) {
			throw new Error(
				`no event titled "${title}"; have: ${state.map((e) => e.title).join(', ')}`
			)
		}
		return found
	}

	async expectRendered(): Promise<void> {
		await expect(this.root).toBeVisible()
		// A harness error renders instead of the calendar, never alongside it.
		await expect(this.page.getByTestId('harness-error')).toHaveCount(0)
	}
}

export class MonthGrid extends CalendarPage {
	get cells(): Locator {
		return this.page.locator('[data-testid^="day-cell-"]')
	}

	/** The cell whose range starts on this date, e.g. '2025-03-12'. */
	cellOn(date: string): Locator {
		return this.page.locator(
			`[data-testid^="day-cell-"][data-start^="${date}"]`
		)
	}

	get overflowIndicators(): Locator {
		return this.root.getByText(/^\+\d+ more$/)
	}
}

export class TimeGrid extends CalendarPage {
	/** One column per visible day. */
	get dayColumns(): Locator {
		return this.page.locator('[data-testid^="vertical-col-day-col-"]')
	}

	get allDayRow(): Locator {
		return this.page.getByTestId('all-day-row')
	}

	get hourLabels(): Locator {
		return this.page.locator('[data-testid^="vertical-time-"]')
	}
}

export class YearGrid extends CalendarPage {
	get monthCards(): Locator {
		return this.page.locator('[data-testid^="year-month-"]')
	}
}

export class ResourceAxis extends CalendarPage {
	/**
	 * A resource by its title. Deliberately text-based: the axis header carries
	 * a different testid in each orientation (`horizontal-row-label-*` when
	 * resources are rows, `resource-columns-header` when they are columns) and
	 * the vertical week header carries none at all. The title is what a person
	 * reads in every one of them.
	 */
	resource(title: string): Locator {
		return this.root.getByText(title, { exact: true })
	}

	/** The axis container, where the current orientation labels one. */
	get header(): Locator {
		return this.page.locator(
			'[data-testid^="horizontal-row-label-"], [data-testid="resource-columns-header"]'
		)
	}
}
