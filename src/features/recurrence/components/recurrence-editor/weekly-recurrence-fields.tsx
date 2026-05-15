import type { Weekday } from 'rrule'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { TranslatorFunction } from '@/lib/translations/types'
import { keys } from '@/lib/utils/keys'

export interface WeeklyDayOption {
	key: string
	value: Weekday
	label: string
	index: number
}

interface WeeklyRecurrenceFieldsProps {
	t: TranslatorFunction
	weekDays: WeeklyDayOption[]
	selectedWeekdays: Weekday[]
	onToggleDay: (weekdayIndex: number) => void
	testIdPrefix?: string
}

// Weekly "repeat on" weekday checkboxes, ordered by calendar firstDayOfWeek.
export const WeeklyRecurrenceFields: React.FC<WeeklyRecurrenceFieldsProps> = ({
	t,
	weekDays,
	selectedWeekdays,
	onToggleDay,
	testIdPrefix = 'weekly',
}) => (
	<div>
		<Label className="text-xs">{t('repeatOn')}</Label>
		<div
			className="mt-1 flex flex-wrap gap-1"
			data-testid={keys.listKey(testIdPrefix, 'days')}
		>
			{weekDays.map((day) => {
				const dayId = keys.listKey('day', day.index)
				return (
					<div className="flex items-center space-x-1" key={day.key}>
						<Checkbox
							checked={selectedWeekdays.includes(day.value)}
							data-testid={keys.listKey(testIdPrefix, 'day', day.index)}
							id={dayId}
							onCheckedChange={() => onToggleDay(day.index)}
						/>
						<Label className="cursor-pointer text-xs" htmlFor={dayId}>
							{day.label}
						</Label>
					</div>
				)
			})}
		</div>
	</div>
)
