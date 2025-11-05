import { describe, it, expect } from 'bun:test'
import type { DragEndEvent } from '@dnd-kit/core'
import dayjs from '@/lib/configs/dayjs-config'
import { getUpdatedEvent } from './dnd-utils'

let cellType = 'day-cell'
let cellDate = dayjs('2024-10-15T00:00:00')
let cellResourceId = undefined
let allDayCell = false
let hour = undefined
let minute = undefined

const getDragEvent = () => ({
  active: {
    id: 'event-1',
  },
  over: {
    id: 'time-cell-2024-06-15-10-30',
    data: {
      current: {
        type: cellType,
        date: cellDate,
        allDay: allDayCell,
        resourceId: cellResourceId,
        hour: hour,
        minute: minute,
      },
    },
  },
})

let start = dayjs('2024-06-15T00:00:00')
let end = dayjs('2024-06-15T23:59:59')
let allDay = false
let resourceId = undefined
const getActiveEvent = () => ({
  id: 'event-1',
  title: 'Sample Event',
  start: start,
  end: end,
  allDay: allDay,
  resourceId: resourceId,
})

describe('getUpdatedEvent Utility Function', () => {
  it('should return null if active or over is missing', () => {
    const result = getUpdatedEvent(
      { active: null, over: null } as DragEndEvent,
      null
    )
    expect(result).toBeNull()
  })

  it('should return null if activeEvent is null', () => {
    const result = getUpdatedEvent(
      getDragEvent() as unknown as DragEndEvent,
      null
    )
    expect(result).toBeNull()
  })

  it('should calculate new start and end times correctly for day-cell drop', () => {
    const result = getUpdatedEvent(
      getDragEvent() as unknown as DragEndEvent,
      getActiveEvent()
    )
    expect(result).not.toBeNull()
    const { updates } = result
    expect(updates.start.format()).toBe(cellDate.format())
    expect(updates.end.format()).toBe(
      cellDate.add(end.diff(start, 'second'), 'second').format()
    )
    expect(updates.allDay).toBe(false)
  })

  describe('should handle all-day conversions correctly', () => {
    it('should convert timed event to all-day when dropped on all-day cell', () => {
      cellDate = dayjs('2024-10-25T00:00:00')
      allDayCell = true

      const result = getUpdatedEvent(
        getDragEvent() as unknown as DragEndEvent,
        getActiveEvent()
      )
      expect(result).not.toBeNull()
      const { updates } = result
      expect(updates.allDay).toBe(true)
      expect(updates.start.format()).toBe(dayjs(cellDate).format())
      expect(updates.end.diff(updates.start, 'second')).toBe(
        end.diff(start, 'second')
      )
    })

    it('should convert all-day event to non-all-day when dropped on non-all-day cell', () => {
      allDay = true
      allDayCell = false

      const result = getUpdatedEvent(
        getDragEvent() as unknown as DragEndEvent,
        getActiveEvent()
      )
      expect(result).not.toBeNull()
      const { updates } = result
      expect(updates.allDay).toBe(false)
      expect(updates.start.format()).toBe(dayjs(cellDate).format())
      expect(updates.end.diff(updates.start, 'second')).toBe(
        end.diff(start, 'second')
      )
    })

    it('should retain all-day status when dropping all-day event on cell with all-day flag not defined', () => {
      allDay = true
      allDayCell = undefined

      const result = getUpdatedEvent(
        getDragEvent() as unknown as DragEndEvent,
        getActiveEvent()
      )
      expect(result).not.toBeNull()
      const { updates } = result
      expect(updates.allDay).toBe(true)
    })
  })

  it('should update resourceId when dropping on a cell with different resourceId', () => {
    resourceId = 'resource-1'
    cellResourceId = 'resource-2'

    const result = getUpdatedEvent(
      getDragEvent() as unknown as DragEndEvent,
      getActiveEvent()
    )
    expect(result).not.toBeNull()
    const { updates } = result
    expect(updates.resourceId).toBe(cellResourceId)
  })

  it('should calculate new start and end times correctly for time-cell drop', () => {
    cellDate = dayjs('2024-10-20T00:00:00.000Z')
    cellType = 'time-cell'
    hour = 14
    minute = 30

    const result = getUpdatedEvent(
      getDragEvent() as unknown as DragEndEvent,
      getActiveEvent()
    )
    expect(result).not.toBeNull()
    const { updates } = result
    const expectedStart = dayjs(cellDate).hour(hour).minute(minute)
    const expectedEnd = expectedStart.add(end.diff(start, 'second'), 'second')
    expect(updates.start.toISOString()).toBe(expectedStart.toISOString())
    expect(updates.end.toISOString()).toBe(expectedEnd.toISOString())
    expect(updates.allDay).toBe(false)
  })

  it('should set all-day to false when dropping on time-cell even if original event was all-day', () => {
    allDay = true
    cellType = 'time-cell'
    hour = 9
    minute = 0

    const result = getUpdatedEvent(
      getDragEvent() as unknown as DragEndEvent,
      getActiveEvent()
    )
    expect(result).not.toBeNull()
    const { updates } = result
    expect(updates.allDay).toBe(false)
  })

  it('should handle event end time at midnight correctly', () => {
    start = dayjs('2024-06-15T22:00:00')
    end = dayjs('2024-06-16T00:00:00') // End time at midnight (2 hour duration)
    cellType = 'day-cell'
    cellDate = dayjs('2024-10-22T22:00:00')
    allDay = false
    hour = undefined
    minute = undefined

    const result = getUpdatedEvent(
      getDragEvent() as unknown as DragEndEvent,
      getActiveEvent()
    )
    expect(result).not.toBeNull()
    const { updates } = result
    expect(updates.start.format()).toBe(cellDate.format())
    // When end time lands exactly at midnight, it should be adjusted to 23:59 of the same day
    expect(updates.end.format()).toBe(cellDate.endOf('day').format())
  })

  it('should handle dragging multi-day all-day event to time cell correctly', () => {
    // Event ID 15 from seed.ts: Conference Nov 4-6 (all-day)
    // Using endOf('day') for all-day events: Nov 4 00:00:00 to Nov 6 23:59:59.999
    start = dayjs('2024-11-04T00:00:00.000Z')
    end = dayjs('2024-11-06T23:59:59.999Z')
    allDay = true
    cellType = 'time-cell'
    cellDate = dayjs('2024-11-04T00:00:00.000Z')
    hour = 1
    minute = 0
    cellResourceId = undefined

    const result = getUpdatedEvent(
      getDragEvent() as unknown as DragEndEvent,
      getActiveEvent()
    )
    expect(result).not.toBeNull()
    const { updates } = result

    // CURRENT BEHAVIOR (with second precision):
    // - Original duration: 2 days 23h 59m 59.999s (using endOf('day'))
    // - Duration in seconds: 259199 (loses millisecond precision)
    // - Start: Nov 4 01:00:00
    // - End: Nov 4 01:00:00 + 259199 sec = Nov 7 00:59:59
    expect(updates.start.toISOString()).toBe('2024-11-04T01:00:00.000Z')
    expect(updates.end.toISOString()).toBe('2024-11-07T00:59:59.000Z')
    expect(updates.allDay).toBe(false)

    // NOTE: Still 1 second off from ideal behavior due to millisecond truncation
    // - Ideal: Nov 7 01:00:00 (3 full days later)
    // - Actual: Nov 7 00:59:59 (loses .999ms when using second precision)
    // - To fully fix: would need millisecond precision instead of second
  })
})
