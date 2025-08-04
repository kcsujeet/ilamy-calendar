import type { CalendarEvent } from '@/components/types'
import dayjs from '@/lib/dayjs-config'
import { RRule } from 'rrule'

/**
 * Export calendar events to iCalendar (.ical) format
 * Fully RFC 5545 compliant iCalendar generation
 */

/**
 * Escape special characters in iCalendar text fields
 */
const escapeICalText = (text: string): string => {
  return text
    .replaceAll('\\', '\\\\') // Escape backslashes
    .replaceAll(';', '\\;') // Escape semicolons
    .replaceAll(',', '\\,') // Escape commas
    .replaceAll('\n', '\\n') // Escape newlines
    .replaceAll('\r', '') // Remove carriage returns
}

/**
 * Format date for iCalendar format (YYYYMMDDTHHMMSSZ for UTC)
 */
const formatICalDate = (date: dayjs.Dayjs, allDay = false): string => {
  if (allDay) {
    return date.format('YYYYMMDD')
  }
  return date.utc().format('YYYYMMDD[T]HHmmss[Z]')
}

/**
 * Generate a unique UID for an event if not already present
 */
const generateUID = (event: CalendarEvent): string => {
  if (event.uid) {
    return event.uid
  }
  return `${event.id}@ilamy.calendar`
}

/**
 * Convert RRuleOptions to iCalendar RRULE string
 */
const formatRRule = (rruleOptions: unknown): string => {
  try {
    // Create RRule instance with appropriate type casting
    const rule = new RRule(
      rruleOptions as ConstructorParameters<typeof RRule>[0]
    )
    const rruleString = rule.toString()
    // Extract just the RRULE part (remove DTSTART if present)
    const rrulePart = rruleString
      .split('\n')
      .find((line) => line.startsWith('RRULE:'))
    return rrulePart || ''
  } catch {
    return ''
  }
}

/**
 * Convert a single CalendarEvent to iCalendar VEVENT string
 */
const eventToICalEvent = (event: CalendarEvent): string => {
  const lines: string[] = []

  lines.push('BEGIN:VEVENT')

  // UID (required)
  lines.push(`UID:${generateUID(event)}`)

  // DTSTART (required)
  const dtstart = formatICalDate(event.start, event.allDay)
  if (event.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${dtstart}`)
  } else {
    lines.push(`DTSTART:${dtstart}`)
  }

  // DTEND (required for events with duration)
  const dtend = formatICalDate(event.end, event.allDay)
  if (event.allDay) {
    lines.push(`DTEND;VALUE=DATE:${dtend}`)
  } else {
    lines.push(`DTEND:${dtend}`)
  }

  // SUMMARY (title)
  lines.push(`SUMMARY:${escapeICalText(event.title)}`)

  // DESCRIPTION (optional)
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICalText(event.description)}`)
  }

  // LOCATION (optional)
  if (event.location) {
    lines.push(`LOCATION:${escapeICalText(event.location)}`)
  }

  // RRULE (recurrence rule)
  if (event.rrule) {
    const rruleString = formatRRule(event.rrule)
    if (rruleString) {
      lines.push(rruleString)
    }
  }

  // EXDATE (exception dates)
  if (event.exdates && event.exdates.length > 0) {
    const exdates = event.exdates
      .map((dateStr) => formatICalDate(dayjs(dateStr), event.allDay))
      .join(',')
    lines.push(`EXDATE:${exdates}`)
  }

  // RECURRENCE-ID (for modified instances)
  if (event.recurrenceId) {
    const recurrenceId = formatICalDate(dayjs(event.recurrenceId), event.allDay)
    lines.push(`RECURRENCE-ID:${recurrenceId}`)
  }

  // DTSTAMP (required - when this was created/modified)
  const now = dayjs().utc().format('YYYYMMDD[T]HHmmss[Z]')
  lines.push(`DTSTAMP:${now}`)

  // CREATED (when event was created)
  lines.push(`CREATED:${now}`)

  // LAST-MODIFIED (when event was last modified)
  lines.push(`LAST-MODIFIED:${now}`)

  // STATUS (default to CONFIRMED)
  lines.push('STATUS:CONFIRMED')

  // SEQUENCE (version number, default to 0)
  lines.push('SEQUENCE:0')

  // TRANSP (transparency - OPAQUE for busy time)
  lines.push('TRANSP:OPAQUE')

  lines.push('END:VEVENT')

  return lines.join('\r\n')
}

