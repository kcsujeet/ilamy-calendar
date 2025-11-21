import { describe, expect, it } from 'bun:test'
import dayjs from '@/lib/configs/dayjs-config'
import type { CalendarEvent } from '@/components/types'
import { RRule } from 'rrule'
import { exportToICalendar } from './export-ical'

// Helper to create minimal valid event
const createEvent = (
  overrides: Partial<CalendarEvent> = {}
): CalendarEvent => ({
  id: 'test-event',
  title: 'Test Event',
  start: dayjs('2025-08-04T09:00:00.000Z'),
  end: dayjs('2025-08-04T10:00:00.000Z'),
  ...overrides,
})

// Helper to extract VEVENT content from iCal
const extractVEvent = (ical: string, index = 0): string => {
  const matches = ical.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g)
  return matches?.[index] || ''
}

describe('iCalendar Export', () => {
  const sampleEvents: CalendarEvent[] = [
    {
      id: 'simple-1',
      title: 'Simple Meeting',
      start: dayjs('2025-08-04T09:00:00.000Z'),
      end: dayjs('2025-08-04T10:00:00.000Z'),
      description: 'A simple test meeting',
      location: 'Conference Room A',
      uid: 'simple-1@ilamy.calendar',
    },
    {
      id: 'recurring-1',
      title: 'Weekly Standup',
      start: dayjs('2025-08-04T14:00:00.000Z'),
      end: dayjs('2025-08-04T14:30:00.000Z'),
      description: 'Team standup meeting',
      rrule: {
        freq: RRule.WEEKLY,
        interval: 1,
        byweekday: [RRule.MO],
        dtstart: dayjs('2025-08-04T14:00:00.000Z').toDate(),
      },
      uid: 'recurring-1@ilamy.calendar',
    },
    {
      id: 'all-day-1',
      title: 'Company Holiday',
      start: dayjs('2025-12-25T00:00:00.000Z'),
      end: dayjs('2025-12-26T00:00:00.000Z'),
      allDay: true,
      uid: 'all-day-1@ilamy.calendar',
    },
  ]

  it('should generate valid iCalendar header and footer', () => {
    const ical = exportToICalendar(sampleEvents)

    expect(ical).toContain('BEGIN:VCALENDAR')
    expect(ical).toContain('VERSION:2.0')
    expect(ical).toContain('PRODID:-//ilamy//ilamy Calendar//EN')
    expect(ical).toContain('END:VCALENDAR')
  })

  it('should export simple events correctly', () => {
    const ical = exportToICalendar([sampleEvents[0]])

    expect(ical).toContain('BEGIN:VEVENT')
    expect(ical).toContain('UID:simple-1@ilamy.calendar')
    expect(ical).toContain('SUMMARY:Simple Meeting')
    expect(ical).toContain('DESCRIPTION:A simple test meeting')
    expect(ical).toContain('LOCATION:Conference Room A')
    expect(ical).toContain('DTSTART:20250804T090000Z')
    expect(ical).toContain('DTEND:20250804T100000Z')
    expect(ical).toContain('END:VEVENT')
  })

  it('should export recurring events with RRULE', () => {
    const ical = exportToICalendar([sampleEvents[1]])

    expect(ical).toContain('BEGIN:VEVENT')
    expect(ical).toContain('UID:recurring-1@ilamy.calendar')
    expect(ical).toContain('SUMMARY:Weekly Standup')
    expect(ical).toContain('RRULE:')
    expect(ical).toContain('FREQ=WEEKLY')
    expect(ical).toContain('END:VEVENT')
  })

  it('should export all-day events correctly', () => {
    const ical = exportToICalendar([sampleEvents[2]])

    expect(ical).toContain('BEGIN:VEVENT')
    expect(ical).toContain('UID:all-day-1@ilamy.calendar')
    expect(ical).toContain('SUMMARY:Company Holiday')
    expect(ical).toContain('DTSTART;VALUE=DATE:20251225')
    expect(ical).toContain('DTEND;VALUE=DATE:20251226')
    expect(ical).toContain('END:VEVENT')
  })

  it('should export multiple events', () => {
    const ical = exportToICalendar(sampleEvents)

    // Should contain all three events
    const eventCount = (ical.match(/BEGIN:VEVENT/g) || []).length
    expect(eventCount).toBe(3)

    expect(ical).toContain('simple-1@ilamy.calendar')
    expect(ical).toContain('recurring-1@ilamy.calendar')
    expect(ical).toContain('all-day-1@ilamy.calendar')
  })

  it('should escape special characters in text fields', () => {
    const eventWithSpecialChars: CalendarEvent = {
      id: 'special-1',
      title: 'Meeting; with, special\\ncharacters',
      start: dayjs('2025-08-04T09:00:00.000Z'),
      end: dayjs('2025-08-04T10:00:00.000Z'),
      description: 'Description with\nnewlines and; semicolons, commas',
      uid: 'special-1@ilamy.calendar',
    }

    const ical = exportToICalendar([eventWithSpecialChars])

    expect(ical).toContain('SUMMARY:Meeting\\; with\\, special\\\\ncharacters')
    expect(ical).toContain(
      'DESCRIPTION:Description with\\nnewlines and\\; semicolons\\, commas'
    )
  })

  it('should handle events with EXDATE', () => {
    const eventWithExdates: CalendarEvent = {
      id: 'exdate-1',
      title: 'Recurring with Exceptions',
      start: dayjs('2025-08-04T09:00:00.000Z'),
      end: dayjs('2025-08-04T10:00:00.000Z'),
      rrule: {
        freq: RRule.DAILY,
        interval: 1,
        dtstart: dayjs('2025-08-04T09:00:00.000Z').toDate(),
      },
      exdates: ['2025-08-05T09:00:00.000Z', '2025-08-07T09:00:00.000Z'],
      uid: 'exdate-1@ilamy.calendar',
    }

    const ical = exportToICalendar([eventWithExdates])

    expect(ical).toContain('RRULE:')
    expect(ical).toContain('EXDATE:20250805T090000Z,20250807T090000Z')
  })

  it('should handle events with recurrenceId (modified instances)', () => {
    const modifiedInstance: CalendarEvent = {
      id: 'modified-1',
      title: 'Modified Instance',
      start: dayjs('2025-08-04T10:00:00.000Z'),
      end: dayjs('2025-08-04T11:00:00.000Z'),
      recurrenceId: '2025-08-04T09:00:00.000Z',
      uid: 'recurring-1@ilamy.calendar',
    }

    const ical = exportToICalendar([modifiedInstance])

    expect(ical).toContain('RECURRENCE-ID:20250804T090000Z')
    expect(ical).toContain('UID:recurring-1@ilamy.calendar')
  })

  it('should include timezone information', () => {
    const ical = exportToICalendar(sampleEvents)

    expect(ical).toContain('BEGIN:VTIMEZONE')
    expect(ical).toContain('TZID:UTC')
    expect(ical).toContain('END:VTIMEZONE')
  })

  it('should filter out generated recurring instances but keep base events', () => {
    const eventsWithInstances: CalendarEvent[] = [
      // Base recurring event - should be included
      {
        id: 'recurring-base',
        title: 'Weekly Meeting',
        start: dayjs('2025-01-15T10:00:00'),
        end: dayjs('2025-01-15T11:00:00'),
        rrule: {
          freq: RRule.WEEKLY,
          byweekday: [RRule.MO],
          interval: 1,
          dtstart: dayjs('2025-01-15T10:00:00').toDate(),
        },
        uid: 'weekly-meeting@calendar.com',
      },
      // Generated instance - should be filtered out
      {
        id: 'recurring-base_0',
        title: 'Weekly Meeting',
        start: dayjs('2025-01-15T10:00:00'),
        end: dayjs('2025-01-15T11:00:00'),
        uid: 'weekly-meeting@calendar.com',
      },
      // Another generated instance - should be filtered out
      {
        id: 'recurring-base_1',
        title: 'Weekly Meeting',
        start: dayjs('2025-01-22T10:00:00'),
        end: dayjs('2025-01-22T11:00:00'),
        uid: 'weekly-meeting@calendar.com',
      },
      // Modified instance - should be included
      {
        id: 'recurring-base_modified',
        title: 'Modified Weekly Meeting',
        start: dayjs('2025-01-29T14:00:00'),
        end: dayjs('2025-01-29T15:00:00'),
        recurrenceId: '2025-01-29T10:00:00.000Z',
        uid: 'weekly-meeting@calendar.com',
      },
      // Non-recurring event - should be included
      {
        id: 'single-event',
        title: 'One-time Meeting',
        start: dayjs('2025-01-16T15:00:00'),
        end: dayjs('2025-01-16T16:00:00'),
      },
    ]

    const ical = exportToICalendar(eventsWithInstances)

    // Should contain exactly 3 events: base recurring, modified instance, and single event
    const eventCount = (ical.match(/BEGIN:VEVENT/g) || []).length
    expect(eventCount).toBe(3)

    // Base recurring event should be included with RRULE
    expect(ical).toContain('UID:weekly-meeting@calendar.com')
    expect(ical).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO;INTERVAL=1')

    // Modified instance should be included with RECURRENCE-ID
    expect(ical).toContain('RECURRENCE-ID:20250129T100000Z')
    expect(ical).toContain('SUMMARY:Modified Weekly Meeting')

    // Single event should be included
    expect(ical).toContain('UID:single-event@ilamy.calendar')
    expect(ical).toContain('SUMMARY:One-time Meeting')

    // Generated instances should NOT be included (no separate UID events for them)
    const uidCount = (ical.match(/UID:weekly-meeting@calendar\.com/g) || [])
      .length
    expect(uidCount).toBe(2) // Only base event and modified instance should be exported
  })
})

