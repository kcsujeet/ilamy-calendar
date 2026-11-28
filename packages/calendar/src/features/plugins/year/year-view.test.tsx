/** @jsxImportSource preact */
import { afterEach, describe, expect, it } from 'bun:test'
import {
	buildYearViewModel,
	createTranslator,
	formatDate,
	type PluginViewContext,
} from '@ilamy/calendar'
import { fireEvent, screen } from '@testing-library/react'
import { render as preactRender } from 'preact'
import { act } from 'preact/test-utils'
import { createCalendarController } from '../../../lib/controller/core-calendar-controller'
import { yearPlugin } from './index'
import { YearView } from './year-view'

const monthNames = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
]

describe('yearPlugin', () => {
	const containers: HTMLElement[] = []

	afterEach(() => {
		for (const el of containers.splice(0)) {
			preactRender(null, el)
			el.remove()
		}
	})

	const renderYear = (overrides: Partial<PluginViewContext> = {}) => {
		const container = document.createElement('div')
		document.body.appendChild(container)
		containers.push(container)

		const controller = createCalendarController({
			initialDate: '2025-01-15T00:00:00.000Z',
			initialView: 'year',
			timezone: 'UTC',
			firstDayOfWeek: overrides.firstDayOfWeek === 1 ? 'monday' : 'sunday',
			pluginViews: yearPlugin().views,
		})
		const state = controller.getState()
		const ctx: PluginViewContext = {
			controller,
			state,
			events: [],
			ownerState: {
				view: 'year',
				currentDate: state.currentDate,
				timezone: state.timezone,
				locale: state.locale,
				unstyled: false,
				hasResourceAxis: false,
				orientation: 'horizontal',
			},
			t: createTranslator(),
			firstDayOfWeek: state.firstDayOfWeek,
			timezone: state.timezone,
			locale: state.locale,
			openEventForm: () => {},
			onEventClick: () => {},
			onCellClick: () => {},
			...overrides,
		}
		act(() => {
			preactRender(<YearView context={ctx} />, container)
		})
		return { container, controller }
	}

	it('registers the framework-agnostic year view via plugin contract', () => {
		const plugin = yearPlugin()
		expect(plugin.name).toBe('year')
		expect(plugin.views).toHaveLength(1)
		expect(plugin.views?.at(0)?.name).toBe('year')
		expect(plugin.views?.at(0)?.supportsResources).toBe(false)
		expect(typeof plugin.views?.at(0)?.mountView?.mount).toBe('function')
	})

	it('renders all 12 months with titles, weekday headers, counts, and capped dots', () => {
		renderYear({
			events: [
				{
					id: '1',
					title: 'Jan 1',
					start: '2025-01-15T09:00:00Z',
					end: '2025-01-15T10:00:00Z',
				},
				{
					id: '2',
					title: 'Jan 2',
					start: '2025-01-15T11:00:00Z',
					end: '2025-01-15T12:00:00Z',
				},
				{
					id: '3',
					title: 'Jan 3',
					start: '2025-01-15T13:00:00Z',
					end: '2025-01-15T14:00:00Z',
				},
				{
					id: '4',
					title: 'Jan 4',
					start: '2025-01-15T15:00:00Z',
					end: '2025-01-15T16:00:00Z',
				},
			],
		})

		expect(screen.getByTestId('year-view')).toBeInTheDocument()
		expect(screen.getByTestId('year-grid')).toBeInTheDocument()
		monthNames.forEach((name, i) => {
			const monthId = String(i + 1).padStart(2, '0')
			expect(
				screen.getByTestId(`year-month-title-${monthId}`)
			).toHaveTextContent(name)
		})
		expect(screen.getByTestId('year-month-count-01')).toHaveTextContent(
			'4 Events'
		)
		const jan15 = screen.getByTestId('year-day-2025-01-2025-01-15')
		expect(
			jan15.querySelectorAll('[data-ilamy-part="year-day-dot"]')
		).toHaveLength(3)
	})

	it('navigates controller to day and month views on cell and month title clicks', () => {
		const { controller } = renderYear()
		act(() => {
			fireEvent.click(screen.getByTestId('year-day-2025-03-2025-03-10'))
		})
		expect(controller.getState().view).toBe('day')
		expect(controller.getState().currentDate.slice(0, 10)).toBe('2025-03-10')

		act(() => {
			fireEvent.click(screen.getByTestId('year-month-title-03'))
		})
		expect(controller.getState().view).toBe('month')
		expect(controller.getState().currentDate.slice(0, 10)).toBe('2025-03-01')
	})

	it('builds model and headerTitle accurately', () => {
		const view = yearPlugin().views?.at(0)
		expect(
			view?.headerTitle?.('2025-06-15T00:00:00Z', {
				firstDayOfWeek: 0,
				timezone: 'UTC',
				locale: 'en-US',
			})
		).toBe('2025')
		expect(typeof buildYearViewModel).toBe('function')
		expect(typeof formatDate).toBe('function')
	})
})
