import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { ResourceCalendarProvider } from '@/features/resource-calendar/contexts/resource-calendar-context'
import type { Resource } from '@/features/resource-calendar/types'
import dayjs from '@/lib/configs/dayjs-config'
import { ResourceCell } from './resource-cell'

const initialDate = dayjs('2025-01-01T00:00:00.000Z')
const mockResources: Resource[] = [
	{ id: '1', title: 'Resource 1' },
	{ id: '2', title: 'Resource 2' },
]
const mockRenderResource = (resource: Resource) => (
	<div className="flex flex-col items-center">
		<span className="font-medium text-2xl" data-testid="with-render-resource">
			{resource.title}
		</span>
	</div>
)

const renderResourceCell = (
	renderResource?: (resource: Resource) => React.ReactNode,
	children?: React.ReactNode
) => {
	// Use ResourceCalendarProvider to ensure getEventsForResource is available
	return render(
		<ResourceCalendarProvider
			dayMaxEvents={3}
			events={[]}
			initialDate={initialDate}
			renderResource={renderResource}
			resources={mockResources}
		>
			<ResourceCell data-testid="resource-cell" resource={mockResources[0]}>
				{children}
			</ResourceCell>
		</ResourceCalendarProvider>
	)
}

describe('ResourceCell', () => {
	beforeEach(() => {
		cleanup()
	})

	test('renders with defaults', () => {
		renderResourceCell()
		const cell = screen.getByTestId('resource-cell')
		expect(cell).toContainHTML(
			'<div class="text-sm font-medium truncate">Resource 1</div>'
		)
	})

	test('renders with renderResource if provided', () => {
		renderResourceCell(mockRenderResource)
		expect(screen.getByTestId('with-render-resource')).toBeInTheDocument()
	})

	test('renders with children if provided', () => {
		renderResourceCell(null, <div data-testid="with-children"></div>)
		expect(screen.getByTestId('with-children')).toBeInTheDocument()
	})

	test('renders with renderResource if renderResource and children provided', () => {
		renderResourceCell(
			mockRenderResource,
			<div data-testid="with-children"></div>
		)
		expect(screen.getByTestId('with-render-resource')).toBeInTheDocument()
	})
})