describe('RFC 5545 Compliance', () => {
  it('should use CRLF line endings as per RFC 5545', () => {
    const ical = exportToICalendar([createEvent()])
    // RFC 5545 requires CRLF (\r\n) line endings
    expect(ical).toContain('\r\n')
    // Should not have bare LF
    expect(ical.split('\r\n').length).toBeGreaterThan(10)
  })

  it('should include required VCALENDAR properties', () => {
    const ical = exportToICalendar([createEvent()])
    expect(ical).toMatch(/^BEGIN:VCALENDAR/)
    expect(ical).toContain('VERSION:2.0')
    expect(ical).toContain('PRODID:')
    expect(ical).toContain('CALSCALE:GREGORIAN')
    expect(ical).toContain('METHOD:PUBLISH')
    expect(ical).toMatch(/END:VCALENDAR\s*$/)
  })

  it('should include required VEVENT properties', () => {
    const ical = exportToICalendar([
      createEvent({ uid: 'test-uid@example.com' }),
    ])
    const vevent = extractVEvent(ical)

    expect(vevent).toContain('UID:test-uid@example.com')
    expect(vevent).toContain('DTSTART:')
    expect(vevent).toContain('DTEND:')
    expect(vevent).toContain('DTSTAMP:')
    expect(vevent).toContain('SUMMARY:')
  })

  it('should format UTC dates correctly (YYYYMMDDTHHMMSSZ)', () => {
    const event = createEvent({
      start: dayjs('2025-08-04T09:30:00.000Z'),
      end: dayjs('2025-08-04T10:45:00.000Z'),
    })
    const ical = exportToICalendar([event])

    expect(ical).toContain('DTSTART:20250804T093000Z')
    expect(ical).toContain('DTEND:20250804T104500Z')
  })

  it('should format all-day dates correctly (YYYYMMDD with VALUE=DATE)', () => {
    const event = createEvent({
      start: dayjs('2025-08-04T00:00:00.000Z'),
      end: dayjs('2025-08-05T00:00:00.000Z'),
      allDay: true,
    })
    const ical = exportToICalendar([event])

    expect(ical).toContain('DTSTART;VALUE=DATE:20250804')
    expect(ical).toContain('DTEND;VALUE=DATE:20250805')
  })
})

