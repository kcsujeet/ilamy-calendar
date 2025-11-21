import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import React from 'react'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'

type ViewType = 'day' | 'week' | 'month' | 'year'

interface ViewControlsProps {
  currentView: ViewType
  onChange: (view: ViewType) => void
  onToday?: () => void
  onNext?: () => void
  onPrevious?: () => void
  variant?: 'default' | 'grid'
  size?: 'sm' | 'default'
  className?: string
}

const ViewControls: React.FC<ViewControlsProps> = ({
  currentView,
  onChange,
  variant = 'default',
  size = 'sm',
  className,
  onToday,
  onNext,
  onPrevious,
}) => {
  const { t } = useSmartCalendarContext((context) => ({ t: context.t }))
  const isGrid = variant === 'grid'

  // Extract common button className logic to a function
  const getButtonClassName = (viewType: ViewType) => {
    return cn(
      // Base width for grid layout
      isGrid ? 'w-full' : '',
      // Active view styling
      currentView === viewType && 'bg-primary/80'
    )
  }

  const getBtnVariant = (viewType: ViewType) => {
    return currentView === viewType ? 'default' : 'outline'
  }

  return (
    <div
      className={cn(
        isGrid ? 'grid grid-cols-2 gap-2' : 'flex gap-1',
        className
      )}
    >
      <Button onClick={onPrevious} variant="outline" size={size}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button onClick={onNext} variant="outline" size={size}>
        <ChevronRight className="h-4 w-4" />
      </Button>

      {['day', 'week', 'month', 'year'].map((type: ViewType) => {
        return (
          <Button
            key={type}
            onClick={() => onChange(type)}
            variant={getBtnVariant(type)}
            size={size}
            className={getButtonClassName(type)}
          >
            {t(type)}
          </Button>
        )
      })}

      <Button onClick={onToday} variant="outline" size={size}>
        {t('today')}
      </Button>
    </div>
  )
}

export default ViewControls
