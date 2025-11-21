import type { CalendarEvent } from '@/components'
import dayjs from '@/lib/configs/dayjs-config'

export function generateMockEvents({ count = 5 } = {}) {
  const events: CalendarEvent[] = []
  for (let i = 0; i < count; i++) {
    events.push({
      id: i.toString(),
      title: `Mock Event ${i + 1}`,
      start: dayjs().startOf('week').add(i, 'day').startOf('day'),
      end: dayjs().startOf('week').add(i, 'day').endOf('day'),
      color: 'bg-gray-100 text-gray-800',
    })
  }
  return events
}
