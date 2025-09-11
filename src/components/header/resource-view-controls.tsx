import React, { useContext } from 'react'
import { Button } from '@/components/ui/button'
import { ResourceCalendarContext } from '@/contexts/ilamy-resource-calendar-context'
import type { ResourceOrientation } from '@/components/ilamy-resource-calendar/types'

export const ResourceViewControls: React.FC = () => {
  const context = useContext(ResourceCalendarContext)

  // If we're not in a resource calendar context, don't render anything
  if (!context) {
    return null
  }

  const { orientation, setOrientation, t } = context

  const handleOrientationToggle = () => {
    const newOrientation: ResourceOrientation =
      orientation === 'vertical' ? 'horizontal' : 'vertical'
    setOrientation(newOrientation)
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleOrientationToggle}
        className="h-8"
      >
        {orientation === 'vertical' ? '↕' : '↔'}{' '}
        {orientation === 'vertical' ? t('vertical') : t('horizontal')}
      </Button>
    </div>
  )
}
