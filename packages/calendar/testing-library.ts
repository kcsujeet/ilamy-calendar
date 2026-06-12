import { afterEach, expect } from 'bun:test'
import dayjs from '@ilamy/utils/dayjs'
import * as matchers from '@testing-library/jest-dom/matchers'
import { cleanup } from '@testing-library/react'

expect.extend(matchers)

// Optional: cleans up `render` after each test
afterEach(() => {
	cleanup()
	// Reset global dayjs state to prevent test leakage
	dayjs.tz.setDefault()
	dayjs.locale('en')
})
