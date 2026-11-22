import { describe, expect, test } from 'bun:test'
import { IlamyCalendar } from '@ilamy/calendar'
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
	test('createMuiCalendarTheme sets unstyled and maps MUI palette tokens', () => {
		const darkTheme = createTheme({
			palette: { mode: 'dark', primary: { main: '#38bdf8' } },
			shape: { borderRadius: 10 },
		})
		const adapter = createMuiCalendarTheme({ theme: darkTheme })

		expect(adapter.unstyled).toBe(true)
		expect(adapter.slotProps?.root?.style?.backgroundColor).toBe(
			darkTheme.palette.background.paper
		)
		expect(adapter.slotProps?.root?.style?.['--background']).toBe(
			darkTheme.palette.background.paper
		)
		expect(adapter.slotProps?.root?.style?.['--muted']).toBe(
			darkTheme.palette.background.default
		)
		expect(adapter.slotProps?.root?.style?.['--foreground']).toBe(
			darkTheme.palette.text.primary
		)
		expect(adapter.slotProps?.root?.style?.borderRadius).toBe('10px')
		expect(adapter.slotProps?.eventBar?.style?.backgroundColor).toBe('#38bdf8')
		expect(adapter.components?.Button).toBe(muiCalendarComponents.Button)
		expect(adapter.components?.Dialog).toBe(muiCalendarComponents.Dialog)
	})

	test('renders IlamyCalendar with MUI components and opens native MUI Dialog', () => {
		render(<MuiCalendarHarness mode="light" />)

		expect(screen.getByText('MUI Sync')).toBeInTheDocument()
		const newButton = screen.getByRole('button', { name: 'New' })
		expect(newButton.className).toContain('MuiButton')

		fireEvent.click(newButton)
		expect(screen.getByRole('dialog')).toBeInTheDocument()
	})

	test('adapts root surface styling in MUI dark mode', () => {
		render(<MuiCalendarHarness mode="dark" />)
		const root = screen.getByTestId('ilamy-calendar')
		expect(root.style.backgroundColor).not.toBe('')
	})

	test('keeps visual parity with Tailwind: no double header gap, square grid border, non-disabled today cell', () => {
		const lightTheme = createTheme({ palette: { mode: 'light' } })
		const adapter = createMuiCalendarTheme({ theme: lightTheme })
		const s = (name: keyof NonNullable<typeof adapter.slotProps>) =>
			adapter.slotProps?.[name]?.style ?? {}

		expect(s('header').padding).toBeUndefined()
		expect(s('header').marginBottom).toBeUndefined()
		expect(s('grid').borderRadius).toBeUndefined()
		expect(s('grid').overflow).toBeUndefined()
		expect(s('dayHeader').borderRight).toBeUndefined()
		expect(s('cell').borderRight).toBeUndefined()
		expect(s('dayHeader').fontSize).toBe(lightTheme.typography.body2.fontSize)
		expect(s('cellToday').backgroundColor).toBe(s('cell').backgroundColor)
	})
})
