import { useState, useRef, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAutocompleteTimepicker } from '@/hooks/use-autocomplete-timepicker'

const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
  // Prevent event from bubbling to prevent Popover from closing
  e.stopPropagation()
}

interface TimePickerProps {
  value: string
  onChange: (value: string) => void
  minTime?: string
  maxTime?: string
  is24Hour?: boolean
  placeholder?: string
  className?: string
  disabled?: boolean
  name?: string
}

export function TimePicker({
  value,
  onChange,
  minTime = '00:00',
  maxTime = '23:45',
  is24Hour = false,
  placeholder = 'Select time...',
  className,
  disabled = false,
  name,
}: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [triggerWidth, setTriggerWidth] = useState<number>(0)

  const { timeOptions, formatTime } = useAutocompleteTimepicker({
    is24Hour,
    minTime,
    maxTime,
  })

  // Filter time options based on search
  const filteredOptions = timeOptions.filter((time) => {
    const formattedTime = formatTime(time)
    return formattedTime.toLowerCase().includes(search.toLowerCase())
  })

  const handleSelect = (time: string) => {
    onChange(time)
    setOpen(false)
    setSearch('')
  }

  // Measure trigger width and focus input when popover opens
  useEffect(() => {
    if (open) {
      if (triggerRef.current) {
        setTriggerWidth(triggerRef.current.offsetWidth)
      }
      setTimeout(() => {
        inputRef.current?.focus()
      }, 0)
    }
  }, [open])

  const currentTimeString = value ? formatTime(value) : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          role="combobox"
          aria-controls="time-picker-listbox"
          aria-expanded={open}
          className={cn('w-full justify-start', className)}
          disabled={disabled}
          data-testid={`time-picker-${name}`}
        >
          <Clock className="mr-2 h-4 w-4" />
          {currentTimeString}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        align="start"
        style={{ width: triggerWidth }}
      >
        <div className="p-2 border-b">
          <Input
            ref={inputRef}
            placeholder="Search time..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <ScrollArea className="h-[200px]" onWheel={handleWheel}>
          <div className="p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                N/A
              </div>
            ) : (
              filteredOptions.map((time) => {
                const timeString = formatTime(time)
                const isSelected = time === value
                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => handleSelect(time)}
                    className={cn(
                      'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground',
                      isSelected && 'bg-accent text-accent-foreground'
                    )}
                  >
                    {timeString}
                  </button>
                )
              })
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
