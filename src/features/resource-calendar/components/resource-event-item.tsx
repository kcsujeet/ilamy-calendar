import React from 'react'
import { useResourceCalendarContext } from '@/contexts/ilamy-resource-calendar-context'
import type {
  ResourceCalendarEvent,
  Resource,
} from '@/features/resource-calendar/components/ilamy-resource-calendar/types'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface ResourceEventItemProps {
  event: ResourceCalendarEvent
  resources: Resource[]
  size?: 'sm' | 'md' | 'lg'
  showResource?: boolean
  className?: string
}

export const ResourceEventItem: React.FC<ResourceEventItemProps> = ({
  event,
  size = 'md',
  showResource = false,
  className,
}) => {
  const {
    onEventClick,
    isEventCrossResource,
    getEventResourceIds,
    getResourceById,
  } = useResourceCalendarContext()

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEventClick?.(event)
  }

  const isCrossResource = isEventCrossResource(event)
  const eventResourceIds = getEventResourceIds(event)

  const sizeClasses = {
    sm: 'text-xs px-1 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-2',
  }

  const badgeSize = {
    sm: 'sm',
    md: 'default',
    lg: 'lg',
  } as const

  const getResourceDisplay = () => {
    if (!showResource || eventResourceIds.length === 0) {
      return null
    }

    if (eventResourceIds.length === 1) {
      const resource = getResourceById(eventResourceIds[0])
      return resource?.title
    }

    return `${eventResourceIds.length} resources`
  }

  const resourceDisplay = getResourceDisplay()

  return (
    <div
      className={cn(
        'rounded cursor-pointer transition-colors hover:opacity-80',
        sizeClasses[size],
        event.color || 'bg-blue-100 text-blue-800',
        isCrossResource && 'border-2 border-dashed border-orange-400',
        className
      )}
      onClick={handleClick}
      title={`${event.title}${event.description ? ` - ${event.description}` : ''}`}
    >
      <div className="font-medium truncate">{event.title}</div>

      {event.allDay && <div className="text-xs opacity-75">All day</div>}

      {!event.allDay && (
        <div className="text-xs opacity-75">
          {event.start.format('HH:mm')} - {event.end.format('HH:mm')}
        </div>
      )}

      {resourceDisplay && (
        <Badge variant="outline" size={badgeSize[size]} className="mt-1">
          {resourceDisplay}
        </Badge>
      )}

      {isCrossResource && (
        <Badge variant="secondary" size={badgeSize[size]} className="mt-1">
          Multi-resource
        </Badge>
      )}
    </div>
  )
}