describe('Text Escaping (RFC 5545 Section 3.3.11)', () => {
  it('should escape backslashes', () => {
    const event = createEvent({ title: 'Path with\\backslash' })
    const ical = exportToICalendar([event])
    // Each \ in input becomes \\ in output
    expect(ical).toContain('SUMMARY:Path with\\\\backslash')
  })

  it('should escape semicolons', () => {
    const event = createEvent({ title: 'Meeting; Important' })
    const ical = exportToICalendar([event])
    expect(ical).toContain('SUMMARY:Meeting\\; Important')
  })

  it('should escape commas', () => {
    const event = createEvent({ title: 'Review: A, B, C' })
    const ical = exportToICalendar([event])
    expect(ical).toContain('SUMMARY:Review: A\\, B\\, C')
  })

  it('should escape newlines as \\n', () => {
    const event = createEvent({ description: 'Line 1\nLine 2\nLine 3' })
    const ical = exportToICalendar([event])
    expect(ical).toContain('DESCRIPTION:Line 1\\nLine 2\\nLine 3')
  })

  it('should remove carriage returns', () => {
    const event = createEvent({ description: 'Text\r\nwith\r\nCRLF' })
    const ical = exportToICalendar([event])
    // \r should be removed, \n should be escaped
    expect(ical).toContain('DESCRIPTION:Text\\nwith\\nCRLF')
  })

  it('should handle all special characters together', () => {
    const event = createEvent({
      title: 'Test; with, special\nchars',
      description: 'More; commas, here\nand lines',
      location: 'Room A; Floor 2, Building',
    })
    const ical = exportToICalendar([event])

    // Verify semicolons, commas, and newlines are escaped
    expect(ical).toContain('SUMMARY:Test\\; with\\, special\\nchars')
    expect(ical).toContain('DESCRIPTION:More\\; commas\\, here\\nand lines')
    expect(ical).toContain('LOCATION:Room A\\; Floor 2\\, Building')
  })
})

