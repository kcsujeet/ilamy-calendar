import { useIlamyCalendarContext } from '@ilamy/calendar'
import { Label } from '@ilamy/ui/components/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@ilamy/ui/components/select'
import { RRule } from 'rrule'
import { useRecurrenceEditor } from '../../contexts/recurrence-editor-context'
import {
	getPresetLabel,
	resolveByweekday,
} from '../../utils/recurrence-presets'

// "On day N" vs "on the Nth weekday", shown only for a custom monthly rule.
export const RecurrenceMonthlyMode: React.FC = () => {
	const { t } = useIlamyCalendarContext()
	const { opts, custom, reference, setMonthlyMode } = useRecurrenceEditor()
	if (!custom || opts?.freq !== RRule.MONTHLY) {
		return null
	}
	const isByWeekday = resolveByweekday(opts?.byweekday).some(
		(d) => typeof d === 'object' && d.n != null
	)
	const value = isByWeekday ? 'weekday' : 'day'
	return (
		<div>
			<Label className="text-xs" htmlFor="monthly-mode">
				{t('repeatOn')}
			</Label>
			<Select
				onValueChange={(m) => setMonthlyMode(m as 'day' | 'weekday')}
				value={value}
			>
				<SelectTrigger
					className="h-8 w-full"
					data-testid="monthly-mode-select"
					id="monthly-mode"
				>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="day">
						{getPresetLabel('monthlyOnDay', reference, t)}
					</SelectItem>
					<SelectItem value="weekday">
						{getPresetLabel('monthlyOnWeekday', reference, t)}
					</SelectItem>
				</SelectContent>
			</Select>
		</div>
	)
}
