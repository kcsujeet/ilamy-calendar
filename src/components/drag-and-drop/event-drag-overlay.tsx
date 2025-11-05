import { DragOverlay } from '@dnd-kit/core'
import React, { useImperativeHandle, useState } from 'react'
import { snapCenterToCursor } from '@dnd-kit/modifiers'
import { cn } from '@/lib/utils'
import type { CalendarEvent } from '../types'

interface EventDragOverlayProps {
  ref: React.Ref<{ setActiveEvent: (event: CalendarEvent) => void }>
}

export const EventDragOverlay: React.FC<EventDragOverlayProps> = ({ ref }) => {
  const [activeEvent, setActiveEvent] = useState<CalendarEvent>(null)

  useImperativeHandle(ref, () => ({
    setActiveEvent,
  }))

  return (
    <DragOverlay modifiers={[snapCenterToCursor]}>
      {activeEvent && (
        <div
          className={cn(
            'cursor-grab truncate rounded bg-amber-200 p-2 text-[10px] shadow-lg sm:text-xs w-20',
            activeEvent.backgroundColor || 'bg-blue-500',
            activeEvent.color || 'text-white'
          )}
        >
          {activeEvent?.title}
        </div>
      )}
    </DragOverlay>
  )
}
