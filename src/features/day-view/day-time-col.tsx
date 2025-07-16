import dayjs from 'dayjs'

// Hours to display (all 24 hours of the day)
const hours = Array.from({ length: 24 }, (_, i) => i).map((hour) => {
  return dayjs().hour(hour).minute(0)
})

interface DayTimeColProps {
  className?: string
}

export const DayTimeCol: React.FC<DayTimeColProps> = ({ className }) => {
  return (
    <div
      data-testid="day-time-col"
      className={`bg-card sticky left-0 z-10 col-span-2 h-full md:col-span-1 ${className}`}
    >
      {hours.map((time) => (
        <div
          key={time.format('HH:mm')}
          data-testid={`day-time-hour-${time.format('HH')}`}
          className="h-[60px] border-b text-right"
        >
          <span className="text-muted-foreground pr-2 text-right text-[10px] sm:text-xs">
            {time.format('h A')}
          </span>
        </div>
      ))}
    </div>
  )
}
