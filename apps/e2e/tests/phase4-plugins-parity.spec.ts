import { readFileSync } from 'node:fs'
import { expect, type Page, test } from '@playwright/test'

const FRAMEWORKS = ['react', 'vue', 'svelte', 'solid', 'angular'] as const

const viewBtn = (page: Page, label: string) =>
	page
		.locator(
			'[data-ilamy-slot="view-switcher"] [data-ilamy-slot="view-button"]'
		)
		.filter({ hasText: new RegExp(`^${label}$`, 'i') })

const readEventState = async (page: Page) => {
	const raw = await page.getByTestId('event-state').textContent()
	return JSON.parse(raw ?? '[]') as Array<{
		id: string
		title: string
		start: string
		end: string
	}>
}

test.describe('Phase 4: Framework-agnostic plugin parity across all frameworks', () => {
	test('plugin-free core renders only day/week/month with no plugin toolbar items', async ({
		page,
	}) => {
		for (const fw of FRAMEWORKS) {
			await page.goto(
				`/?scenario=basic&view=month&framework=${fw}&plugins=&css=plain`
			)
			await expect(viewBtn(page, 'Day')).toBeVisible()
			await expect(viewBtn(page, 'Week')).toBeVisible()
			await expect(viewBtn(page, 'Month')).toBeVisible()
			await expect(viewBtn(page, 'Agenda')).toHaveCount(0)
			await expect(viewBtn(page, 'Year')).toHaveCount(0)
			await expect(page.getByTestId('export-ical-btn')).toHaveCount(0)
		}
	})

	test('agendaPlugin and yearPlugin render & navigate identically across all frameworks', async ({
		page,
	}) => {
		for (const fw of FRAMEWORKS) {
			await page.goto(
				`/?scenario=basic&view=month&framework=${fw}&plugins=agenda,year&agendaWindow=week&css=plain`
			)
			await viewBtn(page, 'Agenda').click()
			await expect(page.getByTestId('agenda-view')).toBeVisible()
			await expect(page.getByText('Morning stand-up')).toBeVisible()

			await viewBtn(page, 'Year').click()
			await expect(page.getByTestId('year-view')).toBeVisible()
			await expect(page.getByTestId('year-month-title-03')).toBeVisible()

			await page.getByTestId('year-month-title-03').click()
			await expect(page.getByTestId('calendar-body')).toBeVisible()
		}
	})

	test('icalPlugin mounts SLOT_TOOLBAR export button and downloads valid .ics across all frameworks', async ({
		page,
	}, testInfo) => {
		for (const fw of FRAMEWORKS) {
			await page.goto(
				`/?scenario=basic&view=month&framework=${fw}&plugins=ical&css=plain`
			)
			const exportBtn = page.getByTestId('export-ical-btn')
			await expect(exportBtn).toBeVisible()

			const [download] = await Promise.all([
				page.waitForEvent('download'),
				exportBtn.click(),
			])
			const outPath = testInfo.outputPath(`export-${fw}.ics`)
			await download.saveAs(outPath)
			const ics = readFileSync(outPath, 'utf8')
			expect(ics).toContain('BEGIN:VCALENDAR')
			expect(ics).toContain('SUMMARY:Morning stand-up')
		}
	})

	test('recurrencePlugin expands occurrences, mounts SLOT_EVENT_FORM, and confirms edit scope across all frameworks', async ({
		page,
	}) => {
		for (const fw of FRAMEWORKS) {
			await page.goto(
				`/?scenario=recurring&view=month&framework=${fw}&plugins=recurrence&css=plain`
			)
			const instances = page.locator('[data-testid^="calendar-event-standup_"]')
			await expect(instances.first()).toBeVisible()
			expect(await instances.count()).toBeGreaterThan(3)

			// Verify SLOT_EVENT_FORM mounts the framework-agnostic repeat toggle
			const newBtn = page
				.locator(
					fw === 'react'
						? '[data-testid="new-event-btn"], button:has-text("New")'
						: '[data-testid="new-event-btn"]'
				)
				.first()
			await newBtn.click()
			await expect(page.getByTestId('toggle-recurrence')).toBeVisible()
			await page.getByTestId('toggle-recurrence').click()
			await expect(page.getByTestId('preset-select')).toBeVisible()

			// Close create dialog via Cancel button
			await page.getByRole('button', { name: 'Cancel' }).click()

			// Click a recurring occurrence and update to verify SLOT_EVENT_MUTATION_SCOPE
			await instances.first().click()
			const titleInput = page.locator('input[name="title"]')
			await expect(titleInput).toBeVisible()
			await titleInput.fill(`Stand-up ${fw}`)

			const saveBtn =
				fw === 'react'
					? page.getByRole('button', { name: /update|save/i }).last()
					: page.getByTestId('dom-event-save-btn')
			await saveBtn.click()

			await expect(page.getByText('All events', { exact: true })).toBeVisible()
			await page.getByText('All events', { exact: true }).click()

			await expect
				.poll(async () =>
					(await readEventState(page)).some((e) => e.title === `Stand-up ${fw}`)
				)
				.toBe(true)
		}
	})

	test('dragToCreatePlugin creates range selections via real pointer drag across React and Preact DOM frameworks', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 1400 })
		for (const fw of ['react', 'vue', 'svelte'] as const) {
			await page.goto(
				`/?scenario=basic&view=week&framework=${fw}&plugins=drag-to-create&scrollTime=08:00&css=plain`
			)
			const fromCell = page
				.locator('[data-start="2025-03-12T11:00:00.000Z"]')
				.first()
			const toCell = page
				.locator('[data-start="2025-03-12T12:00:00.000Z"]')
				.first()
			await expect(fromCell).toBeVisible()

			const fromBox = await fromCell.boundingBox()
			const toBox = await toCell.boundingBox()
			if (!(fromBox && toBox)) {
				throw new Error(`Missing cells for ${fw}`)
			}
			await page.mouse.move(
				fromBox.x + fromBox.width / 2,
				fromBox.y + fromBox.height / 2
			)
			await page.mouse.down()
			await page.mouse.move(
				toBox.x + toBox.width / 2,
				toBox.y + toBox.height / 2,
				{ steps: 8 }
			)
			await page.mouse.up()

			await expect(page.locator('input[name="title"]')).toBeVisible()
		}
	})
})
