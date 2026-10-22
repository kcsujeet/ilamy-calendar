import { expect, type Page, test } from '@playwright/test'
import {
	allDayBox,
	formDialog,
	pickDay,
	pickTime,
	saveForm,
	submitButton,
} from './support/event-form'
import { gotoScenario } from './support/harness'
import { CalendarPage } from './support/pages'

/*
 * The event form, driven through the real dialog, and what it hands the
 * consumer when it saves.
 */

const NEW_YORK = 'America/New_York'

const openNewEvent = async (page: Page) => {
	await page.getByRole('button', { name: 'New', exact: true }).click()
	await formDialog(page).waitFor()
	await page.locator('form input[name=title]').fill('Planning')
}

const savedPlanning = async (page: Page) => {
	await saveForm(page)
	return new CalendarPage(page).eventNamed('Planning')
}

test.describe('a timed event never saves with an end that is not after its start', () => {
	// RFC 5545 section 3.8.2.2: DTEND "MUST be later in time than" DTSTART.
	// The new event opens on 09:00 to 10:00, one hour long. When an edge moves
	// past the other, the other follows so the event keeps that hour.
	test('an End Time before the start moves the start so the event keeps its length', async ({
		page,
	}) => {
		await gotoScenario(page, { scenario: 'basic', view: 'week' })
		await openNewEvent(page)

		await pickTime(page, 'end', '8:00 AM')

		const saved = await savedPlanning(page)
		expect(saved.start).toBe('2025-03-12T07:00:00.000Z')
		expect(saved.end).toBe('2025-03-12T08:00:00.000Z')
	})

	test('a Start Time after the end moves the end so the event keeps its length', async ({
		page,
	}) => {
		await gotoScenario(page, { scenario: 'basic', view: 'week' })
		await openNewEvent(page)

		await pickTime(page, 'start', '11:00 AM')

		const saved = await savedPlanning(page)
		expect(saved.start).toBe('2025-03-12T11:00:00.000Z')
		expect(saved.end).toBe('2025-03-12T12:00:00.000Z')
	})

	test('a Start Time late in the day carries the end over midnight', async ({
		page,
	}) => {
		await gotoScenario(page, { scenario: 'basic', view: 'week' })
		await openNewEvent(page)

		await pickTime(page, 'start', '11:30 PM')

		const saved = await savedPlanning(page)
		expect(saved.start).toBe('2025-03-12T23:30:00.000Z')
		expect(saved.end).toBe('2025-03-13T00:30:00.000Z')
	})
})

test.describe('an all-day event covers at least one whole day', () => {
	test('a Start Date after the End Date pulls the end to the same day', async ({
		page,
	}) => {
		await gotoScenario(page, { scenario: 'basic', view: 'week' })
		await openNewEvent(page)
		await allDayBox(page).click()

		await pickDay(page, 0, 20)

		const saved = await savedPlanning(page)
		expect(saved.start).toBe('2025-03-20T00:00:00.000Z')
		// The end is exclusive: the midnight after the one day it covers.
		expect(saved.end).toBe('2025-03-21T00:00:00.000Z')
	})
})

test.describe('saving an event without touching its schedule', () => {
	// All-day events stored as UTC midnights, read by a New York calendar: the
	// form used to rebuild them from the New York days it showed, so a 24 h
	// event came back 48 h long. An unedited schedule is not rewritten.
	test('keeps the stored start and end of an all-day event in another zone', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'all-day-events',
			view: 'month',
			timezone: NEW_YORK,
		})
		const calendar = new CalendarPage(page)
		const before = await calendar.eventNamed('Public holiday')

		await page.getByRole('button', { name: /Public holiday/ }).click()
		await formDialog(page).waitFor()
		await submitButton(page).click()
		await formDialog(page).waitFor({ state: 'detached' })

		const after = await calendar.eventNamed('Public holiday')
		expect([after.start, after.end, after.allDay]).toEqual([
			before.start,
			before.end,
			true,
		])
	})

	test('keeps the stored start and end when only the title changes', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'all-day-events',
			view: 'month',
			timezone: NEW_YORK,
		})
		const calendar = new CalendarPage(page)
		const before = await calendar.eventNamed('Off-site')

		await page.getByRole('button', { name: /Off-site/ }).click()
		await formDialog(page).waitFor()
		await page.locator('form input[name=title]').fill('Retreat')
		await submitButton(page).click()
		await formDialog(page).waitFor({ state: 'detached' })

		const after = await calendar.eventNamed('Retreat')
		expect([after.start, after.end]).toEqual([before.start, before.end])
	})

	test('still writes the new schedule once a field is edited', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			settings: { scrollTime: '09:00' },
		})
		const calendar = new CalendarPage(page)

		await page.getByRole('button', { name: /Morning stand-up/ }).click()
		await formDialog(page).waitFor()
		await pickTime(page, 'start', '8:00 AM')
		await saveForm(page)

		const after = await calendar.eventNamed('Morning stand-up')
		expect(after.start).toBe('2025-03-12T08:00:00.000Z')
	})
})

test.describe('focus after the event form closes', () => {
	// WAI-ARIA APG dialog pattern: "When a dialog closes, focus returns to the
	// element that invoked the dialog" (WCAG 2.4.3 Focus Order).
	test('returns to the event bar that was clicked, after Escape', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			settings: { scrollTime: '09:00' },
		})
		const bar = page.getByRole('button', { name: /Morning stand-up/ }).first()

		await bar.click()
		await formDialog(page).waitFor()
		await page.keyboard.press('Escape')

		await expect(bar).toBeFocused()
	})

	test('returns to the event bar opened with Enter, after Cancel', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			settings: { scrollTime: '09:00' },
		})
		const bar = page.getByRole('button', { name: /Morning stand-up/ }).first()

		await bar.focus()
		await page.keyboard.press('Enter')
		await formDialog(page).waitFor()
		await page.getByRole('button', { name: 'Cancel' }).click()

		await expect(bar).toBeFocused()
	})

	test('returns to the event in the "+N more" list it was opened from', async ({
		page,
	}) => {
		await gotoScenario(page, { scenario: 'many-events', view: 'month' })
		await page.getByText(/^\+\d+ more$/).click()
		const eventInList = page
			.getByRole('dialog')
			.getByRole('button', { name: /Event 5/ })

		await eventInList.click()
		await page.getByRole('dialog', { name: 'Edit event' }).waitFor()
		await page.keyboard.press('Escape')

		await expect(eventInList).toBeFocused()
	})
})
