import { useContext } from 'react'
import { CalendarContext } from '@/contexts/calendar-context/context'
import { ResourceCalendarContext } from '@/contexts/ilamy-resource-calendar-context'

/**
 * Generic hook that detects which calendar context is available and returns selected properties
 */
export function useSmartCalendarContext<T>(selector: (context) => T): T {
  // Check both contexts using useContext directly (no hooks)
  const resourceContext = useContext(ResourceCalendarContext)
  const regularContext = useContext(CalendarContext)

  if (resourceContext) {
    return selector(resourceContext)
  }

  if (regularContext) {
    return selector(regularContext)
  }

  // If neither context is available, throw an error
  throw new Error(
    'useSmartCalendarContext must be used within a CalendarProvider or ResourceCalendarProvider'
  )
}
