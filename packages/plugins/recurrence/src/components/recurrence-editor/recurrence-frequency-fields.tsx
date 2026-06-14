import { useIlamyCalendarContext } from '@ilamy/calendar'
import { Input } from '@ilamy/ui/components/input'
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

// Frequency + interval, shown only while customizing.
export const RecurrenceFrequencyFields: React.FC = () => {
	const { t } = useIlamyCalendarContext()
	const { opts, custom, update } = useRecurrenceEditor()
	if (!custom) {
		return null
	}
	const freqStr = FREQ_TO_STR[opts?.freq ?? RRule.DAILY] || 'DAILY'
	const interval = opts?.interval || 1
	return (
		<div className="grid grid-cols-2 gap-4">
			<div>
				<Label className="text-xs" htmlFor="frequency">
					{t('frequency')}
				</Label>
				<Select
					onValueChange={(f) =>
						update({ freq: FREQ_MAP[f as keyof typeof FREQ_MAP] })
					}
					value={freqStr}
				>
					<SelectTrigger
						className="h-8 w-full"
						data-testid="frequency-select"
						id="frequency"
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{Object.keys(FREQ_MAP).map((f) => (
							<SelectItem key={f} value={f}>
								{t(f.toLowerCase())}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div>
				<Label className="text-xs" htmlFor="interval">
					{t('every')}
				</Label>
				<Input
					className="h-8"
					id="interval"
					min="1"
					onChange={(e) => update({ interval: parseInterval(e.target.value) })}
					type="number"
					value={interval}
				/>
			</div>
		</div>
	)
}
