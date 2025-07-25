import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { RecurrenceEditDialog } from './recurrence-edit-dialog'

describe('RecurrenceEditDialog', () => {
  const mockOnClose = mock(() => {})
  const mockOnConfirm = mock(() => {})

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onConfirm: mockOnConfirm,
    operationType: 'edit' as const,
    eventTitle: 'Test Recurring Event',
  }

  beforeEach(() => {
    mockOnClose.mockClear()
    mockOnConfirm.mockClear()
  })

  describe('Edit Operation', () => {
    it('should render edit dialog with correct title and description', () => {
      render(<RecurrenceEditDialog {...defaultProps} />)

      expect(screen.getByText(/Edit.*recurring event/)).toBeInTheDocument()
      expect(
        screen.getByText(/Test Recurring Event.*is a recurring event/)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/How would you like to.*change.*it/)
      ).toBeInTheDocument()
    })

    it('should display all three edit options', () => {
      render(<RecurrenceEditDialog {...defaultProps} />)

      expect(screen.getByText('This event')).toBeInTheDocument()
      expect(screen.getByText('This and following events')).toBeInTheDocument()
      expect(screen.getByText('All events')).toBeInTheDocument()
    })

    it('should show correct descriptions for edit options', () => {
      render(<RecurrenceEditDialog {...defaultProps} />)

      expect(
        screen.getByText(/Only.*change.*this specific occurrence/)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/Edit.*this and all future occurrences/)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/Edit.*the entire recurring series/)
      ).toBeInTheDocument()
    })

    it('should call onConfirm with "this" scope when first option is clicked', () => {
      render(<RecurrenceEditDialog {...defaultProps} />)

      const thisEventButton = screen.getByText('This event')
      fireEvent.click(thisEventButton)

      expect(mockOnConfirm).toHaveBeenCalledWith('this')
      expect(mockOnConfirm).toHaveBeenCalledTimes(1)
    })

    it('should call onConfirm with "following" scope when second option is clicked', () => {
      render(<RecurrenceEditDialog {...defaultProps} />)

      const followingEventsButton = screen.getByText(
        'This and following events'
      )
      fireEvent.click(followingEventsButton)

      expect(mockOnConfirm).toHaveBeenCalledWith('following')
      expect(mockOnConfirm).toHaveBeenCalledTimes(1)
    })

    it('should call onConfirm with "all" scope when third option is clicked', () => {
      render(<RecurrenceEditDialog {...defaultProps} />)

      const allEventsButton = screen.getByText('All events')
      fireEvent.click(allEventsButton)

      expect(mockOnConfirm).toHaveBeenCalledWith('all')
      expect(mockOnConfirm).toHaveBeenCalledTimes(1)
    })
  })

  describe('Delete Operation', () => {
    const deleteProps = {
      ...defaultProps,
      operationType: 'delete' as const,
    }

    it('should render delete dialog with correct title and description', () => {
      render(<RecurrenceEditDialog {...deleteProps} />)

      expect(screen.getByText(/Delete.*recurring event/)).toBeInTheDocument()
      expect(
        screen.getByText(/Test Recurring Event.*is a recurring event/)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/How would you like to.*delete.*it/)
      ).toBeInTheDocument()
    })

    it('should show correct descriptions for delete options', () => {
      render(<RecurrenceEditDialog {...deleteProps} />)

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
      render(<RecurrenceEditDialog {...deleteProps} />)

      const thisEventButton = screen.getByText('This event')
      fireEvent.click(thisEventButton)

      expect(mockOnConfirm).toHaveBeenCalledWith('this')
    })
  })

  describe('Dialog Behavior', () => {
    it('should not render when isOpen is false', () => {
      render(<RecurrenceEditDialog {...defaultProps} isOpen={false} />)

      expect(screen.queryByText('Edit Recurring Event')).not.toBeInTheDocument()
    })

    it('should call onClose when cancel button is clicked', () => {
      render(<RecurrenceEditDialog {...defaultProps} />)

      const cancelButton = screen.getByText('Cancel')
      fireEvent.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should handle empty event title gracefully', () => {
      render(<RecurrenceEditDialog {...defaultProps} eventTitle="" />)

      // Should still render the dialog with empty quotes
      expect(screen.getByText(/is a recurring event/)).toBeInTheDocument()
    })

    it('should render with proper dialog structure and accessibility', () => {
      render(<RecurrenceEditDialog {...defaultProps} />)

      // Check for dialog role
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      // Check for buttons (3 options + cancel + close)
      expect(screen.getAllByRole('button')).toHaveLength(5)
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long event titles', () => {
      const longTitle = 'A'.repeat(100)
      render(<RecurrenceEditDialog {...defaultProps} eventTitle={longTitle} />)

      expect(
        screen.getByText(new RegExp(longTitle.slice(0, 50)))
      ).toBeInTheDocument()
    })

    it('should handle special characters in event title', () => {
      const specialTitle = 'Event with "quotes" & <tags>'
      render(
        <RecurrenceEditDialog {...defaultProps} eventTitle={specialTitle} />
      )

      expect(
        screen.getByText(new RegExp('Event with "quotes"'))
      ).toBeInTheDocument()
    })

    it('should maintain button focus after keyboard navigation', () => {
      render(<RecurrenceEditDialog {...defaultProps} />)

      const firstButton = screen.getByText('This event')
      firstButton.focus()

      expect(document.activeElement).toBe(firstButton)
    })
  })
})
