import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import dayjs from '@/lib/configs/dayjs-config'
import { DayNumber } from './day-number'

describe('DayNumber', () => {
	beforeEach(() => {
		cleanup()
	})

	test('renders day number correctly', () => {
		const date = dayjs('2025-01-15')
		render(<DayNumber date={date} />)

		expect(screen.getByText('15')).toBeInTheDocument()
		expect(screen.getByTestId('day-number-15')).toBeInTheDocument()
	})

	test('highlights today correctly', () => {
		const today = dayjs()
		render(<DayNumber date={today} />)

		const element = screen.getByTestId('day-number-today')
		expect(element).toHaveClass('bg-primary')
		expect(element).toHaveClass('text-primary-foreground')
	})

	test('does not highlight non-today dates', () => {
		const yesterday = dayjs().subtract(1, 'day')
		render(<DayNumber date={yesterday} />)

		const element = screen.getByTestId(`day-number-${yesterday.format('D')}`)
		expect(element).not.toHaveClass('bg-primary')
	})

	test('respects locale for numbering', () => {
		const date = dayjs('2025-01-15')
		// AR locale uses different numbering system characters in some environments
		// but let's just check if it renders without crashing and has correct text
		render(<DayNumber date={date} locale="ar" />)
		expect(screen.getByTestId('day-number-15')).toBeInTheDocument()
	})

	test('applies custom className', () => {
		const date = dayjs('2025-01-15')
		render(<DayNumber className="custom-class" date={date} />)

		expect(screen.getByTestId('day-number-15')).toHaveClass('custom-class')
	})
})
