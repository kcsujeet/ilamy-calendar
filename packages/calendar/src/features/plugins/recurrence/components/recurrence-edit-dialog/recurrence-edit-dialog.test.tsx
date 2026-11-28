/** @jsxImportSource preact */
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { fireEvent, screen } from '@testing-library/react'
import { render as preactRender } from 'preact'
import { act } from 'preact/test-utils'
import { RecurrenceEditDialog } from './recurrence-edit-dialog'

describe('RecurrenceEditDialog', () => {
	const mockOnClose = mock(() => {})
	const mockOnConfirm = mock(() => {})
	const containers: HTMLElement[] = []

	const renderWithProvider = (props: Record<string, unknown> = {}) => {
		const container = document.createElement('div')
		document.body.appendChild(container)
		containers.push(container)
		const defaultProps = {
			isOpen: true,
			onClose: mockOnClose,
			onConfirm: mockOnConfirm,
			operationType: 'edit' as const,
			eventTitle: 'Test Recurring Event',
			...props,
		}

		act(() => {
			preactRender(<RecurrenceEditDialog {...defaultProps} />, container)
		})
		return container
	}

	beforeEach(() => {
		mockOnClose.mockClear()
		mockOnConfirm.mockClear()
	})

	afterEach(() => {
		for (const el of containers.splice(0)) {
			preactRender(null, el)
			el.remove()
		}
	})

	describe('Edit Operation', () => {
		it('should render edit dialog with correct title and description', () => {
			renderWithProvider()

			expect(screen.getByText(/Edit.*recurring event/)).toBeInTheDocument()
			expect(
				screen.getByText(/Test Recurring Event.*is a recurring event/)
			).toBeInTheDocument()
			expect(
				screen.getByText(/How would you like to.*edit.*it/)
			).toBeInTheDocument()
		})

		it('should display all three edit options', () => {
			renderWithProvider()

			expect(screen.getByText('This event')).toBeInTheDocument()
			expect(screen.getByText('This and following events')).toBeInTheDocument()
			expect(screen.getByText('All events')).toBeInTheDocument()
		})

		it('should show correct descriptions for edit options', () => {
			renderWithProvider()

			expect(
				screen.getByText(/Only.*change.*this specific occurrence/)
			).toBeInTheDocument()
			expect(
				screen.getByText(/Change.*this and all future occurrences/)
			).toBeInTheDocument()
			expect(
				screen.getByText(/Change.*the entire recurring series/)
			).toBeInTheDocument()
		})

		it('should call onConfirm with "this" scope when first option is clicked', () => {
			renderWithProvider()

			act(() => {
				fireEvent.click(screen.getByText('This event'))
			})

			expect(mockOnConfirm).toHaveBeenCalledWith('this')
			expect(mockOnConfirm).toHaveBeenCalledTimes(1)
		})

		it('should call onConfirm with "following" scope when second option is clicked', () => {
			renderWithProvider()

			act(() => {
				fireEvent.click(screen.getByText('This and following events'))
			})

			expect(mockOnConfirm).toHaveBeenCalledWith('following')
			expect(mockOnConfirm).toHaveBeenCalledTimes(1)
		})

		it('should call onConfirm with "all" scope when third option is clicked', () => {
			renderWithProvider()

			act(() => {
				fireEvent.click(screen.getByText('All events'))
			})

			expect(mockOnConfirm).toHaveBeenCalledWith('all')
			expect(mockOnConfirm).toHaveBeenCalledTimes(1)
		})
	})

	describe('Delete Operation', () => {
		it('should render delete dialog with correct title and description', () => {
			renderWithProvider({ operationType: 'delete' })

			expect(screen.getByText(/Delete.*recurring event/)).toBeInTheDocument()
			expect(
				screen.getByText(/Test Recurring Event.*is a recurring event/)
			).toBeInTheDocument()
			expect(
				screen.getByText(/How would you like to.*delete.*it/)
			).toBeInTheDocument()
		})

		it('should show correct descriptions for delete options', () => {
			renderWithProvider({ operationType: 'delete' })

			expect(
				screen.getByText(/Only.*delete.*this specific occurrence/)
			).toBeInTheDocument()
			expect(
				screen.getByText(/Delete.*this and all future occurrences/)
			).toBeInTheDocument()
			expect(
				screen.getByText(/Delete.*the entire recurring series/)
			).toBeInTheDocument()
		})

		it('should call onConfirm with correct scope for delete operations', () => {
			renderWithProvider({ operationType: 'delete' })

			act(() => {
				fireEvent.click(screen.getByText('This event'))
			})

			expect(mockOnConfirm).toHaveBeenCalledWith('this')
		})
	})

	describe('Dialog Behavior', () => {
		it('should not render when isOpen is false', () => {
			renderWithProvider({ isOpen: false })

			expect(screen.queryByText('Edit Recurring Event')).not.toBeInTheDocument()
		})

		it('should call onClose when cancel button is clicked', () => {
			renderWithProvider()

			act(() => {
				fireEvent.click(screen.getByText('Cancel'))
			})

			expect(mockOnClose).toHaveBeenCalledTimes(1)
		})

		it('should handle empty event title gracefully', () => {
			renderWithProvider({ eventTitle: '' })

			expect(screen.getByText(/is a recurring event/)).toBeInTheDocument()
		})

		it('should render with proper dialog structure and accessibility', () => {
			renderWithProvider()

			expect(screen.getByRole('dialog')).toBeInTheDocument()
			const buttons = screen.getAllByRole('button')
			expect(buttons).toHaveLength(4)
			expect(buttons[0]).toHaveAttribute('data-testid', 'dom-scope-this')
			expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
		})
	})

	describe('Edge Cases', () => {
		it('should handle very long event titles', () => {
			const longTitle = 'A'.repeat(100)
			renderWithProvider({ eventTitle: longTitle })

			expect(
				screen.getByText(new RegExp(longTitle.slice(0, 50)))
			).toBeInTheDocument()
		})

		it('should handle special characters in event title', () => {
			const specialTitle = 'Event with "quotes" & <tags>'
			renderWithProvider({ eventTitle: specialTitle })

			expect(screen.getByText(/Event with "quotes"/)).toBeInTheDocument()
		})

		it('should maintain button focus after keyboard navigation', () => {
			renderWithProvider()

			const firstButton = screen.getByTestId('dom-scope-this')
			firstButton.focus()

			expect(document.activeElement).toBe(firstButton)
		})
	})
})
