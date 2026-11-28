/** @jsxImportSource preact */
import {
	type EndType,
	useRecurrenceEditor,
} from '../../stores/recurrence-editor-context'
import { DateInput } from '../date-input'

const END_TYPES = [
	{ type: 'never', id: 'recurrence-end-never', labelKey: 'never' },
	{ type: 'count', id: 'recurrence-end-after', labelKey: 'after' },
	{ type: 'until', id: 'recurrence-end-on', labelKey: 'on' },
] as const

const parseCount = (v: string) => Math.max(1, Number.parseInt(v, 10) || 1)

export const RecurrenceEndFields = () => {
	const { opts, timezone, t, update, setEndType, setUntil } =
		useRecurrenceEditor()
	let endType: EndType = 'never'
	if (opts?.until) {
		endType = 'until'
	} else if (opts?.count) {
		endType = 'count'
	}
	const count = opts?.count || 1
	const until = opts?.until ?? undefined

	return (
		<div>
			<span data-ilamy-part="form-label">{t('ends')}</span>
			<div data-ilamy-part="form-stack">
				{END_TYPES.map(({ type, id, labelKey }) => {
					const showCountInput = type === 'count' && endType === 'count'
					const showUntilInput = type === 'until' && endType === 'until'
					return (
						<div data-ilamy-part="repeat-inline-row" key={type}>
							<label data-ilamy-part="form-checkbox-row" htmlFor={id}>
								<input
									checked={endType === type}
									id={id}
									onChange={() => setEndType(type)}
									type="checkbox"
								/>
								<span>{t(labelKey)}</span>
							</label>
							{showCountInput && (
								<>
									<input
										data-ilamy-part="repeat-count-input"
										data-ilamy-slot="input"
										data-testid="count-input"
										min="1"
										onChange={(e) =>
											update({
												count: parseCount((e.target as HTMLInputElement).value),
											})
										}
										onInput={(e) =>
											update({
												count: parseCount((e.target as HTMLInputElement).value),
											})
										}
										type="number"
										value={count}
									/>
									<span>{t('occurrences')}</span>
								</>
							)}
							{showUntilInput && (
								<DateInput
									date={until}
									onChange={setUntil}
									timezone={timezone}
								/>
							)}
						</div>
					)
				})}
			</div>
		</div>
	)
}
