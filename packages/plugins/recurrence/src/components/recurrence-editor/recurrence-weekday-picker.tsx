import { useIlamyCalendarContext } from '@ilamy/calendar'
import { Checkbox } from '@ilamy/ui/components/checkbox'
import { Label } from '@ilamy/ui/components/label'
import dayjs from '@ilamy/utils/dayjs'
import { listKey } from '@ilamy/utils/helpers'
import { RRule } from 'rrule'
import { useRecurrenceEditor } from '../../contexts/recurrence-editor-context'
import { resolveByweekday } from '../../utils/recurrence-presets'

const WEEKDAYS = [
	RRule.SU,
	RRule.MO,
	RRule.TU,
	RRule.WE,
	RRule.TH,
	RRule.FR,
	RRule.SA,
]

// Weekday checkboxes, shown only for a custom weekly rule.
export const RecurrenceWeekdayPicker: React.FC = () => {
	const { t, firstDayOfWeek } = useIlamyCalendarContext()
	const { opts, custom, toggleDay } = useRecurrenceEditor()
	if (!custom || opts?.freq !== RRule.WEEKLY) {
		return null
	}
	const selected = resolveByweekday(opts?.byweekday)
	const options = WEEKDAYS.map((value, index) => ({
		value,
		label: dayjs().day(index).format('ddd'),
	}))
	const ordered = WEEKDAYS.map(
		(_weekday, i) => options[(i + firstDayOfWeek) % 7]
	)
	return (
		<div>
			<Label className="text-xs">{t('repeatOn')}</Label>
			<div className="flex flex-wrap gap-1 mt-1">
				{ordered.map((d, i) => (
					<div
						className="flex items-center space-x-1"
						key={listKey('weekday', i)}
					>
						<Checkbox
							checked={selected.includes(d.value)}
							id={listKey('day', i)}
							onCheckedChange={() => toggleDay(d.value)}
						/>
						<Label
							className="text-xs cursor-pointer"
							htmlFor={listKey('day', i)}
						>
							{d.label}
						</Label>
					</div>
				))}
			</div>
		</div>
	)
}