describe('UID Generation', () => {
  it('should use existing uid if provided', () => {
    const event = createEvent({ uid: 'custom-uid@my-domain.com' })
    const ical = exportToICalendar([event])
    expect(ical).toContain('UID:custom-uid@my-domain.com')
  })

  it('should generate UID from id if uid not provided', () => {
    const event = createEvent({ id: 'my-event-123' })
    const ical = exportToICalendar([event])
    expect(ical).toContain('UID:my-event-123@ilamy.calendar')
  })

  it('should generate unique UIDs for different events', () => {
    const events = [
      createEvent({ id: 'event-1' }),
      createEvent({ id: 'event-2' }),
      createEvent({ id: 'event-3' }),
    ]
    const ical = exportToICalendar(events)

    expect(ical).toContain('UID:event-1@ilamy.calendar')
    expect(ical).toContain('UID:event-2@ilamy.calendar')
    expect(ical).toContain('UID:event-3@ilamy.calendar')
  })
})

describe('RRULE Formatting', () => {
  it('should format daily recurrence', () => {
    const event = createEvent({
      rrule: {
        freq: RRule.DAILY,
        interval: 1,
        dtstart: dayjs('2025-08-04T09:00:00.000Z').toDate(),
      },
    })
    const ical = exportToICalendar([event])
    expect(ical).toContain('RRULE:FREQ=DAILY;INTERVAL=1')
  })

  it('should format weekly recurrence with specific days', () => {
    const event = createEvent({
      rrule: {
        freq: RRule.WEEKLY,
        interval: 2,
        byweekday: [RRule.MO, RRule.WE, RRule.FR],
        dtstart: dayjs('2025-08-04T09:00:00.000Z').toDate(),
      },
    })
    const ical = exportToICalendar([event])
    expect(ical).toContain('RRULE:')
    expect(ical).toContain('FREQ=WEEKLY')
    expect(ical).toContain('INTERVAL=2')
    expect(ical).toMatch(/BYDAY=.*MO/)
    expect(ical).toMatch(/BYDAY=.*WE/)
    expect(ical).toMatch(/BYDAY=.*FR/)
  })

  it('should format monthly recurrence', () => {
    const event = createEvent({
      rrule: {
        freq: RRule.MONTHLY,
        interval: 1,
        dtstart: dayjs('2025-08-04T09:00:00.000Z').toDate(),
      },
    })
    const ical = exportToICalendar([event])
    expect(ical).toContain('RRULE:FREQ=MONTHLY;INTERVAL=1')
  })

  it('should format recurrence with count', () => {
    const event = createEvent({
      rrule: {
        freq: RRule.DAILY,
        interval: 1,
        count: 10,
        dtstart: dayjs('2025-08-04T09:00:00.000Z').toDate(),
      },
    })
    const ical = exportToICalendar([event])
    expect(ical).toContain('RRULE:')
    expect(ical).toContain('COUNT=10')
  })

  it('should format recurrence with until date', () => {
    const event = createEvent({
      rrule: {
        freq: RRule.DAILY,
        interval: 1,
        until: dayjs('2025-12-31T23:59:59.000Z').toDate(),
        dtstart: dayjs('2025-08-04T09:00:00.000Z').toDate(),
      },
    })
    const ical = exportToICalendar([event])
    expect(ical).toContain('RRULE:')
    expect(ical).toContain('UNTIL=')
  })

  it('should handle invalid rrule gracefully', () => {
    const event = createEvent({
      rrule: { invalid: 'data' } as unknown as CalendarEvent['rrule'],
    })
    // Should not throw
    expect(() => exportToICalendar([event])).not.toThrow()
  })
})

