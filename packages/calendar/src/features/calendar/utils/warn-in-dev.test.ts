import { afterEach, describe, expect, it, spyOn } from 'bun:test'
import { warnInDev } from './warn-in-dev'

describe('warnInDev', () => {
	const originalEnv = process.env.NODE_ENV

	afterEach(() => {
		process.env.NODE_ENV = originalEnv
	})

	it('warns outside production', () => {
		process.env.NODE_ENV = 'development'
		const warn = spyOn(console, 'warn').mockImplementation(() => {})
		warnInDev('careful')
		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn).toHaveBeenCalledWith('careful')
		warn.mockRestore()
	})

	it('stays silent in production', () => {
		process.env.NODE_ENV = 'production'
		const warn = spyOn(console, 'warn').mockImplementation(() => {})
		warnInDev('careful')
		expect(warn).not.toHaveBeenCalled()
		warn.mockRestore()
	})
})
