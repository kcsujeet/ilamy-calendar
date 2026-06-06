import { afterEach, expect } from 'bun:test'
import * as matchers from '@testing-library/jest-dom/matchers'
import { cleanup } from '@testing-library/react'

import dayjs from '@/lib/configs/dayjs-config'

expect.extend(matchers)

// Optional: cleans up `render` after each test
afterEach(() => {
	cleanup()
	// Reset global dayjs state to prevent test leakage
	dayjs.tz.setDefault()
	dayjs.locale('en')
})
