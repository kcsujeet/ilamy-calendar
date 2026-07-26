import { afterEach, describe, expect, it } from 'bun:test'
import dayjs from './dayjs'

/**
 * The configured dayjs forwards every constructor argument to `dayjs.tz()`,
 * whose second parameter is a TIMEZONE rather than a parse format. These tests
 * pin both halves of that contract: the single-argument form parses in the
 * configured zone, and the two-argument form is a compile error rather than a
 * runtime `RangeError: invalid time zone` (#242).
 */
describe('configured dayjs', () => {
	afterEach(() => {
		dayjs.tz.setDefault(undefined)
	})

	it('rejects a parse format at the type level', () => {
		// A format string here would be read as a timezone name and throw at
		// runtime, so the type must not offer the overload. `tsc` reports an
		// unused directive if this ever stops being an error.
		// @ts-expect-error - the configured dayjs takes no parse format
		const parseWithFormat = () => dayjs('2026-03-02', 'YYYY-MM-DD')

		expect(parseWithFormat).toThrow('invalid time zone')
	})

	it('parses a date-only string as midnight in the configured timezone', () => {
		dayjs.tz.setDefault('Asia/Tokyo')

		const parsed = dayjs('2026-03-02')

		expect(parsed.format('YYYY-MM-DDTHH:mm')).toBe('2026-03-02T00:00')
		expect(parsed.toISOString()).toBe('2026-03-01T15:00:00.000Z')
	})

	it('keeps the statics reachable through the wrapper', () => {
		const viaUnix = dayjs.unix(0).toISOString()
		const viaUtc = dayjs.utc('2026-03-02T00:00:00.000Z').toISOString()

		expect(viaUnix).toBe('1970-01-01T00:00:00.000Z')
		expect(viaUtc).toBe('2026-03-02T00:00:00.000Z')
		expect(dayjs.isDayjs(dayjs())).toBe(true)
	})
})