describe('Event Filtering', () => {
  it('should include base recurring events', () => {
    const baseEvent = createEvent({
      id: 'recurring-base',
      rrule: { freq: RRule.DAILY, interval: 1, dtstart: new Date() },
      uid: 'recurring@test.com',
    })
    const ical = exportToICalendar([baseEvent])
    expect(extractVEvent(ical)).toContain('UID:recurring@test.com')
    expect(extractVEvent(ical)).toContain('RRULE:')
  })

  it('should include modified instances with recurrenceId', () => {
    const modifiedInstance = createEvent({
      id: 'modified-instance',
      recurrenceId: '2025-08-04T09:00:00.000Z',
      uid: 'recurring@test.com',
    })
    const ical = exportToICalendar([modifiedInstance])
    expect(extractVEvent(ical)).toContain('RECURRENCE-ID:20250804T090000Z')
  })

  it('should include non-recurring events', () => {
    const singleEvent = createEvent({ id: 'single', title: 'Single Event' })
    const ical = exportToICalendar([singleEvent])
    expect(extractVEvent(ical)).toContain('SUMMARY:Single Event')
  })

  it('should filter out generated instances with same UID as base event', () => {
    const events = [
      // Base event
      createEvent({
        id: 'base',
        rrule: { freq: RRule.DAILY, interval: 1, dtstart: new Date() },
        uid: 'recurring@test.com',
      }),
      // Generated instance (same UID, no rrule, no recurrenceId)
      createEvent({
        id: 'base_0',
        uid: 'recurring@test.com',
      }),
      createEvent({
        id: 'base_1',
        uid: 'recurring@test.com',
      }),
    ]
    const ical = exportToICalendar(events)

    // Should only have 1 VEVENT (the base event)
    const eventCount = (ical.match(/BEGIN:VEVENT/g) || []).length
    expect(eventCount).toBe(1)
  })
})

