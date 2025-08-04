import { describe, expect, it } from 'bun:test'
import dayjs from '@/lib/dayjs-config'
import type { CalendarEvent } from '@/components/types'
import { RRule } from 'rrule'
import { exportToICalendar } from './export-ical'

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
