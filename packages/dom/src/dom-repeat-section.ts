import { Frequency, RRule } from 'rrule'
import {
	createLabeledField,
	createSelectControl,
	INPUT_CLASS,
} from './dom-dialog-shell'
import { createEl } from './dom-styles'
import type { DomRRuleInput } from './dom-types'

const DEFAULT_REPEAT_COUNT = 10
const WEEKDAY_CODES = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR]

const REPEAT_PRESETS: Array<{ value: string; label: string }> = [
	{ value: 'daily', label: 'Daily' },
	{ value: 'weekdays', label: 'Every weekday' },
	{ value: 'weekly', label: 'Weekly' },
	{ value: 'monthly', label: 'Monthly' },
	{ value: 'yearly', label: 'Yearly' },
]

const FREQ_BY_PRESET: Record<string, Frequency> = {
	daily: Frequency.DAILY,
	weekly: Frequency.WEEKLY,
	monthly: Frequency.MONTHLY,
	yearly: Frequency.YEARLY,
}

const detectRepeatPreset = (rrule: DomRRuleInput | undefined): string => {
	if (!rrule || rrule.freq === undefined) return 'daily'
	if (
		rrule.freq === Frequency.WEEKLY &&
		Array.isArray(rrule.byweekday) &&
		rrule.byweekday.length === WEEKDAY_CODES.length
	) {
		return 'weekdays'
	}
	if (rrule.freq === Frequency.WEEKLY) return 'weekly'
	if (rrule.freq === Frequency.MONTHLY) return 'monthly'
	if (rrule.freq === Frequency.YEARLY) return 'yearly'
	return 'daily'
}

const presetToRRule = (
	preset: string,
	endMode: 'never' | 'after',
	countValue: number
): DomRRuleInput => {
	const count = endMode === 'after' ? Math.max(1, countValue) : undefined
	if (preset === 'weekdays') {
		return {
			freq: Frequency.WEEKLY,
			interval: 1,
			byweekday: WEEKDAY_CODES,
			count,
		}
	}
	return { freq: FREQ_BY_PRESET[preset] ?? Frequency.DAILY, interval: 1, count }
}

/** Creates the expandable Repeat recurrence card for the DOM event dialog. */
export const createRepeatSection = (
	initialRRule: DomRRuleInput | undefined
) => {
	let enabled = Boolean(initialRRule)
	let preset = detectRepeatPreset(initialRRule)
	let endMode: 'never' | 'after' = initialRRule?.count ? 'after' : 'never'
	let count = initialRRule?.count ?? DEFAULT_REPEAT_COUNT

	const card = createEl('div', {
		className: 'rounded-lg border border-border p-3 space-y-3',
	})

	const checkbox = createEl('input', {
		attrs: { type: 'checkbox', id: 'repeat-toggle' },
		className:
			'size-4 rounded border border-muted-foreground/50 accent-primary cursor-pointer',
	})
	checkbox.checked = enabled

	const summaryText = createEl('span', {
		className: 'block text-xs text-muted-foreground',
	})

	const presetSelect = createSelectControl(
		REPEAT_PRESETS,
		preset,
		'repeat-preset'
	)
	const endSelect = createSelectControl(
		[
			{ value: 'never', label: 'Never' },
			{ value: 'after', label: 'After occurrences' },
		],
		endMode,
		'repeat-end-mode'
	)
	const countInput = createEl('input', {
		className: `${INPUT_CLASS} w-24`,
		attrs: { type: 'number', min: '1', max: '365', value: String(count) },
	})
	const countRow = createEl('div', { className: 'flex items-center gap-2' }, [
		countInput,
		createEl('span', {
			text: 'occurrences',
			className: 'text-sm text-muted-foreground',
		}),
	])

	const body = createEl('div', { className: 'space-y-3 pt-1' }, [
		createLabeledField('Repeats', 'repeat-preset', presetSelect),
		createLabeledField('Ends', 'repeat-end-mode', endSelect),
		countRow,
	])

	const syncUi = () => {
		const activePreset = REPEAT_PRESETS.find((item) => item.value === preset)
		const activeLabel = activePreset?.label ?? 'Daily'
		summaryText.textContent = enabled ? activeLabel : ''
		summaryText.style.display = enabled ? '' : 'none'
		body.style.display = enabled ? '' : 'none'
		countRow.style.display = endMode === 'after' ? 'flex' : 'none'
	}

	checkbox.addEventListener('change', () => {
		enabled = checkbox.checked
		syncUi()
	})
	presetSelect.addEventListener('change', () => {
		preset = presetSelect.value
		syncUi()
	})
	endSelect.addEventListener('change', () => {
		endMode = endSelect.value === 'after' ? 'after' : 'never'
		syncUi()
	})
	countInput.addEventListener('input', () => {
		const parsed = Number.parseInt(countInput.value, 10)
		if (Number.isFinite(parsed) && parsed > 0) count = parsed
	})

	const toggleHeader = createEl(
		'label',
		{
			attrs: { for: 'repeat-toggle' },
			className: 'flex items-center gap-2.5 cursor-pointer select-none',
		},
		[
			checkbox,
			createEl('div', {}, [
				createEl('span', {
					text: 'Repeat',
					className: 'text-sm font-medium text-foreground',
				}),
				summaryText,
			]),
		]
	)

	card.append(toggleHeader, body)
	syncUi()

	return {
		element: card,
		getRRule: (): DomRRuleInput | undefined =>
			enabled ? presetToRRule(preset, endMode, count) : undefined,
	}
}