describe('Optional Fields', () => {
  it('should include description when provided', () => {
    const event = createEvent({ description: 'Event description' })
    const ical = exportToICalendar([event])
    expect(ical).toContain('DESCRIPTION:Event description')
  })

  it('should not include DESCRIPTION field when not provided', () => {
    const event = createEvent({ description: undefined })
    const ical = exportToICalendar([event])
    expect(ical).not.toContain('DESCRIPTION:')
  })

  it('should include location when provided', () => {
    const event = createEvent({ location: 'Conference Room A' })
    const ical = exportToICalendar([event])
    expect(ical).toContain('LOCATION:Conference Room A')
  })

  it('should not include LOCATION field when not provided', () => {
    const event = createEvent({ location: undefined })
    const ical = exportToICalendar([event])
    expect(ical).not.toContain('LOCATION:')
  })

  it('should include EXDATE when exdates provided', () => {
    const event = createEvent({
      rrule: { freq: RRule.DAILY, interval: 1, dtstart: new Date() },
      exdates: ['2025-08-05T09:00:00.000Z', '2025-08-06T09:00:00.000Z'],
    })
    const ical = exportToICalendar([event])
    expect(ical).toContain('EXDATE:')
    expect(ical).toContain('20250805T090000Z')
    expect(ical).toContain('20250806T090000Z')
  })

  it('should not include EXDATE when exdates empty', () => {
    const event = createEvent({ exdates: [] })
    const ical = exportToICalendar([event])
    expect(ical).not.toContain('EXDATE:')
  })
})

describe('Calendar Metadata', () => {
  it('should use default calendar name', () => {
    const ical = exportToICalendar([createEvent()])
    expect(ical).toContain('X-WR-CALNAME:ilamy Calendar')
  })

  it('should use custom calendar name', () => {
    const ical = exportToICalendar([createEvent()], 'My Custom Calendar')
    expect(ical).toContain('X-WR-CALNAME:My Custom Calendar')
    expect(ical).toContain('X-WR-CALDESC:Exported from My Custom Calendar')
  })

  it('should escape special characters in calendar name', () => {
    const ical = exportToICalendar([createEvent()], 'Work; Personal, Events')
    expect(ical).toContain('X-WR-CALNAME:Work\\; Personal\\, Events')
  })
})

describe('Edge Cases', () => {
  it('should handle empty events array', () => {
    const ical = exportToICalendar([])

    expect(ical).toContain('BEGIN:VCALENDAR')
    expect(ical).toContain('END:VCALENDAR')
    expect(ical).not.toContain('BEGIN:VEVENT')
  })

  it('should handle event with minimal required fields', () => {
    const minimalEvent: CalendarEvent = {
      id: 'minimal',
      title: 'Minimal',
      start: dayjs('2025-08-04T09:00:00.000Z'),
      end: dayjs('2025-08-04T10:00:00.000Z'),
    }
    const ical = exportToICalendar([minimalEvent])

    expect(ical).toContain('BEGIN:VEVENT')
    expect(ical).toContain('UID:minimal@ilamy.calendar')
    expect(ical).toContain('SUMMARY:Minimal')
    expect(ical).toContain('DTSTART:20250804T090000Z')
    expect(ical).toContain('DTEND:20250804T100000Z')
    expect(ical).toContain('END:VEVENT')
  })

  it('should handle event with empty title', () => {
    const event = createEvent({ title: '' })
    const ical = exportToICalendar([event])
    expect(ical).toContain('SUMMARY:')
  })

  it('should handle event with very long title', () => {
    const longTitle = 'A'.repeat(200)
    const event = createEvent({ title: longTitle })
    const ical = exportToICalendar([event])
    expect(ical).toContain(`SUMMARY:${longTitle}`)
  })

  it('should include standard VEVENT fields', () => {
    const event = createEvent()
    const ical = exportToICalendar([event])
    const vevent = extractVEvent(ical)

    expect(vevent).toContain('STATUS:CONFIRMED')
    expect(vevent).toContain('SEQUENCE:0')
    expect(vevent).toContain('TRANSP:OPAQUE')
    expect(vevent).toContain('CREATED:')
    expect(vevent).toContain('LAST-MODIFIED:')
  })

  it('should handle large number of events', () => {
    const events = Array.from({ length: 100 }, (_, i) =>
      createEvent({ id: `event-${i}`, title: `Event ${i}` })
    )
    const ical = exportToICalendar(events)

    const eventCount = (ical.match(/BEGIN:VEVENT/g) || []).length
    expect(eventCount).toBe(100)
  })
})
