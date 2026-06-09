import { useIlamyCalendarContext } from '@ilamy/calendar'
import { Label } from '@ilamy/ui/components/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@ilamy/ui/components/select'
import { useRecurrenceEditor } from '../../contexts/recurrence-editor-context'
import {
	detectPreset,
	getPresetLabel,
	type RecurrencePreset,
} from '../../utils/recurrence-presets'

// Presets offered in the picker. `once` is represented by the disabled toggle,
// so it is not listed here; `customize` reveals the detailed controls.
const PRESET_OPTIONS: RecurrencePreset[] = [
	'daily',
	'weekdays',
	'weeklyOnDay',
	'monthlyOnDay',
	'monthlyOnWeekday',
	'customize',
]

export const RecurrencePresetSelect: React.FC = () => {
	const { t } = useIlamyCalendarContext()
	const { opts, custom, reference, selectPreset } = useRecurrenceEditor()
	const preset = custom ? 'customize' : detectPreset(opts, reference)
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
							{getPresetLabel(p, reference, t)}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	)
}
