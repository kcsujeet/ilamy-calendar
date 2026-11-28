/** @jsxImportSource preact */
import { createTranslator, type TranslatorFunction } from '@ilamy/calendar'
import { useLayoutEffect, useState } from 'preact/hooks'
import { RRule, type Weekday } from 'rrule'
import {
	add,
	endOf,
	now,
	parseDate,
	resolveZone,
	toDate,
} from '../../../../../utils/temporal'
import {
	type RecurrenceEditorContextValue,
	RecurrenceEditorProvider,
} from '../../stores/recurrence-editor-context'
import type { RRuleOptions } from '../../types'
import {
	detectPreset,
	getPresetRRule,
	type RecurrencePreset,
	resolveByweekday,
} from '../../utils/recurrence-presets'
import { RecurrenceEndFields } from './recurrence-end-fields'
import { RecurrenceFrequencyFields } from './recurrence-frequency-fields'
import { RecurrenceMonthlyMode } from './recurrence-monthly-mode'
import { RecurrencePresetSelect } from './recurrence-preset-select'
import { RecurrenceWeekdayPicker } from './recurrence-weekday-picker'

const defaultT: TranslatorFunction = createTranslator()

const getDescription = (opts: RRuleOptions | null, t: TranslatorFunction) => {
	if (!opts) {
		return t('customRecurrence')
	}
	try {
		const text = new RRule(opts).toText()
		const isUsableText = Boolean(text) && !text.toLowerCase().includes('error')
		if (!isUsableText) {
			return t('customRecurrence')
		}
		return text.charAt(0).toUpperCase() + text.slice(1)
	} catch {
		return t('customRecurrence')
	}
}

interface RecurrenceEditorProps {
	value?: RRuleOptions | null
	onChange: (v: RRuleOptions | null) => void
	referenceDate?: Date
	timezone?: string
	locale?: string
	firstDayOfWeek?: number
	t?: TranslatorFunction
}

export const RecurrenceEditor = ({
	value,
	onChange,
	referenceDate,
	timezone,
	locale = 'en-US',
	firstDayOfWeek = 0,
	t = defaultT,
}: RecurrenceEditorProps) => {
	const zone = resolveZone(timezone)
	const getReferenceDate = (rule: RRuleOptions | null) =>
		rule?.dtstart ?? referenceDate ?? toDate(now(zone))
	const [show, setShow] = useState(Boolean(value))
	const [opts, setOpts] = useState<RRuleOptions | null>(() => value || null)
	const [custom, setCustom] = useState(
		() =>
			detectPreset(value ?? null, getReferenceDate(value ?? null), zone) ===
			'customize'
	)

	useLayoutEffect(() => {
		setShow(Boolean(value))
		if (value) {
			setOpts(value)
			const ref = value.dtstart ?? referenceDate ?? toDate(now(zone))
			setCustom(detectPreset(value, ref, zone) === 'customize')
		}
	}, [value, referenceDate, zone])

	const reference = getReferenceDate(opts)

	const update = (changes: Partial<RRuleOptions>) => {
		if (!opts) {
			return
		}
		const next = { ...opts, ...changes }
		setOpts(next)
		onChange(show ? next : null)
	}

	const toggle = (checked: boolean) => {
		setShow(checked)
		if (!checked) {
			onChange(null)
			return
		}
		if (opts) {
			onChange(opts)
			return
		}
		const def = { freq: RRule.DAILY, interval: 1 } as RRuleOptions
		setOpts(def)
		setCustom(false)
		onChange(def)
	}

	const selectPreset = (chosen: RecurrencePreset) => {
		if (chosen === 'customize') {
			setCustom(true)
			return
		}
		setCustom(false)
		const rule = getPresetRRule(chosen, reference, zone)
		if (!rule) {
			return
		}
		const next = { ...rule, count: opts?.count, until: opts?.until }
		setOpts(next)
		onChange(next)
	}

	const toggleDay = (day: Weekday) => {
		const curr = resolveByweekday(opts?.byweekday) as Weekday[]
		const isSelected = curr.includes(day)
		const next = isSelected ? curr.filter((d) => d !== day) : [...curr, day]
		update({ byweekday: next.length ? next : undefined })
	}

	const setEndType = (type: 'never' | 'count' | 'until') => {
		const changes: Partial<RRuleOptions> = {
			count: undefined,
			until: undefined,
		}
		if (type === 'count') {
			changes.count = opts?.count || 1
		}
		if (type === 'until') {
			changes.until =
				opts?.until || toDate(endOf(add(now(zone), 1, 'month'), 'day'))
		}
		update(changes)
	}

	const setUntil = (d: Date | undefined) => {
		const parsed = d ? parseDate(d, zone) : undefined
		const until = parsed ? toDate(endOf(parsed, 'day')) : undefined
		update({ until })
	}

	const setMonthlyMode = (mode: 'day' | 'weekday') => {
		if (mode === 'weekday') {
			const rule = getPresetRRule('monthlyOnWeekday', reference, zone)
			update({ byweekday: rule?.byweekday, bymonthday: undefined })
			return
		}
		const rule = getPresetRRule('monthlyOnDay', reference, zone)
		update({ bymonthday: rule?.bymonthday, byweekday: undefined })
	}

	const editor: RecurrenceEditorContextValue = {
		opts,
		custom,
		reference,
		timezone: zone,
		locale,
		firstDayOfWeek,
		t,
		update,
		selectPreset,
		toggleDay,
		setMonthlyMode,
		setEndType,
		setUntil,
	}
	const showSummary = Boolean(show && value)

	return (
		<RecurrenceEditorProvider value={editor}>
			<div data-ilamy-part="repeat-card" data-testid="recurrence-editor">
				<div data-ilamy-part="repeat-header">
					<label data-ilamy-part="form-checkbox-row" htmlFor="recurring">
						<input
							checked={show}
							data-testid="toggle-recurrence"
							id="recurring"
							onChange={(e) => toggle((e.target as HTMLInputElement).checked)}
							type="checkbox"
						/>
						<span>{t('repeat')}</span>
					</label>
					{showSummary && (
						<p data-ilamy-part="repeat-summary">
							{getDescription(value ?? null, t)}
						</p>
					)}
				</div>

				{show && (
					<div data-ilamy-part="repeat-body">
						<RecurrencePresetSelect />
						<RecurrenceFrequencyFields />
						<RecurrenceWeekdayPicker />
						<RecurrenceMonthlyMode />
						<RecurrenceEndFields />
					</div>
				)}
			</div>
		</RecurrenceEditorProvider>
	)
}
