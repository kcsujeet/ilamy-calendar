import { describe, expect, test } from 'bun:test'
import { IlamyCalendar } from '@ilamy/calendar/react'
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

	test('createStylexCalendarTheme emits --ilamy-* tokens and zero default per-slot inline styles', () => {
		const theme = createStylexCalendarTheme({
			mode: 'dark',
			tokens: { primary: '#a855f7' },
		})

		expect(theme.unstyled).toBe(false)
		expect(theme.components).toBeUndefined()
		expect(theme.slotProps?.root?.style).toMatchObject({
			'--ilamy-bg': STYLEX_DARK_TOKENS.background,
			'--ilamy-fg': STYLEX_DARK_TOKENS.text,
			'--ilamy-surface': STYLEX_DARK_TOKENS.surface,
			'--ilamy-muted': STYLEX_DARK_TOKENS.surfaceMuted,
			'--ilamy-muted-fg': STYLEX_DARK_TOKENS.textMuted,
			'--ilamy-border': STYLEX_DARK_TOKENS.border,
			'--ilamy-primary': '#a855f7',
			'--ilamy-primary-fg': STYLEX_DARK_TOKENS.primaryForeground,
			'--ilamy-danger': STYLEX_DARK_TOKENS.danger,
			'--ilamy-radius': STYLEX_DARK_TOKENS.radius,
			'--ilamy-font': STYLEX_DARK_TOKENS.fontFamily,
			colorScheme: 'dark',
			'--background': STYLEX_DARK_TOKENS.background,
			'--muted': STYLEX_DARK_TOKENS.surfaceMuted,
			'--foreground': STYLEX_DARK_TOKENS.text,
		})
		const slots = theme.slotProps ?? {}
		for (const key of [
			'header',
			'toolbar',
			'navButton',
			'grid',
			'dayHeader',
			'resourceHeader',
			'cell',
			'cellToday',
			'cellNonBusiness',
			'cellDisabled',
			'eventBar',
			'allDayRow',
			'nowIndicator',
			'moreLink',
			'viewButton',
			'viewButtonActive',
		] as const) {
			expect(slots[key]).toBeUndefined()
		}
	})

	test('createStylexCalendarTheme merges options.slots on top of root tokens', () => {
		const theme = createStylexCalendarTheme({
			mode: 'dark',
			tokens: { primary: '#a855f7' },
			slots: {
				root: { className: 'sx-root-class', style: { padding: 8 } },
				eventBar: { className: 'sx-bar-class', style: { fontWeight: 700 } },
			},
		})

		expect(theme.slotProps?.root?.className).toBe('sx-root-class')
		expect(theme.slotProps?.root?.style).toMatchObject({
			'--ilamy-bg': STYLEX_DARK_TOKENS.background,
			'--ilamy-primary': '#a855f7',
			padding: 8,
		})
		expect(theme.slotProps?.eventBar?.className).toBe('sx-bar-class')
		expect(theme.slotProps?.eventBar?.style).toEqual({ fontWeight: 700 })
	})

	test('renders IlamyCalendar with StyleX theme classes and --ilamy-* tokens', () => {
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
		expect(root.style.getPropertyValue('--ilamy-bg')).not.toBe('')
		expect(screen.getByText('StyleX Event')).toBeInTheDocument()
		expect(stylexCalendarTheme.unstyled).toBe(false)
		expect(stylexCalendarDarkTheme.unstyled).toBe(false)
	})
})
