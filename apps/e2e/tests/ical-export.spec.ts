import { readFileSync } from 'node:fs'
import { expect, type Page, type TestInfo, test } from '@playwright/test'
import { gotoScenario } from './support/harness'

/*
 * The downloaded .ics file, read as an importer would. RFC 5545 section 3.1
 * (line folding), 3.4 (the object ends with CRLF), 3.3.10 (UNTIL has the value
 * type of DTSTART), 3.8.5.1 and 3.8.4.4 (EXDATE and RECURRENCE-ID, DATE series).
 *
 * Known limit, not tested: a series in a configured `timezone` is exported as a
 * UTC DTSTART and RRULE, with no TZID/VTIMEZONE (docs/export-ical.md).
 */

const exportIcs = async (page: Page, testInfo: TestInfo): Promise<string> => {
	const [download] = await Promise.all([
		page.waitForEvent('download'),
		page
			.getByRole('button', { name: /export/i })
			.first()
			.click(),
	])
	const path = testInfo.outputPath('export.ics')
	await download.saveAs(path)
	return readFileSync(path, 'utf8')
}

const openExport = async (page: Page, testInfo: TestInfo): Promise<string> => {
	await gotoScenario(page, {
		scenario: 'ical-export',
		view: 'month',
		plugins: ['recurrence'],
	})
	return exportIcs(page, testInfo)
}

const unfold = (ics: string): string[] =>
	ics.replaceAll('\r\n ', '').split('\r\n')

test.describe('iCal export', () => {
	test('no line is longer than 75 octets and folding loses nothing', async ({
		page,
	}, testInfo) => {
		const ics = await openExport(page, testInfo)
		const longest = Math.max(
			...ics.split('\r\n').map((line) => Buffer.byteLength(line))
		)
		const description = `DESCRIPTION:${'Agenda é€ '.repeat(20)}end`
		expect(longest).toBeLessThanOrEqual(75)
		expect(unfold(ics)).toContain(description)
	})

	test('the file ends with exactly one CRLF after END:VCALENDAR', async ({
		page,
	}, testInfo) => {
		const ics = await openExport(page, testInfo)
		expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
		expect(ics.endsWith('\r\n\r\n')).toBe(false)
	})

	test('a DATE series exports UNTIL, EXDATE and RECURRENCE-ID as DATE values', async ({
		page,
	}, testInfo) => {
		const lines = unfold(await openExport(page, testInfo))
		const rules = lines.filter((line) => line.startsWith('RRULE:'))
		const exdates = lines.filter((line) => line.startsWith('EXDATE'))
		const recurrenceIds = lines.filter((line) =>
			line.startsWith('RECURRENCE-ID')
		)
		expect(lines).toContain('DTSTART;VALUE=DATE:20250310')
		expect(rules).toEqual(['RRULE:FREQ=WEEKLY;UNTIL=20250330'])
		expect(exdates).toEqual(['EXDATE;VALUE=DATE:20250317'])
		expect(recurrenceIds).toEqual(['RECURRENCE-ID;VALUE=DATE:20250324'])
	})

	test('hideExportButton removes the export control', async ({ page }) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			settings: { hideExportButton: 'true' },
		})
		await expect(page.getByRole('button', { name: /export/i })).toHaveCount(0)
	})
})
