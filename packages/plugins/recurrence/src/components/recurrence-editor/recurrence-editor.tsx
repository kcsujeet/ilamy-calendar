import { useIlamyCalendarContext } from '@ilamy/calendar'
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@ilamy/ui/components/card'
import { Checkbox } from '@ilamy/ui/components/checkbox'
import dayjs from '@ilamy/utils/dayjs'
import { useEffect, useState } from 'react'
import { RRule, type Weekday } from 'rrule'
import {
	type RecurrenceEditorContextValue,
	RecurrenceEditorProvider,
} from '../../contexts/recurrence-editor-context'
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

const getDescription = (
	opts: RRuleOptions | null,
	t: (k: string) => string
) => {
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

interface Props {
	value?: RRuleOptions | null
	onChange: (v: RRuleOptions | null) => void
	// Anchor for presets and the "nth weekday" math (the event's start). Falls
	// back to the rule's own dtstart, then today.
	referenceDate?: Date
}

export const RecurrenceEditor: React.FC<Props> = ({
	value,
	onChange,
	referenceDate,
}) => {
	const { t } = useIlamyCalendarContext()
	const getReferenceDate = (rule: RRuleOptions | null) =>
		rule?.dtstart ?? referenceDate ?? dayjs().toDate()
	const [show, setShow] = useState(Boolean(value))
	const [opts, setOpts] = useState<RRuleOptions | null>(() => value || null)
	const [custom, setCustom] = useState(
		() =>
			detectPreset(value ?? null, getReferenceDate(value ?? null)) ===
			'customize'
	)

	useEffect(() => {
		setShow(Boolean(value))
		if (value) {
			setOpts(value)
			const ref = value.dtstart ?? referenceDate ?? dayjs().toDate()
			setCustom(detectPreset(value, ref) === 'customize')
		}
	}, [value, referenceDate])

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
		// The form section anchors dtstart from the event's start; the editor's
		// default carries just the pattern.
		const def = { freq: RRule.DAILY, interval: 1 } as RRuleOptions
		setOpts(def)
		setCustom(false)
		onChange(def)
	}

	// Apply a preset, preserving any end condition (presets only set the pattern).
	const selectPreset = (chosen: RecurrencePreset) => {
		if (chosen === 'customize') {
			setCustom(true)
			return
		}
		setCustom(false)
		const rule = getPresetRRule(chosen, reference)
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
				opts?.until || dayjs().add(1, 'month').endOf('day').toDate()
		}
		update(changes)
	}

	const setUntil = (d: Date | undefined) => {
		const until = d ? dayjs(d).endOf('day').toDate() : undefined
		update({ until })
	}

	// Monthly "on day N" vs "on the Nth weekday" — reuse the preset builders so
	// the weekday/position math lives in one place.
	const setMonthlyMode = (mode: 'day' | 'weekday') => {
		if (mode === 'weekday') {
			const rule = getPresetRRule('monthlyOnWeekday', reference)
			update({ byweekday: rule?.byweekday, bymonthday: undefined })
			return
		}
		const rule = getPresetRRule('monthlyOnDay', reference)
		update({ bymonthday: rule?.bymonthday, byweekday: undefined })
	}

	const editor: RecurrenceEditorContextValue = {
		opts,
		custom,
		reference,
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
			<Card data-testid="recurrence-editor">
				<CardHeader className="pb-3">
					<div className="flex items-center space-x-2">
						<Checkbox
							checked={show}
							data-testid="toggle-recurrence"
							id="recurring"
							onCheckedChange={toggle}
						/>
						<CardTitle className="text-sm">{t('repeat')}</CardTitle>
					</div>
					{showSummary && (
						<p className="text-xs text-muted-foreground">
							{getDescription(value ?? null, t)}
						</p>
					)}
				</CardHeader>

				{show && (
					<CardContent className="pt-0">
						<div className="space-y-4">
							<RecurrencePresetSelect />
							<RecurrenceFrequencyFields />
							<RecurrenceWeekdayPicker />
							<RecurrenceMonthlyMode />
							<RecurrenceEndFields />
						</div>
					</CardContent>
				)}
			</Card>
		</RecurrenceEditorProvider>
	)
}
