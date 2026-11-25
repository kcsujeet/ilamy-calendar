/** @jsxImportSource preact */
import { RRule } from 'rrule'
import { useRecurrenceEditor } from '../../stores/recurrence-editor-context'
import {
	getPresetLabel,
	resolveByweekday,
} from '../../utils/recurrence-presets'

export const RecurrenceMonthlyMode = () => {
	const { opts, custom, reference, timezone, locale, t, setMonthlyMode } =
		useRecurrenceEditor()
	if (!custom || opts?.freq !== RRule.MONTHLY) {
		return null
	}
	const isByWeekday = resolveByweekday(opts?.byweekday).some(
		(d) => typeof d === 'object' && d.n != null
	)
	const value = isByWeekday ? 'weekday' : 'day'

	return (
		<div>
			<label data-ilamy-part="form-label" htmlFor="monthly-mode">
				{t('repeatOn')}
			</label>
			<select
				data-ilamy-slot="select"
				data-testid="monthly-mode-select"
				id="monthly-mode"
				onChange={(e) =>
					setMonthlyMode(
						(e.target as HTMLSelectElement).value as 'day' | 'weekday'
					)
				}
				value={value}
			>
				<option value="day">
					{getPresetLabel('monthlyOnDay', reference, t, locale, timezone)}
				</option>
				<option value="weekday">
					{getPresetLabel('monthlyOnWeekday', reference, t, locale, timezone)}
				</option>
			</select>
		</div>
	)
}
