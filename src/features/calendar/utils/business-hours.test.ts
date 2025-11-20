import { describe, expect, it } from 'bun:test'
import dayjs from '@/lib/configs/dayjs-config'
import { isBusinessHour } from './business-hours'
import type { BusinessHours } from '@/components/types'

describe('isBusinessHour', () => {
  const monday = dayjs('2025-01-06') // Monday
  const sunday = dayjs('2025-01-05') // Sunday

  it('should return true when businessHours is undefined', () => {
    expect(isBusinessHour({ date: monday, hour: 10, minute: 0 })).toBe(true)
  })

  it('should respect custom businessHours object', () => {
    const config: BusinessHours = {
      daysOfWeek: ['monday'], // Monday only
      startTime: 10,
      endTime: 14,
    }
    expect(
      isBusinessHour({
        date: monday,
        hour: 11,
        minute: 0,
        businessHours: config,
      })
    ).toBe(true)
    expect(
      isBusinessHour({
        date: monday,
        hour: 9,
        minute: 0,
        businessHours: config,
      })
    ).toBe(false)
    expect(
      isBusinessHour({
        date: monday,
        hour: 14,
        minute: 0,
        businessHours: config,
      })
    ).toBe(false)
    expect(
      isBusinessHour({
        date: sunday,
        hour: 11,
        minute: 0,
        businessHours: config,
      })
    ).toBe(false)
  })

  it('should handle minutes correctly', () => {
    // Note: With integer hours, we can't specify 9:30 start time in config anymore
    // But we can test if 9:30 falls within 9-17 range
    const config: BusinessHours = {
      daysOfWeek: ['monday'],
      startTime: 9,
      endTime: 17,
    }

    expect(
      isBusinessHour({
        date: monday,
        hour: 8,
        minute: 59,
        businessHours: config,
      })
    ).toBe(false) // 8:59 -> false
    expect(
      isBusinessHour({
        date: monday,
        hour: 9,
        minute: 0,
        businessHours: config,
      })
    ).toBe(true) // 9:00 -> true
    expect(
      isBusinessHour({
        date: monday,
        hour: 9,
        minute: 30,
        businessHours: config,
      })
    ).toBe(true) // 9:30 -> true
    expect(
      isBusinessHour({
        date: monday,
        hour: 16,
        minute: 59,
        businessHours: config,
      })
    ).toBe(true) // 16:59 -> true
    expect(
      isBusinessHour({
        date: monday,
        hour: 17,
        minute: 0,
        businessHours: config,
      })
    ).toBe(false) // 17:00 -> false
  })

  it('should work correctly regardless of firstDayOfWeek setting', () => {
    // This test verifies that isBusinessHour relies on the absolute date,
    // not on any relative week index.
    // We simulate this by checking a Sunday and a Monday.
    // Sunday is day 0, Monday is day 1 in dayjs.

    const sundayDate = dayjs('2025-01-05') // Sunday
    const mondayDate = dayjs('2025-01-06') // Monday

    const config: BusinessHours = {
      daysOfWeek: ['monday'], // Only Monday is business day
      startTime: 9,
      endTime: 17,
    }

    expect(
      isBusinessHour({
        date: sundayDate,
        hour: 10,
        minute: 0,
        businessHours: config,
      })
    ).toBe(false)
    expect(
      isBusinessHour({
        date: mondayDate,
        hour: 10,
        minute: 0,
        businessHours: config,
      })
    ).toBe(true)

    // Even if we had a config that included Sunday
    const sundayConfig: BusinessHours = {
      daysOfWeek: ['sunday'],
      startTime: 9,
      endTime: 17,
    }
    expect(
      isBusinessHour({
        date: sundayDate,
        hour: 10,
        minute: 0,
        businessHours: sundayConfig,
      })
    ).toBe(true)
    expect(
      isBusinessHour({
        date: mondayDate,
        hour: 10,
        minute: 0,
        businessHours: sundayConfig,
      })
    ).toBe(false)
  })

  it('should check only day if hour is undefined', () => {
    const config: BusinessHours = {
      daysOfWeek: ['monday'],
      startTime: 9,
      endTime: 17,
    }

    // Monday is a business day -> true
    expect(isBusinessHour({ date: monday, businessHours: config })).toBe(true)

    // Sunday is not a business day -> false
    expect(isBusinessHour({ date: sunday, businessHours: config })).toBe(false)
  })
})
