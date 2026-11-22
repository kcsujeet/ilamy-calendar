import { useIlamyCalendarContext } from '@ilamy/calendar/react'
import { Label } from '@ilamy/ui/components/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@ilamy/ui/components/select'
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

export const RecurrencePresetSelect: React.FC = () => {
	const { t, currentLocale, timezone } = useIlamyCalendarContext()
	const { opts, custom, reference, selectPreset } = useRecurrenceEditor()
	const preset = custom ? 'customize' : detectPreset(opts, reference, timezone)
	return (
		<div>
			<Label className="text-xs" htmlFor="recurrence-preset">
				{t('repeats')}
			</Label>
			<Select
				onValueChange={(p) => selectPreset(p as RecurrencePreset)}
				value={preset}
			>
				<SelectTrigger
					className="h-8 w-full"
					data-testid="preset-select"
					id="recurrence-preset"
				>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{PRESET_OPTIONS.map((p) => (
						<SelectItem key={p} value={p}>
							{getPresetLabel(p, reference, t, currentLocale, timezone)}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	)
}
