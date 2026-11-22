import { describe, expect, test } from 'bun:test'
import { IlamyCalendar } from '@ilamy/calendar/react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import { fireEvent, render, screen } from '@testing-library/react'
import {
	createMuiCalendarTheme,
	muiCalendarComponents,
	useMuiCalendarTheme,
} from './index'

const MuiCalendarHarness = ({ mode }: { mode: 'light' | 'dark' }) => {
	const theme = createTheme({
		palette: { mode, primary: { main: '#7c3aed' } },
	})
	const Inner = () => {
		const adapter = useMuiCalendarTheme()
		return (
			<IlamyCalendar
				{...adapter}
				events={[
					{
						id: 'evt-1',
						title: 'MUI Sync',
						start: '2026-03-02T09:00:00Z',
						end: '2026-03-02T10:00:00Z',
					},
				]}
				initialDate="2026-03-02T00:00:00Z"
				initialView="month"
				timezone="UTC"
			/>
		)
	}
	return (
		<ThemeProvider theme={theme}>
			<Inner />
		</ThemeProvider>
	)
}

describe('@ilamy/theme-mui', () => {
	test('createMuiCalendarTheme emits --ilamy-* tokens and zero per-slot inline styles', () => {
		const darkTheme = createTheme({
			palette: { mode: 'dark', primary: { main: '#38bdf8' } },
			shape: { borderRadius: 10 },
		})
		const adapter = createMuiCalendarTheme({ theme: darkTheme })
		const rootStyle = adapter.slotProps?.root?.style

		expect(adapter.unstyled).toBe(false)
		expect(rootStyle).toMatchObject({
			'--ilamy-bg': darkTheme.palette.background.paper,
			'--ilamy-fg': darkTheme.palette.text.primary,
			'--ilamy-surface': darkTheme.palette.background.default,
			'--ilamy-muted': darkTheme.palette.background.default,
			'--ilamy-border': darkTheme.palette.divider,
			'--ilamy-primary': '#38bdf8',
			'--ilamy-primary-fg': darkTheme.palette.primary.contrastText,
			'--ilamy-radius': '10px',
			colorScheme: 'dark',
			'--background': darkTheme.palette.background.paper,
			'--foreground': darkTheme.palette.text.primary,
			'--muted': darkTheme.palette.background.default,
		})

		const slots = adapter.slotProps ?? {}
		for (const key of [
			'header',
			'grid',
			'dayHeader',
			'resourceHeader',
			'cell',
			'cellToday',
			'eventBar',
			'viewButton',
		] as const) {
			expect(slots[key]).toBeUndefined()
		}
		expect(adapter.components?.Button).toBe(muiCalendarComponents.Button)
		expect(adapter.components?.Dialog).toBe(muiCalendarComponents.Dialog)
	})

	test('merges consumer slotProps cleanly on top of MUI root tokens', () => {
		const lightTheme = createTheme({ palette: { mode: 'light' } })
		const adapter = createMuiCalendarTheme({
			theme: lightTheme,
			slotProps: {
				root: { className: 'custom-root', style: { padding: '8px' } },
				eventBar: { className: 'custom-bar', style: { fontWeight: 700 } },
			},
		})

		expect(adapter.slotProps?.root?.className).toBe('custom-root')
		expect(adapter.slotProps?.root?.style?.padding).toBe('8px')
		expect(adapter.slotProps?.root?.style?.['--ilamy-bg']).toBe(
			lightTheme.palette.background.paper
		)
		expect(adapter.slotProps?.eventBar).toEqual({
			className: 'custom-bar',
			style: { fontWeight: 700 },
		})
	})

	test('renders IlamyCalendar with MUI components and opens native MUI Dialog', () => {
		render(<MuiCalendarHarness mode="light" />)

		expect(screen.getByText('MUI Sync')).toBeInTheDocument()
		const newButton = screen.getByRole('button', { name: 'New' })
		expect(newButton.className).toContain('MuiButton')

		fireEvent.click(newButton)
		expect(screen.getByRole('dialog')).toBeInTheDocument()
	})

	test('applies color-scheme dark and --ilamy-bg on root in MUI dark mode', () => {
		const darkTheme = createTheme({
			palette: { mode: 'dark', primary: { main: '#7c3aed' } },
		})
		render(<MuiCalendarHarness mode="dark" />)
		const root = screen.getByTestId('ilamy-calendar')
		expect(root.style.getPropertyValue('color-scheme')).toBe('dark')
		expect(root.style.getPropertyValue('--ilamy-bg')).toBe(
			darkTheme.palette.background.paper
		)
	})
})
