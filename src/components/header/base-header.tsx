import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui'
import { useCalendarContext } from '@/contexts/calendar-context/context'
import { Calendar as CalendarIcon, Menu, Plus } from 'lucide-react'
import React, { useCallback, useState } from 'react'
import TitleContent from './title-content'
import ViewControls from './view-controls'

type HeaderProps = object

const Header: React.FC<HeaderProps> = () => {
  const {
    currentDate,
    view,
    setView,
    nextPeriod,
    prevPeriod,
    today,
    openEventForm,
    headerComponent,
  } = useCalendarContext()

  // State for mobile menu popover
  const [mobilePopoverOpen, setMobilePopoverOpen] = useState(false)

  // Handle view change with optional popover closing
  const handleViewChange = (
    newView: 'day' | 'week' | 'month' | 'year',
    closePopover = false
  ) => {
    setView(newView)
    if (closePopover) {
      setMobilePopoverOpen(false)
    }
  }

  // Callback for navigation that also closes the mobile popover
  const handleNavigation = {
    today: () => {
      today()
      setMobilePopoverOpen(false)
    },
    previous: () => {
      prevPeriod()
      setMobilePopoverOpen(false)
    },
    next: () => {
      nextPeriod()
      setMobilePopoverOpen(false)
    },
  }

  const NewEventButton = useCallback(
    () => (
      <div className="flex items-center gap-2">
        <Button
          onClick={() => openEventForm(currentDate)}
          variant="default"
          size="sm"
          className="flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden md:inline">New Event</span>
          <span className="md:hidden">New</span>
        </Button>
      </div>
    ),
    [currentDate, openEventForm]
  )

  if (headerComponent) {
    // Render custom header component if provided
    return headerComponent
  }

  return (
    <>
      {/* Calendar Header with grid layout */}
      <div className="@container grid grid-cols-12 items-center gap-2 border-b p-2 sm:p-4">
        {/* Title area - Left section */}
        <div className="col-span-12 flex flex-wrap items-center justify-center gap-2 @4xl:col-span-5 @4xl:justify-start">
          <CalendarIcon className="h-5 w-5" />
          <TitleContent />
        </div>

        {/* New event button - Mobile & Desktop */}
        <div className="col-span-12 flex flex-wrap justify-center gap-1 @4xl:col-span-7 @4xl:justify-end">
          {/* Desktop controls - centralized */}
          <div className="hidden items-center justify-end gap-1 sm:flex">
            <ViewControls
              currentView={view}
              onChange={setView}
              onToday={today}
              onNext={nextPeriod}
              onPrevious={prevPeriod}
              variant="default"
              className="justify-end"
            />

            {/* New event button - Desktop */}
            <NewEventButton />
          </div>

          {/* Mobile navigation menu button - Right aligned */}
          <div className="flex items-center justify-end gap-1 sm:hidden">
            {/* New event button - Mobile */}
            <NewEventButton />

            <Popover
              open={mobilePopoverOpen}
              onOpenChange={setMobilePopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Menu className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[240px] p-2">
                <div className="space-y-2">
                  <h3 className="mb-1 text-sm font-medium">
                    View & Navigation
                  </h3>
                  <ViewControls
                    currentView={view}
                    onChange={(newView) => handleViewChange(newView, true)}
                    onToday={handleNavigation.today}
                    onNext={handleNavigation.next}
                    onPrevious={handleNavigation.previous}
                    variant="grid"
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </>
  )
}

export default Header
