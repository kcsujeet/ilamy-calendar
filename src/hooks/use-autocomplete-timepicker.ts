import { useMemo } from 'react'
import type { TimeFormat } from '@/types'

interface UseAutocompleteTimepickerProps {
  timeFormat?: TimeFormat
  minTime?: string
  maxTime?: string
}

export function useAutocompleteTimepicker({
  timeFormat = '12-hour',
  minTime = '00:00',
  maxTime = '23:45',
}: UseAutocompleteTimepickerProps) {
  // Generate time options (15-minute intervals) within min/max range
  const timeOptions = useMemo(() => {
    const times: string[] = []
    const [minHour, minMinute] = minTime.split(':').map(Number)
    const [maxHour, maxMinute] = maxTime.split(':').map(Number)

    const minTotalMinutes = minHour * 60 + minMinute
    const maxTotalMinutes = maxHour * 60 + maxMinute

    for (
      let totalMinutes = minTotalMinutes;
      totalMinutes <= maxTotalMinutes;
      totalMinutes += 15
    ) {
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60

      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      times.push(timeString)
    }

    return times
  }, [minTime, maxTime])

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours

    if (timeFormat === '24-hour') {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    }

    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  return {
    timeOptions,
    formatTime,
  }
}
