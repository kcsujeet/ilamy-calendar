import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Weekday } from 'rrule'
import { RRule } from 'rrule'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
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
import type { RRuleOptions } from '@/features/recurrence/types'
import {
	buildDefaultCustomizeOptions,
	buildPresetOptions,
	detectPresetFromOptions,
	getPositionLabelKey,
	getRecurrencePresetOrder,
	getWeekdayPositionInMonth,
	type RecurrencePreset,
} from '@/features/recurrence/utils/recurrence-preset-utils'
import {
	buildMonthlyPatch,
	buildYearlyPatch,
	getRecurrenceDefaultsFromReference,
	type MonthlyMode,
	normalizeByweekday,
	normalizeOnTheDaySelection,
	type OnTheDaySelection,
	type OnThePosition,
	parseMonthlyMode,
	parseOnTheDaySelection,
	parseOnThePosition,
	parseYearlyMode,
	sanitizeOptionsForFreq,
	type YearlyMode,
} from '@/features/recurrence/utils/rrule-editor-utils'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import dayjs from '@/lib/configs/dayjs-config'
import type { TranslationKey } from '@/lib/translations/types'
import { formatLocaleWeekday } from '@/lib/utils/date-locale-format'
import { keys } from '@/lib/utils/keys'
import {
	MonthlyRecurrenceFields,
	RecurrenceMonthSelect,
} from './monthly-recurrence-fields'
import { WeeklyRecurrenceFields } from './weekly-recurrence-fields'

const FREQ_MAP = {
	DAILY: RRule.DAILY,
	WEEKLY: RRule.WEEKLY,
	MONTHLY: RRule.MONTHLY,
	YEARLY: RRule.YEARLY,
} as const
const FREQ_LABEL_KEYS: Record<keyof typeof FREQ_MAP, TranslationKey> = {
	DAILY: 'day',
	WEEKLY: 'week',
	MONTHLY: 'month',
	YEARLY: 'year',
}
const FREQ_TO_STR = Object.fromEntries(
	Object.entries(FREQ_MAP).map(([k, v]) => [v, k])
) as Record<number, string>
const WEEKDAYS = [
	RRule.SU,
	RRule.MO,
	RRule.TU,
	RRule.WE,
	RRule.TH,
	RRule.FR,
	RRule.SA,
]
const END_TYPES = [
	{ type: 'never', id: 'never', labelKey: 'never' },
	{ type: 'count', id: 'after', labelKey: 'after' },
	{ type: 'until', id: 'on', labelKey: 'on' },
] as const

// Parses interval and count inputs as a positive integer (minimum 1).
const parseNum = (v: string) => Math.max(1, Number.parseInt(v, 10) || 1)

interface Props {
	value?: RRuleOptions | null
	onChange: (v: RRuleOptions | null) => void
	referenceDate?: Date
}

// Derives UI state for monthly/yearly "on the" fields from RRULE options.
const deriveOnTheState = (opts: RRuleOptions | null, referenceDate?: Date) => {
	const defaults = getRecurrenceDefaultsFromReference(referenceDate)
	if (!opts) {
		return {
			monthlyMode: 'bymonthday' as MonthlyMode,
			yearlyMode: 'bymonthday' as YearlyMode,
			dayOfMonth: defaults.dayOfMonth,
			yearMonth: defaults.month,
			onTheDay: defaults.onTheDay,
			position: defaults.position,
		}
	}
	const firstMonthDay = Array.isArray(opts.bymonthday)
		? opts.bymonthday[0]
		: opts.bymonthday
	const firstMonth = Array.isArray(opts.bymonth)
		? opts.bymonth[0]
		: opts.bymonth

	return {
		monthlyMode: parseMonthlyMode(opts),
		yearlyMode: parseYearlyMode(opts),
		dayOfMonth: firstMonthDay ?? defaults.dayOfMonth,
		yearMonth: firstMonth ?? defaults.month,
		onTheDay: normalizeOnTheDaySelection(
			parseOnTheDaySelection(opts.byweekday)
		),
		position: parseOnThePosition(opts.byweekday),
	}
}

