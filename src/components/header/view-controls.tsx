import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import React from 'react'

type ViewControlsProps = {
  currentView: 'day' | 'week' | 'month' | 'year'
  onChange: (view: 'day' | 'week' | 'month' | 'year') => void
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
  const isGrid = variant === 'grid'

  // Extract common button className logic to a function
  const getButtonClassName = (viewType: 'day' | 'week' | 'month' | 'year') => {
    return cn(
      // Base width for grid layout
      isGrid ? 'w-full' : '',
      // Special case for year button visibility on mobile
      viewType === 'year' ? (isGrid ? 'w-full' : 'hidden md:inline-flex') : '',
      // Active view styling
      currentView === viewType && 'bg-primary/80'
    )
  }

  const getBtnVariant = (viewType: 'day' | 'week' | 'month' | 'year') => {
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

      <Button
        onClick={() => onChange('day')}
        variant={getBtnVariant('day')}
        size={size}
        className={getButtonClassName('day')}
      >
        Day
      </Button>
      <Button
        onClick={() => onChange('week')}
        variant={getBtnVariant('week')}
        size={size}
        className={getButtonClassName('week')}
      >
        Week
      </Button>
      <Button
        onClick={() => onChange('month')}
        variant={getBtnVariant('month')}
        size={size}
        className={getButtonClassName('month')}
      >
        Month
      </Button>
      <Button
        onClick={() => onChange('year')}
        variant={getBtnVariant('year')}
        size={size}
        className={getButtonClassName('year')}
      >
        Year
      </Button>

      <Button onClick={onToday} variant="outline" size={size}>
        Today
      </Button>
    </div>
  )
}

export default ViewControls
