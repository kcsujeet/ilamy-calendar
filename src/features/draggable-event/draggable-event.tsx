import type { CalendarEvent } from '@/components/types'
import { useCalendarContext } from '@/contexts/calendar-context/context'
import { cn } from '@/lib/utils'
import { useDraggable } from '@dnd-kit/core'
import { AnimatePresence, motion } from 'motion/react'
import type { CSSProperties } from 'react'
import { memo } from 'react'

const getBorderRadiusClass = (
  isTruncatedStart: boolean,
  isTruncatedEnd: boolean
) => {
  if (isTruncatedStart && isTruncatedEnd) {
    return 'rounded-none'
  }
  if (isTruncatedStart) {
    return 'rounded-r-md rounded-l-none'
  }
  if (isTruncatedEnd) {
    return 'rounded-l-md rounded-r-none'
  }
  return 'rounded-md'
}

function DraggableEventUnmemoized({
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
  const DefaultEventContent = () => {
    // Check if this event has truncation information
    const enhancedEvent = event as unknown as {
      isTruncatedStart?: boolean
      isTruncatedEnd?: boolean
    }
    const isTruncatedStart = enhancedEvent.isTruncatedStart
    const isTruncatedEnd = enhancedEvent.isTruncatedEnd

    return (
      <div
        className={cn(
          event.backgroundColor || 'bg-blue-500',
          event.color || 'text-white',
          'h-full w-full px-1 border-[1.5px] border-card text-left overflow-clip relative',
          getBorderRadiusClass(isTruncatedStart, isTruncatedEnd)
        )}
        style={{ backgroundColor: event.backgroundColor, color: event.color }}
      >
        {/* Left continuation indicator */}
        {isTruncatedStart && (
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-foreground/25"></div>
        )}

        {/* Event title */}
        <p
          className={cn(
            'text-[10px] font-semibold sm:text-xs mt-0.5',
            // Add slight padding to avoid overlap with indicators
            isTruncatedStart && 'pl-1',
            isTruncatedEnd && 'pr-1'
          )}
        >
          {event.title}
        </p>

        {/* Right continuation indicator */}
        {isTruncatedEnd && (
          <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-foreground/25"></div>
        )}
      </div>
    )
  }

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
          'truncate h-full w-full',
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

export const DraggableEvent = memo(
  DraggableEventUnmemoized,
  (prevProps, nextProps) => {
    // Compare the essential props to prevent unnecessary re-renders
    return (
      prevProps.elementId === nextProps.elementId &&
      prevProps.disableDrag === nextProps.disableDrag &&
      prevProps.className === nextProps.className &&
      prevProps.event === nextProps.event
    )
  }
)