// Builds the display label for a recurrence preset option in the header select.
const getPresetLabel = (
	preset: RecurrencePreset,
	t: (key: TranslationKey | string) => string,
	locale: string,
	referenceDate?: Date
): string => {
	const ref = referenceDate ? dayjs(referenceDate) : dayjs()
	const dayName = formatLocaleWeekday(
		ref.day(),
		locale,
		'long'
	).toLocaleLowerCase(locale)
	const dayOfMonth = ref.date()
	const positionKey = getPositionLabelKey(
		getWeekdayPositionInMonth(referenceDate)
	)

	switch (preset) {
		case 'once':
			return t('recurrenceOnce')
		case 'daily':
			return t('recurrenceEveryDay')
		case 'weekdays':
			return t('recurrenceEveryWeekday')
		case 'weeklyOnDay':
			return `${t('recurrenceEveryWeekOn')} ${dayName}`
		case 'monthlyOnDay':
			return `${t('recurrenceEveryMonthOnDay')} ${dayOfMonth}`
		case 'monthlyOnWeekday':
			return `${t('recurrenceEveryMonthOnThe')} ${t(positionKey)} ${dayName}`
		case 'customize':
			return t('customRecurrence')
	}
}

// Recurrence preset select plus customize-only RRULE fields (frequency, BY*, ends).
export const RecurrenceEditor: React.FC<Props> = ({
	value,
	onChange,
	referenceDate,
}) => {
	const { t, firstDayOfWeek, currentLocale, currentDate } =
		useSmartCalendarContext((ctx) => ({
			t: ctx.t,
			firstDayOfWeek: ctx.firstDayOfWeek,
			currentLocale: ctx.currentLocale,
			currentDate: ctx.currentDate,
		}))
	const locale = currentLocale || currentDate.locale()
	const initialPreset = detectPresetFromOptions(value, referenceDate)
	const initialCustomize = initialPreset === 'customize'
	const initialOpts = value ?? buildDefaultCustomizeOptions(referenceDate)
	const initialDerived = deriveOnTheState(initialOpts, referenceDate)

	const [preset, setPreset] = useState<RecurrencePreset>(initialPreset)
	const [customizeMode, setCustomizeMode] = useState(initialCustomize)
	const [opts, setOpts] = useState<RRuleOptions>(initialOpts)
	const [monthlyMode, setMonthlyMode] = useState<MonthlyMode>(
		initialDerived.monthlyMode
	)
	const [yearlyMode, setYearlyMode] = useState<YearlyMode>(
		initialDerived.yearlyMode
	)
	const [dayOfMonth, setDayOfMonth] = useState(initialDerived.dayOfMonth)
	const [yearMonth, setYearMonth] = useState(initialDerived.yearMonth)
	const [onTheDay, setOnTheDay] = useState<OnTheDaySelection>(
		initialDerived.onTheDay
	)
	const [position, setPosition] = useState<OnThePosition>(
		initialDerived.position
	)

	const isCustomize = customizeMode
	const presetOptions = useMemo(() => getRecurrencePresetOrder(), [])

	const presetLabels = useMemo(
		() =>
			Object.fromEntries(
				presetOptions.map((key) => [
					key,
					getPresetLabel(key, t, locale, referenceDate),
				])
			) as Record<RecurrencePreset, string>,
		[presetOptions, referenceDate, t, locale]
	)

	const selectValue: RecurrencePreset = customizeMode
		? 'customize'
		: preset === 'once'
			? 'once'
			: value
				? detectPresetFromOptions(value, referenceDate)
				: preset

	const weekDays = useMemo(() => {
		const items = WEEKDAYS.map((weekdayValue, index) => ({
			key: String(index),
			value: weekdayValue,
			label: formatLocaleWeekday(index, locale, 'short'),
			index,
		}))
		return [...items.slice(firstDayOfWeek), ...items.slice(0, firstDayOfWeek)]
	}, [locale, firstDayOfWeek])

	// Syncs monthly/yearly "on day / on the" UI state from RRULE options.
	const syncUiFromOpts = useCallback(
		(next: RRuleOptions | null) => {
			const derived = deriveOnTheState(next, referenceDate)
			setMonthlyMode(derived.monthlyMode)
			setYearlyMode(derived.yearlyMode)
			setDayOfMonth(derived.dayOfMonth)
			setYearMonth(derived.yearMonth)
			setOnTheDay(derived.onTheDay)
			setPosition(derived.position)
		},
		[referenceDate]
	)

	useEffect(() => {
		if (!value) {
			return
		}
		setOpts(value)
		syncUiFromOpts(value)
		if (!customizeMode) {
			setPreset(detectPresetFromOptions(value, referenceDate))
		}
	}, [value, referenceDate, syncUiFromOpts, customizeMode])

	// Updates local RRULE state and notifies the parent (null when preset is Once).
	const emitChange = (next: RRuleOptions | null) => {
		if (next) {
			setOpts(next)
		}
		if (preset === 'once') {
			onChange(null)
			return
		}
		if (next) {
			onChange(next)
		}
	}

	// Merges a partial RRULE patch into opts and emits the result in customize mode.
	const mergeAndEmit = (patch: Partial<RRuleOptions>) => {
		if (!isCustomize || !opts) {
			return
		}
		const next = { ...opts, ...patch }
		emitChange(next)
	}

	// Builds and applies monthly/yearly BY* fields from the current on-day / on-the UI.
	const applyMonthlyYearlyPatch = (
		freq: number,
		mode: MonthlyMode | YearlyMode,
		overrides?: Partial<{
			dayOfMonth: number
			yearMonth: number
			onTheDay: OnTheDaySelection
			position: OnThePosition
		}>
	) => {
		if (!isCustomize || !opts) {
			return
		}
		const input = {
			dayOfMonth: overrides?.dayOfMonth ?? dayOfMonth,
			onTheDay: normalizeOnTheDaySelection(overrides?.onTheDay ?? onTheDay),
			position: overrides?.position ?? position,
			month: overrides?.yearMonth ?? yearMonth,
		}
		const patch =
			freq === RRule.MONTHLY
				? buildMonthlyPatch(mode as MonthlyMode, input)
				: buildYearlyPatch(mode as YearlyMode, input)
		mergeAndEmit(patch)
	}

	// Merges a partial RRULE update and emits it in customize mode.
	const update = (u: Partial<RRuleOptions>) => {
		if (!isCustomize || !opts) {
			return
		}
		const next = { ...opts, ...u }
		emitChange(next)
	}

	// Changes recurrence frequency and strips incompatible BY* fields for the new freq.
	const handleFreqChange = (freqKey: keyof typeof FREQ_MAP) => {
		if (!isCustomize || !opts) {
			return
		}
		const freq = FREQ_MAP[freqKey]
		const sanitized = sanitizeOptionsForFreq(freq, opts, referenceDate)
		emitChange(sanitized)
		syncUiFromOpts(sanitized)
	}

	// Applies a quick preset from the header select or enters customize mode.
	const handlePresetChange = (nextPreset: RecurrencePreset) => {
		if (nextPreset === 'customize') {
			setCustomizeMode(true)
			setPreset('customize')
			const next =
				preset === 'once' || !value
					? (opts ?? buildDefaultCustomizeOptions(referenceDate))
					: (value ?? opts ?? buildDefaultCustomizeOptions(referenceDate))
			setOpts(next)
			syncUiFromOpts(next)
			onChange(next)
			return
		}

		setCustomizeMode(false)
		setPreset(nextPreset)

		if (nextPreset === 'once') {
			const displayOpts = buildDefaultCustomizeOptions(referenceDate)
			setOpts(displayOpts)
			syncUiFromOpts(displayOpts)
			onChange(null)
			return
		}

		const built = buildPresetOptions(nextPreset, referenceDate)
		if (!built) {
			return
		}
		setOpts(built)
		syncUiFromOpts(built)
		onChange(built)
	}

	// Toggles one weekday in the weekly BYDAY list.
	const toggleDay = (weekdayIndex: number) => {
		const curr = (opts?.byweekday as Weekday[]) || []
		const day = WEEKDAYS[weekdayIndex]
		const next = curr.includes(day)
			? curr.filter((d) => d !== day)
			: [...curr, day]
		update({ byweekday: next.length ? next : undefined })
	}

	// Sets series end to never, after N occurrences, or on a specific date.
	const setEndType = (type: 'never' | 'count' | 'until') => {
		const u: Partial<RRuleOptions> = { count: undefined, until: undefined }
		if (type === 'count') {
			u.count = opts?.count || 1
		}
		if (type === 'until') {
			u.until = opts?.until || dayjs().add(1, 'month').endOf('day').toDate()
		}
		update(u)
	}

	// Switches monthly between "on day" and "on the" and updates the RRULE.
	const handleMonthlyModeChange = (mode: MonthlyMode) => {
		setMonthlyMode(mode)
		applyMonthlyYearlyPatch(RRule.MONTHLY, mode)
	}

	// Switches yearly between "on day" and "on the" and updates the RRULE.
	const handleYearlyModeChange = (mode: YearlyMode) => {
		setYearlyMode(mode)
		applyMonthlyYearlyPatch(RRule.YEARLY, mode)
	}

	const endType = opts?.until ? 'until' : opts?.count ? 'count' : 'never'
	const freq = FREQ_TO_STR[opts?.freq ?? RRule.DAILY] || 'DAILY'
	const selectedWeekdays = normalizeByweekday(opts?.byweekday)

	return (
		<Card data-testid="recurrence-editor">
			<CardHeader className="pb-3">
				<div className="flex items-center gap-2">
					<Label
						className="shrink-0 text-sm font-medium"
						htmlFor="recurrence-preset"
					>
						{t('repeat')}
					</Label>
					<Select
						onValueChange={(v) => handlePresetChange(v as RecurrencePreset)}
						value={selectValue}
					>
						<SelectTrigger
							className="h-9 min-w-0 flex-1"
							data-testid="recurrence-preset-select"
							id="recurrence-preset"
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{presetOptions.map((key) => (
								<SelectItem key={key} value={key}>
									{presetLabels[key]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</CardHeader>

			{isCustomize ? (
				<CardContent className="pt-0">
					<fieldset className="space-y-4 min-w-0 border-0 p-0 m-0">
						<div className="flex items-center gap-2">
							<Label className="text-xs" htmlFor="frequency">
								{t('repeatsEvery')}
							</Label>
							<Input
								aria-label={t('every')}
								className="h-8 w-15"
								id="interval"
								min="1"
								onChange={(e) => update({ interval: parseNum(e.target.value) })}
								type="number"
								value={opts?.interval || 1}
							/>
							<Select onValueChange={handleFreqChange} value={freq}>
								<SelectTrigger
									className="h-8"
									data-testid="frequency-select"
									id="frequency"
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Object.keys(FREQ_MAP).map((f) => {
										const freqKey = f as keyof typeof FREQ_MAP
										return (
											<SelectItem key={f} value={f}>
												{t(FREQ_LABEL_KEYS[freqKey]).toLowerCase()}
											</SelectItem>
										)
									})}
								</SelectContent>
							</Select>
							{opts?.freq === RRule.YEARLY ? (
								<>
									<span className="text-xs shrink-0">{t('recurrenceOn')}</span>
									<RecurrenceMonthSelect
										locale={locale}
										onChange={(month) => {
											setYearMonth(month)
											applyMonthlyYearlyPatch(RRule.YEARLY, yearlyMode, {
												yearMonth: month,
											})
										}}
										testId="yearly-on-month-select"
										value={yearMonth}
									/>
								</>
							) : null}
						</div>
						{opts?.freq === RRule.WEEKLY && (
							<WeeklyRecurrenceFields
								onToggleDay={toggleDay}
								selectedWeekdays={selectedWeekdays}
								t={t}
								weekDays={weekDays}
							/>
						)}
						{opts?.freq === RRule.MONTHLY && (
							<MonthlyRecurrenceFields
								dayOfMonth={dayOfMonth}
								locale={locale}
								mode={monthlyMode}
								onDayOfMonthChange={(day) => {
									setDayOfMonth(day)
									applyMonthlyYearlyPatch(RRule.MONTHLY, 'bymonthday', {
										dayOfMonth: day,
									})
								}}
								onModeChange={handleMonthlyModeChange}
								onOnTheDayChange={(day) => {
									const normalized = normalizeOnTheDaySelection(day)
									setOnTheDay(normalized)
									if (monthlyMode === 'byweekday') {
										applyMonthlyYearlyPatch(RRule.MONTHLY, 'byweekday', {
											onTheDay: normalized,
										})
									}
								}}
								onPositionChange={(pos) => {
									setPosition(pos)
									if (monthlyMode === 'byweekday') {
										applyMonthlyYearlyPatch(RRule.MONTHLY, 'byweekday', {
											position: pos,
										})
									}
								}}
								onTheDay={onTheDay}
								position={position}
								t={t}
								testIdPrefix="monthly"
							/>
						)}

						{opts?.freq === RRule.YEARLY && (
							<MonthlyRecurrenceFields
								dayOfMonth={dayOfMonth}
								locale={locale}
								mode={yearlyMode}
								onDayOfMonthChange={(day) => {
									setDayOfMonth(day)
									if (yearlyMode === 'bymonthday') {
										applyMonthlyYearlyPatch(RRule.YEARLY, 'bymonthday', {
											dayOfMonth: day,
										})
									}
								}}
								onModeChange={handleYearlyModeChange}
								onOnTheDayChange={(day) => {
									const normalized = normalizeOnTheDaySelection(day)
									setOnTheDay(normalized)
									if (yearlyMode === 'byweekday') {
										applyMonthlyYearlyPatch(RRule.YEARLY, 'byweekday', {
											onTheDay: normalized,
										})
									}
								}}
								onPositionChange={(pos) => {
									setPosition(pos)
									if (yearlyMode === 'byweekday') {
										applyMonthlyYearlyPatch(RRule.YEARLY, 'byweekday', {
											position: pos,
										})
									}
								}}
								onTheDay={onTheDay}
								position={position}
								t={t}
								testIdPrefix="yearly"
							/>
						)}

						<div>
							<Label className="text-xs">{t('ends')}</Label>
							<RadioGroup
								className="mt-1 gap-2"
								onValueChange={(value) =>
									setEndType(value as 'never' | 'count' | 'until')
								}
								value={endType}
							>
								{END_TYPES.map(({ type, id, labelKey }) => (
									<div className="flex flex-wrap items-center gap-2" key={type}>
										<RadioGroupItem
											data-testid={keys.listKey('end', type)}
											id={id}
											value={type}
										/>
										<Label className="text-xs cursor-pointer" htmlFor={id}>
											{t(labelKey)}
										</Label>
										{type === 'count' && endType === 'count' && (
											<>
												<Input
													className="h-6 w-16 text-xs"
													data-testid="count-input"
													min="1"
													onChange={(e) =>
														update({ count: parseNum(e.target.value) })
													}
													type="number"
													value={opts?.count || 1}
												/>
												<span className="text-xs">{t('occurrences')}</span>
											</>
										)}
										{type === 'until' && endType === 'until' && (
											<DatePicker
												className="h-6"
												date={opts?.until ?? undefined}
												onChange={(d) =>
													update({
														until: d
															? dayjs(d).endOf('day').toDate()
															: undefined,
													})
												}
											/>
										)}
									</div>
								))}
							</RadioGroup>
						</div>
					</fieldset>
				</CardContent>
			) : null}
		</Card>
	)
}
