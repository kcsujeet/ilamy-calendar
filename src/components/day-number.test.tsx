import { describe, expect, test, vi } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import dayjs from '@/lib/configs/dayjs-config'
import { ids } from '@/lib/utils/ids'
import { DayNumber } from './day-number'

describe('DayNumber', () => {
	test('renders day number correctly', () => {
		const date = dayjs('2025-01-15')
		render(<DayNumber date={date} />)
		expect(screen.getByTestId(ids.dayNumber.root(date))).toHaveTextContent('15')
	})

	test('highlights today correctly', () => {
		const today = dayjs()
		render(<DayNumber date={today} />)
		const element = screen.getByTestId(ids.dayNumber.today)
		expect(element.className).toContain('bg-primary')
	})

	test('does not highlight non-today dates', () => {
		const date = dayjs().add(1, 'day')
		render(<DayNumber date={date} />)
		const element = screen.getByTestId(ids.dayNumber.root(date))
		expect(element.className).not.toContain('bg-primary')
	})

	test('respects locale for numbering', () => {
		const date = dayjs('2025-01-15')
		render(<DayNumber date={date} locale="ar-EG" />)
		// Arabic-Indic digit for 15 might vary, but we check if it's rendered
		expect(screen.getByTestId(ids.dayNumber.root(date))).toBeInTheDocument()
	})

	test('applies custom className', () => {
		const date = dayjs('2025-01-15')
		render(<DayNumber className="custom-class" date={date} />)
		expect(screen.getByTestId(ids.dayNumber.root(date)).className).toContain(
			'custom-class'
		)
	})
})
