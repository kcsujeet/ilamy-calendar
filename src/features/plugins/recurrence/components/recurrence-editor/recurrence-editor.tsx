import { dayjs, useIlamyCalendarContext } from '@ilamy/calendar'
import { useEffect, useState } from 'react'
import type { Weekday } from 'rrule'
import { RRule } from 'rrule'
import type { RRuleOptions } from '../../types'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Checkbox } from '../../ui/checkbox'
import { DatePicker } from '../../ui/date-picker'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Select } from '../../ui/select'

// Composes React `key=` props and element ids from parts. Local copy of the
// core `keys.listKey` helper (not part of the public surface).
const listKey = (...parts: Array<string | number>): string => parts.join('-')

const FREQ_MAP = {
	DAILY: RRule.DAILY,
	WEEKLY: RRule.WEEKLY,
	MONTHLY: RRule.MONTHLY,
	YEARLY: RRule.YEARLY,
} as const
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
const parseNum = (v: string) => Math.max(1, Number.parseInt(v, 10) || 1)

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

// Normalize rrule's byweekday (a single value, an array, or absent) to an array.
const resolveByweekday = (value: RRuleOptions['byweekday']) => {
	if (Array.isArray(value)) {
		return value
	}
	return value ? [value] : []
}

interface Props {
	value?: RRuleOptions | null
	onChange: (v: RRuleOptions | null) => void
}

export const RecurrenceEditor: React.FC<Props> = ({ value, onChange }) => {
	const { t, firstDayOfWeek } = useIlamyCalendarContext()
	const [show, setShow] = useState(!!value)
	const [opts, setOpts] = useState<RRuleOptions | null>(() => value || null)

	const WEEKDAY_OPTIONS = WEEKDAYS.map((value, index) => ({
		value,
		label: dayjs().day(index).format('ddd'),
	}))
	const weekDays = WEEKDAYS.map(
		(_weekday, i) => WEEKDAY_OPTIONS[(i + firstDayOfWeek) % 7]
	)

	useEffect(() => {
		setShow(!!value)
		if (value) {
			setOpts(value)
		}
	}, [value])

	const update = (u: Partial<RRuleOptions>) => {
		if (!opts) {
			return
		}
		const next = { ...opts, ...u }
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
		onChange(def)
	}

	const toggleDay = (i: number) => {
		const curr = (opts?.byweekday as Weekday[]) || []
		const day = WEEKDAYS[i]
		const isSelected = curr.includes(day)
		const next = isSelected ? curr.filter((d) => d !== day) : [...curr, day]
		update({ byweekday: next.length ? next : undefined })
	}

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

	const handleUntilChange = (d: Date | undefined) => {
		const until = d ? dayjs(d).endOf('day').toDate() : undefined
		update({ until })
	}

	let endType: 'never' | 'count' | 'until' = 'never'
	if (opts?.until) {
		endType = 'until'
	} else if (opts?.count) {
		endType = 'count'
	}
	const freq = FREQ_TO_STR[opts?.freq ?? RRule.DAILY] || 'DAILY'
	const byweekday = resolveByweekday(opts?.byweekday)
	const showSummary = Boolean(show && value)

	return (
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
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label className="text-xs" htmlFor="frequency">
									{t('repeats')}
								</Label>
								<Select
									className="h-8"
									data-testid="frequency-select"
									id="frequency"
									onValueChange={(f) =>
										update({ freq: FREQ_MAP[f as keyof typeof FREQ_MAP] })
									}
									value={freq}
								>
									{Object.keys(FREQ_MAP).map((f) => (
										<option key={f} value={f}>
											{t(f.toLowerCase())}
										</option>
									))}
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
									onChange={(e) =>
										update({ interval: parseNum(e.target.value) })
									}
									type="number"
									value={opts?.interval || 1}
								/>
							</div>
						</div>

						{opts?.freq === RRule.WEEKLY && (
							<div>
								<Label className="text-xs">{t('repeatOn')}</Label>
								<div className="flex flex-wrap gap-1 mt-1">
									{weekDays.map((d, i) => (
										<div
											className="flex items-center space-x-1"
											key={listKey('weekday', i)}
										>
											<Checkbox
												checked={byweekday.includes(d.value)}
												id={listKey('day', i)}
												onCheckedChange={() => toggleDay(i)}
											/>
											<Label
												className="text-xs cursor-pointer"
												htmlFor={listKey('day', i)}
											>
												{d.label}
											</Label>
										</div>
									))}
								</div>
							</div>
						)}

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
															update({ count: parseNum(e.target.value) })
														}
														type="number"
														value={opts?.count || 1}
													/>
													<span className="text-xs">{t('occurrences')}</span>
												</>
											)}
											{showUntilInput && (
												<DatePicker
													className="h-6"
													date={opts?.until ?? undefined}
													onChange={handleUntilChange}
												/>
											)}
										</div>
									)
								})}
							</div>
						</div>
					</div>
				</CardContent>
			)}
		</Card>
	)
}
