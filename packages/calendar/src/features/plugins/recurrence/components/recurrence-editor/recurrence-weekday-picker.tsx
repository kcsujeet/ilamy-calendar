/** @jsxImportSource preact */
import { RRule } from 'rrule'
import { listKey } from '../../../../../utils/helpers'
import { formatDate, fromFields } from '../../../../../utils/temporal'
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

const SUNDAY_ANCHOR_DAY = 5

export const RecurrenceWeekdayPicker = () => {
	const { opts, custom, firstDayOfWeek, locale, t, toggleDay } =
		useRecurrenceEditor()
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
			locale
		),
	}))
	const ordered = WEEKDAYS.map(
		(_weekday, i) => options[(i + firstDayOfWeek) % 7]
	)

	return (
		<div>
			<span data-ilamy-part="form-label">{t('repeatOn')}</span>
			<div data-ilamy-part="repeat-weekday-list">
				{ordered.map((d, i) => {
					if (!d) return null
					const inputId = listKey('recurrence-day', i)
					return (
						<label
							data-ilamy-part="form-checkbox-row"
							htmlFor={inputId}
							key={listKey('weekday', i)}
						>
							<input
								checked={selected.includes(d.value)}
								id={inputId}
								onChange={() => toggleDay(d.value)}
								type="checkbox"
							/>
							<span>{d.label}</span>
						</label>
					)
				})}
			</div>
		</div>
	)
}