/**
 * Filter events for proper iCalendar export
 * - Include base recurring events (with RRULE)
 * - Include modified instances (with recurrenceId)
 * - Include non-recurring events
 * - EXCLUDE generated recurring instances (no rrule, no recurrenceId)
 */
const filterEventsForExport = (events: CalendarEvent[]): CalendarEvent[] => {
  const exportEvents: CalendarEvent[] = []
  const processedUIDs = new Set<string>()

  for (const event of events) {
    // Get or generate UID for the event
    const eventUID = event.uid || `${event.id}@ilamy.calendar`

    // Case 1: Base recurring event (has RRULE, no recurrenceId)
    if (event.rrule && !event.recurrenceId) {
      exportEvents.push(event)
      processedUIDs.add(eventUID)
      continue
    }

    // Case 2: Modified recurring instance (has recurrenceId, no RRULE)
    if (event.recurrenceId && !event.rrule) {
      exportEvents.push(event)
      continue
    }

    // Case 3: Non-recurring event (no RRULE, no recurrenceId, no UID pattern)
    if (!event.rrule && !event.recurrenceId) {
      // Check if this is a generated instance by UID pattern
      const isGeneratedInstance = processedUIDs.has(eventUID)

      if (!isGeneratedInstance) {
        exportEvents.push(event)
      }
      // Skip generated instances - they'll be recreated by RRULE
    }
  }

  return exportEvents
}

/**
 * Export events to iCalendar format
 */
export const exportToICalendar = (
  events: CalendarEvent[],
  calendarName = 'ilamy Calendar'
): string => {
  const lines: string[] = []

  // Calendar header
  lines.push('BEGIN:VCALENDAR')
  lines.push('VERSION:2.0')
  lines.push('PRODID:-//ilamy//ilamy Calendar//EN')
  lines.push('CALSCALE:GREGORIAN')
  lines.push('METHOD:PUBLISH')
  lines.push(`X-WR-CALNAME:${escapeICalText(calendarName)}`)
  lines.push(`X-WR-CALDESC:${escapeICalText(`Exported from ${calendarName}`)}`)

  // Add timezone information (UTC)
  lines.push('BEGIN:VTIMEZONE')
  lines.push('TZID:UTC')
  lines.push('BEGIN:STANDARD')
  lines.push('DTSTART:19700101T000000')
  lines.push('TZNAME:UTC')
  lines.push('TZOFFSETFROM:+0000')
  lines.push('TZOFFSETTO:+0000')
  lines.push('END:STANDARD')
  lines.push('END:VTIMEZONE')

  // Filter events for proper iCalendar export
  const filteredEvents = filterEventsForExport(events)

  // Add each filtered event
  filteredEvents.forEach((event) => {
    lines.push(eventToICalEvent(event))
  })

  // Calendar footer
  lines.push('END:VCALENDAR')

  return lines.join('\r\n')
}

/**
 * Download iCalendar file to user's device
 */
export const downloadICalendar = (
  events: CalendarEvent[],
  filename = 'calendar.ics',
  calendarName = 'ilamy Calendar'
): void => {
  const icalContent = exportToICalendar(events, calendarName)

  // Create blob and download
  const blob = new Blob([icalContent], {
    type: 'text/calendar;charset=utf-8',
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.ics') ? filename : `${filename}.ics`

  // Trigger download
  document.body.append(link)
  link.click()
  document.body.removeChild(link)

  // Clean up
  URL.revokeObjectURL(url)
}
