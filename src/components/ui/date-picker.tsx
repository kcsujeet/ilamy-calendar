import dayjs from '@/lib/dayjs-config'
import { Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useRef } from 'react'
import { PopoverClose } from '@radix-ui/react-popover'

interface DatePickerProps {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  label?: string
  className?: string
  closeOnSelect?: boolean
}

export function DatePicker({
  date,
  closeOnSelect,
  setDate,
  label = 'Pick a date',
  className,
}: DatePickerProps) {
  const popOverRef = useRef<HTMLButtonElement | null>(null)

  const onSelect = (date: Date | undefined) => {
    setDate(date)
    if (closeOnSelect) {
      popOverRef.current?.click()
    }
  }

  return (
    <div className={className}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? dayjs(date).format('MMM D, YYYY') : <span>{label}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <PopoverClose ref={popOverRef} />
          <Calendar
            mode="single"
            selected={date}
            onSelect={onSelect}
            month={date}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
