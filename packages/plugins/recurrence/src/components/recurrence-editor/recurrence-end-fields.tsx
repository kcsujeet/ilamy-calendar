import { useIlamyCalendarContext } from '@ilamy/calendar'
import { Checkbox } from '@ilamy/ui/components/checkbox'
import { Input } from '@ilamy/ui/components/input'
import { Label } from '@ilamy/ui/components/label'
import {
	type EndType,
	useRecurrenceEditor,
} from '../../contexts/recurrence-editor-context'
import { DatePicker } from '../../ui/date-picker'

const END_TYPES = [
	{ type: 'never', id: 'never', labelKey: 'never' },
	{ type: 'count', id: 'after', labelKey: 'after' },
	{ type: 'until', id: 'on', labelKey: 'on' },
] as const
const parseCount = (v: string) => Math.max(1, Number.parseInt(v, 10) || 1)

export const RecurrenceEndFields: React.FC = () => {
	const { t } = useIlamyCalendarContext()
	const { opts, update, setEndType, setUntil } = useRecurrenceEditor()
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
			<Label className="text-xs">{t('ends')}</Label>
			<div className="space-y-2 mt-1">
				{END_TYPES.map(({ type, id, labelKey }) => {
					const showCountInput = type === 'count' && endType === 'count'
					const showUntilInput = type === 'until' && endType === 'until'
					return (
						<div className="flex items-center space-x-2" key={type}>
							<Checkbox
								checked={endType === type}
								id={id}
								onCheckedChange={() => setEndType(type)}
							/>
							<Label className="text-xs" htmlFor={id}>
								{t(labelKey)}
							</Label>
							{showCountInput && (
								<>
									<Input
										className="h-6 w-16 text-xs"
										data-testid="count-input"
										min="1"
										onChange={(e) =>
											update({ count: parseCount(e.target.value) })
										}
										type="number"
										value={count}
									/>
									<span className="text-xs">{t('occurrences')}</span>
								</>
							)}
							{showUntilInput && (
								<DatePicker className="h-6" date={until} onChange={setUntil} />
							)}
						</div>
					)
				})}
			</div>
		</div>
	)
}
