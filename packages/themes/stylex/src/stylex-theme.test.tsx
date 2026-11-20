import { describe, expect, test } from 'bun:test'
import { IlamyCalendar } from '@ilamy/calendar'
import { render, screen } from '@testing-library/react'
import {
	createStylexCalendarTheme,
	createStylexSlotProps,
	STYLEX_DARK_TOKENS,
	stylexCalendarDarkTheme,
	stylexCalendarTheme,
	stylexSlot,
} from './index'

describe('@ilamy/theme-stylex', () => {
	test('stylexSlot merges multiple stylex.props() results deterministically', () => {
		const merged = stylexSlot(
			{ className: 'x1a2b3', style: { color: 'red', padding: 4 } },
			{ className: 'x4c5d6', style: { color: 'blue' } }
		)
		expect(merged.className).toBe('x1a2b3 x4c5d6')
		expect(merged.style).toEqual({ color: 'blue', padding: 4 })
	})

	test('createStylexSlotProps maps slot keys to normalized SlotStyleProps', () => {
		const slotProps = createStylexSlotProps({
			eventBar: { className: 'sx-event', style: { borderRadius: 6 } },
			dayHeader: { className: 'sx-header' },
		})
		expect(slotProps.eventBar).toEqual({
			className: 'sx-event',
			style: { borderRadius: 6 },
		})
		expect(slotProps.dayHeader).toEqual({
			className: 'sx-header',
			style: undefined,
		})
	})

	test('createStylexCalendarTheme supports light/dark tokens and StyleX slot overrides', () => {
		const theme = createStylexCalendarTheme({
			mode: 'dark',
			tokens: { primary: '#a855f7' },
			slots: {
				root: { className: 'sx-root-class' },
				eventBar: { className: 'sx-bar-class', style: { fontWeight: 700 } },
			},
		})

		expect(theme.unstyled).toBe(true)
		const slots = theme.slotProps
		const rootStyle = slots?.root?.style
		expect(slots?.root?.className).toBe('sx-root-class')
		expect(rootStyle).toMatchObject({
			'--ilamy-bg': STYLEX_DARK_TOKENS.background,
			'--ilamy-primary': '#a855f7',
			'--background': STYLEX_DARK_TOKENS.background,
			'--muted': STYLEX_DARK_TOKENS.surfaceMuted,
			'--foreground': STYLEX_DARK_TOKENS.text,
		})
		expect(slots?.navButton?.style?.padding).toBeDefined()
		expect(slots?.cell?.style?.borderBottom).toContain('solid')
		expect(slots?.dayHeader?.style?.backgroundColor).toBe(
			'var(--ilamy-surface)'
		)
		expect(slots?.eventBar?.className).toBe('sx-bar-class')
		expect(slots?.eventBar?.style?.fontWeight).toBe(700)
	})

	test('renders IlamyCalendar unstyled with StyleX theme classes and tokens', () => {
		const theme = createStylexCalendarTheme({
			slots: {
				root: { className: 'sx-calendar-root' },
				eventBar: { className: 'sx-event-bar' },
			},
		})

		render(
			<IlamyCalendar
				{...theme}
				events={[
					{
						id: 'sx-1',
						title: 'StyleX Event',
						start: '2026-03-02T09:00:00Z',
						end: '2026-03-02T10:00:00Z',
					},
				]}
				initialDate="2026-03-02T00:00:00Z"
				initialView="month"
				timezone="UTC"
			/>
		)

		const root = screen.getByTestId('ilamy-calendar')
		expect(root.className).toContain('sx-calendar-root')
		expect(screen.getByText('StyleX Event')).toBeInTheDocument()
		expect(stylexCalendarTheme.unstyled).toBe(true)
		expect(stylexCalendarDarkTheme.unstyled).toBe(true)
	})
})
