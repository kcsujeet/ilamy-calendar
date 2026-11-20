import { beforeEach, describe, expect, test } from 'bun:test'
import type { Resource } from '@ilamy/types'
import { cleanup, render, screen } from '@testing-library/react'
import type React from 'react'
import { CalendarProvider } from '@/features/calendar/stores/calendar-context/calendar-provider'
import { ResourceCell } from './resource-cell'

const initialDate = '2025-01-01T00:00:00Z'
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
	const firstResource = mockResources.at(0)
	if (!firstResource) {
		throw new Error('Missing mock resource')
	}
	return render(
		<CalendarProvider
			dayMaxEvents={3}
			events={[]}
			initialDate={initialDate}
			renderResource={renderResource}
			resources={mockResources}
			timezone="UTC"
		>
			<ResourceCell data-testid="resource-cell" resource={firstResource}>
				{children}
			</ResourceCell>
		</CalendarProvider>
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
		renderResourceCell(undefined, <div data-testid="with-children" />)
		expect(screen.getByTestId('with-children')).toBeInTheDocument()
	})

	test('renders with renderResource if renderResource and children provided', () => {
		renderResourceCell(mockRenderResource, <div data-testid="with-children" />)
		expect(screen.getByTestId('with-render-resource')).toBeInTheDocument()
	})

	test('custom metadata in Resource.data is accessible in renderResource', () => {
		const resourceWithData: Resource = {
			id: 'meta-1',
			title: 'Resource with Data',
			data: { avatar: 'https://example.com/avatar.png' },
		}

		const renderWithMeta = (resource: Resource) => {
			const avatar =
				typeof resource.data?.avatar === 'string'
					? resource.data.avatar
					: undefined
			return (
				<div data-testid="meta-renderer">
					<img alt="avatar" data-testid="resource-avatar" src={avatar} />
					<span>{resource.title}</span>
				</div>
			)
		}

		render(
			<CalendarProvider
				dayMaxEvents={7}
				initialDate={initialDate}
				renderResource={renderWithMeta}
				resources={[resourceWithData]}
				timezone="UTC"
			>
				<ResourceCell data-testid="meta-cell" resource={resourceWithData} />
			</CalendarProvider>
		)

		const img = screen.getByTestId('resource-avatar')
		expect(img).toHaveAttribute('src', 'https://example.com/avatar.png')
	})
})
