import { useIlamyCalendarContext } from '@ilamy/calendar'
import { Checkbox } from '@ilamy/ui/components/checkbox'
import { Label } from '@ilamy/ui/components/label'
import { listKey } from '@ilamy/utils/helpers'
import { formatDate, fromFields } from '@ilamy/utils/temporal'
import { RRule } from 'rrule'
import { useRecurrenceEditor } from '../../stores/recurrence-editor-context'
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

// 2025-01-05 is a Sunday; adding `index` gives Sunday..Saturday cleanly.
const SUNDAY_ANCHOR_DAY = 5

export const RecurrenceWeekdayPicker: React.FC = () => {
	const { t, firstDayOfWeek, currentLocale } = useIlamyCalendarContext()
	const { opts, custom, toggleDay } = useRecurrenceEditor()
	if (!custom || opts?.freq !== RRule.WEEKLY) {
		return null
	}
	const selected = resolveByweekday(opts?.byweekday)
	const options = WEEKDAYS.map((value, index) => ({
		value,
		label: formatDate(
			fromFields(
				{ year: 2025, month: 1, day: SUNDAY_ANCHOR_DAY + index },
				'UTC'
			),
			{ weekday: 'short' },
			currentLocale
		),
	}))
	const ordered = WEEKDAYS.map(
		(_weekday, i) => options[(i + firstDayOfWeek) % 7]
	)
	return (
		<div>
			<Label className="text-xs">{t('repeatOn')}</Label>
			<div className="flex flex-wrap gap-1 mt-1">
				{ordered.map((d, i) => {
					if (!d) return null
					return (
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
					)
				})}
			</div>
		</div>
	)
}
