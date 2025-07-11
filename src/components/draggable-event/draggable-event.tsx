import { cn } from '@/lib/utils'
import { useCalendarContext } from '@/contexts/calendar-context/context'
import { AnimatePresence, motion } from 'motion/react'
import { useDraggable } from '@dnd-kit/core'
import { memo } from 'react'
import type { CalendarEvent } from '../types'
import type { CSSProperties } from 'react'

function DraggableEvent({
  elementId,
  event,
  className,
  style,
  disableDrag = false,
}: {
  elementId: string
  className?: string
  style?: CSSProperties
  event: CalendarEvent
  disableDrag?: boolean
}) {
  const { onEventClick, renderEvent, disableEventClick, disableDragAndDrop } =
    useCalendarContext()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: elementId,
    data: {
      event,
      type: 'calendar-event',
    },
    disabled: disableDrag || disableDragAndDrop,
  })

  // Default event content to render if custom renderEvent is not provided
  const DefaultEventContent = () => (
    <div
      className={cn(
        event.color || 'bg-blue-500 text-white',
        'h-full w-full pl-1  border border-gray-400 rounded-md'
      )}
    >
      <p className="truncate text-[10px] font-semibold sm:text-xs">
        {event.title}
      </p>
      <p className="xs:block hidden text-[8px] opacity-90 sm:text-xs">
        {event.start.format('h:mm A')}
        {event.end && ` - ${event.end.format('h:mm A')}`}
      </p>
    </div>
  )

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={elementId}
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        layout
        layoutId={elementId}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        className={cn(
          'truncate text-[10px] sm:text-xs min-h-[20px] h-full w-full',
          disableDrag || disableDragAndDrop
            ? disableEventClick
              ? 'cursor-default'
              : 'cursor-pointer'
            : 'cursor-grab',
          isDragging &&
            !(disableDrag || disableDragAndDrop) &&
            'cursor-grabbing shadow-lg',
          className
        )}
        style={style}
        onClick={(e) => {
          e.stopPropagation()
          onEventClick(event)
        }}
      >
        {/* Use custom renderEvent from context if available, otherwise use default */}
        {renderEvent ? renderEvent(event) : <DefaultEventContent />}
      </motion.div>
    </AnimatePresence>
  )
}

export default memo(DraggableEvent, (prevProps, nextProps) => {
  // Compare the essential props to prevent unnecessary re-renders
  return (
    prevProps.elementId === nextProps.elementId &&
    prevProps.disableDrag === nextProps.disableDrag &&
    prevProps.className === nextProps.className &&
    prevProps.event.id === nextProps.event.id &&
    prevProps.event.height === nextProps.event.height
  )
})
