/** @jsxImportSource preact */
import { useRecurrenceEditor } from '../../stores/recurrence-editor-context'
import {
	detectPreset,
	getPresetLabel,
	type RecurrencePreset,
} from '../../utils/recurrence-presets'

const PRESET_OPTIONS: RecurrencePreset[] = [
	'daily',
	'weekdays',
	'weeklyOnDay',
	'monthlyOnDay',
	'monthlyOnWeekday',
	'customize',
]

export const RecurrencePresetSelect = () => {
	const { opts, custom, reference, timezone, locale, t, selectPreset } =
		useRecurrenceEditor()
	const preset = custom ? 'customize' : detectPreset(opts, reference, timezone)

	return (
		<div>
			<label data-ilamy-part="form-label" htmlFor="recurrence-preset">
				{t('repeats')}
			</label>
			<select
				data-ilamy-slot="select"
				data-testid="preset-select"
				id="recurrence-preset"
				onChange={(e) =>
					selectPreset(
						(e.target as HTMLSelectElement).value as RecurrencePreset
					)
				}
				value={preset}
			>
				{PRESET_OPTIONS.map((p) => (
					<option key={p} value={p}>
						{getPresetLabel(p, reference, t, locale, timezone)}
					</option>
				))}
			</select>
		</div>
	)
}
