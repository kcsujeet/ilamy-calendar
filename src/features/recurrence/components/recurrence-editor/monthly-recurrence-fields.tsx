import type { Weekday } from 'rrule'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import type {
	MonthlyMode,
	OnTheDaySelection,
	OnThePosition,
} from '@/features/recurrence/utils/rrule-editor-utils'
import {
	formatPositionForSelect,
	normalizeOnTheDaySelection,
	POSITION_SELECT_LAST,
	parsePositionFromSelect,
} from '@/features/recurrence/utils/rrule-editor-utils'
import dayjs from '@/lib/configs/dayjs-config'
import type { TranslatorFunction } from '@/lib/translations/types'
import { keys } from '@/lib/utils/keys'

export const MONTH_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const

interface RecurrenceMonthSelectProps {
	locale: string
	value: number
	onChange: (month: number) => void
	disabled?: boolean
	testId?: string
}

// Month dropdown shared by yearly customize row (repeats every … year on [month]).
export const RecurrenceMonthSelect: React.FC<RecurrenceMonthSelectProps> = ({
	locale,
	value,
	onChange,
	disabled,
	testId = 'recurrence-month-select',
}) => (
	<Select
		disabled={disabled}
		onValueChange={(v) => onChange(Number(v))}
		value={String(value)}
	>
		<SelectTrigger className="h-8 w-32" data-testid={testId}>
			<SelectValue />
		</SelectTrigger>
		<SelectContent>
			{MONTH_NUMBERS.map((month) => (
				<SelectItem key={month} value={String(month)}>
					{dayjs().month(month).format('MMMM')}
				</SelectItem>
			))}
		</SelectContent>
	</Select>
)

const POSITION_OPTIONS: {
	value: OnThePosition
	selectValue: string
	labelKey: string
}[] = [
	{ value: 1, selectValue: '1', labelKey: 'first' },
	{ value: 2, selectValue: '2', labelKey: 'second' },
	{ value: 3, selectValue: '3', labelKey: 'third' },
	{ value: 4, selectValue: '4', labelKey: 'fourth' },
	{ value: -1, selectValue: POSITION_SELECT_LAST, labelKey: 'last' },
]
export interface WeeklyDayOption {
	key: string
	value: Weekday
	label: string
	index: number
	fullLabel: string
}

interface MonthlyRecurrenceFieldsProps {
	t: TranslatorFunction
	locale: string
	mode: MonthlyMode
	onModeChange: (mode: MonthlyMode) => void
	dayOfMonth: number
	onDayOfMonthChange: (day: number) => void
	onTheDay: OnTheDaySelection
	onOnTheDayChange: (day: OnTheDaySelection) => void
	position: OnThePosition
	onPositionChange: (position: OnThePosition) => void
	testIdPrefix?: string
	weekDays: WeeklyDayOption[]
}

// Parses day-of-month input into a valid 1–31 value.
const parseDay = (value: string) =>
	Math.min(31, Math.max(1, Number.parseInt(value, 10) || 1))

// Monthly "on day" / "on the" controls using mutually exclusive radios.
export const MonthlyRecurrenceFields: React.FC<
	MonthlyRecurrenceFieldsProps
> = ({
	t,
	locale,
	mode,
	onModeChange,
	dayOfMonth,
	onDayOfMonthChange,
	onTheDay,
	onOnTheDayChange,
	position,
	onPositionChange,
	testIdPrefix = 'recurrence',
	weekDays,
}) => {
	const modeDayId = keys.listKey(testIdPrefix, 'mode-day')
	const modeTheId = keys.listKey(testIdPrefix, 'mode-the')

	return (
		<RadioGroup
			className="gap-3"
			onValueChange={(value) => onModeChange(value as MonthlyMode)}
			value={mode}
		>
			<div className="flex flex-wrap items-center gap-2">
				<div className="flex items-center gap-2">
					<RadioGroupItem
						data-testid={modeDayId}
						id={modeDayId}
						value="bymonthday"
					/>
					<Label className="text-xs cursor-pointer" htmlFor={modeDayId}>
						{t('onDay')}
					</Label>
				</div>
				<Input
					className="h-8 w-16"
					data-testid={keys.listKey(testIdPrefix, 'day-of-month')}
					disabled={mode !== 'bymonthday'}
					max={31}
					min={1}
					onChange={(e) => onDayOfMonthChange(parseDay(e.target.value))}
					type="number"
					value={dayOfMonth}
				/>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<div className="flex items-center gap-2">
					<RadioGroupItem
						data-testid={modeTheId}
						id={modeTheId}
						value="byweekday"
					/>
					<Label className="text-xs cursor-pointer" htmlFor={modeTheId}>
						{t('onThe')}
					</Label>
				</div>
				<Select
					disabled={mode !== 'byweekday'}
					onValueChange={(v) => onPositionChange(parsePositionFromSelect(v))}
					value={formatPositionForSelect(position)}
				>
					<SelectTrigger
						className="h-8 w-28"
						data-testid={keys.listKey(testIdPrefix, 'position')}
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{POSITION_OPTIONS.map(({ value, selectValue, labelKey }) => (
							<SelectItem key={value} value={selectValue}>
								{t(labelKey)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select
					disabled={mode !== 'byweekday'}
					onValueChange={(v) => onOnTheDayChange(normalizeOnTheDaySelection(v))}
					value={normalizeOnTheDaySelection(onTheDay)}
				>
					<SelectTrigger
						className="h-8 w-32"
						data-testid={keys.listKey(testIdPrefix, 'on-the-day')}
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{weekDays.map((day) => (
							<SelectItem key={day.key} value={day.value.toString()}>
								{day.fullLabel}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</RadioGroup>
	)
}
