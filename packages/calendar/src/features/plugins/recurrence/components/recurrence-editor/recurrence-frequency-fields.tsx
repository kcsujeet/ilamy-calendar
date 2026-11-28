/** @jsxImportSource preact */
import { RRule } from 'rrule'
import { useRecurrenceEditor } from '../../stores/recurrence-editor-context'

const FREQ_MAP = {
	DAILY: RRule.DAILY,
	WEEKLY: RRule.WEEKLY,
	MONTHLY: RRule.MONTHLY,
	YEARLY: RRule.YEARLY,
} as const

const FREQ_TO_STR = Object.fromEntries(
	Object.entries(FREQ_MAP).map(([k, v]) => [v, k])
) as Record<number, string>

const parseInterval = (v: string) => Math.max(1, Number.parseInt(v, 10) || 1)

export const RecurrenceFrequencyFields = () => {
	const { opts, custom, t, update } = useRecurrenceEditor()
	if (!custom) {
		return null
	}
	const freqStr = FREQ_TO_STR[opts?.freq ?? RRule.DAILY] || 'DAILY'
	const interval = opts?.interval || 1

	return (
		<div data-ilamy-part="form-grid-2">
			<div>
				<label data-ilamy-part="form-label" htmlFor="frequency">
					{t('frequency')}
				</label>
				<select
					data-ilamy-slot="select"
					data-testid="frequency-select"
					id="frequency"
					onChange={(e) => {
						const key = (e.target as HTMLSelectElement)
							.value as keyof typeof FREQ_MAP
						update({ freq: FREQ_MAP[key] })
					}}
					value={freqStr}
				>
					{Object.keys(FREQ_MAP).map((f) => (
						<option key={f} value={f}>
							{t(f.toLowerCase())}
						</option>
					))}
				</select>
			</div>
			<div>
				<label data-ilamy-part="form-label" htmlFor="interval">
					{t('every')}
				</label>
				<input
					data-ilamy-slot="input"
					id="interval"
					min="1"
					onChange={(e) =>
						update({
							interval: parseInterval((e.target as HTMLInputElement).value),
						})
					}
					onInput={(e) =>
						update({
							interval: parseInterval((e.target as HTMLInputElement).value),
						})
					}
					type="number"
					value={interval}
				/>
			</div>
		</div>
	)
}
