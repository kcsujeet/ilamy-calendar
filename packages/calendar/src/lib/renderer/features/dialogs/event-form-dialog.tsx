/** @jsxImportSource preact */
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import {
	add,
	type CalendarEvent,
	type CalendarEventInput,
	type CellInfo,
	type EventFormSlotContext,
	formatDate,
	fromFields,
	type HeadlessCalendarController,
	isBefore,
	isRangeWithinBusinessHours,
	now,
	type OpenEventFormInput,
	type PluginEventFormContext,
	parseDate,
	type Resource,
	SLOT_EVENT_FORM,
	startOf,
	toOffsetIso,
	type ZonedDate,
} from '../../../../index'
import { DialogShell } from '../../components/dialog-shell'
import { DayPickerGrid, PopoverShell } from '../../components/mini-calendar'
import { PluginSlotHost } from '../../components/plugin-slot-host'
import { LegacyRenderHost, SlotHost } from '../../components/slot-host'
import type {
	DomCalendarEvent,
	DomCalendarEventInput,
	DomCalendarOptions,
	DomEventFormRenderContext,
	DomMutationScope,
	RendererActions,
} from '../../types/renderer.types'
import { resolveEffectiveBusinessHours } from '../../utils/constraints.utils'
import { rendererKeys } from '../../utils/keys.utils'

const COLOR_SWATCHES = [
	{ bg: '#dbeafe', fg: '#1e40af', label: 'Blue' },
	{ bg: '#dcfce7', fg: '#166534', label: 'Green' },
	{ bg: '#fef3c7', fg: '#92400e', label: 'Amber' },
	{ bg: '#fce7f3', fg: '#9d174d', label: 'Pink' },
	{ bg: '#ede9fe', fg: '#5b21b6', label: 'Purple' },
	{ bg: '#fee2e2', fg: '#991b1b', label: 'Red' },
]

const formatTimeLabel = (
	hour: number,
	minute: number,
	timeFormat: '12-hour' | '24-hour',
	locale: string
): string => {
	const anchor = startOf(now('UTC'), 'day')
	const dt = add(add(anchor, hour, 'hour'), minute, 'minute')
	return formatDate(
		dt,
		{
			hour: timeFormat === '24-hour' ? '2-digit' : 'numeric',
			minute: '2-digit',
			hour12: timeFormat !== '24-hour',
		},
		locale
	)
}

const buildTimeOptions = (
	timeFormat: '12-hour' | '24-hour',
	locale: string
): Array<{ key: string; label: string; hour: number; minute: number }> => {
	const list: Array<{
		key: string
		label: string
		hour: number
		minute: number
	}> = []
	for (let hour = 0; hour < 24; hour += 1) {
		for (const minute of [0, 15, 30, 45]) {
			list.push({
				key: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
				label: formatTimeLabel(hour, minute, timeFormat, locale),
				hour,
				minute,
			})
		}
	}
	return list
}

const DatePickerButton = ({
	id,
	date,
	locale,
	firstDayOfWeek,
	onChange,
}: {
	id: string
	date: ZonedDate
	locale: string
	firstDayOfWeek: number
	onChange: (next: ZonedDate) => void
}) => {
	const [open, setOpen] = useState(false)
	const btnRef = useRef<HTMLButtonElement>(null)
	const close = useCallback(() => setOpen(false), [])
	return (
		<>
			<button
				aria-expanded={open}
				aria-haspopup="dialog"
				data-ilamy-slot="input"
				data-testid={rendererKeys.testId.datePicker(id)}
				id={id}
				onClick={() => setOpen((p) => !p)}
				ref={btnRef}
				style={{ textAlign: 'left', cursor: 'pointer' }}
				type="button"
			>
				{formatDate(
					date,
					{ month: 'short', day: 'numeric', year: 'numeric' },
					locale
				)}
			</button>
			<PopoverShell
				anchorRef={btnRef}
				minWidth={250}
				onClose={close}
				open={open}
			>
				<DayPickerGrid
					firstDayOfWeek={firstDayOfWeek}
					locale={locale}
					onSelect={(picked) => {
						onChange(picked)
						setOpen(false)
					}}
					selected={date}
				/>
			</PopoverShell>
		</>
	)
}

interface TimeOption {
	key: string
	label: string
	hour: number
	minute: number
}

const TimePickerPanel = ({
	options,
	currentKey,
	t,
	onSelect,
}: {
	options: TimeOption[]
	currentKey: string
	t: RendererActions['t']
	onSelect: (hour: number, minute: number) => void
}) => {
	const [search, setSearch] = useState('')
	const inputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		const timer = setTimeout(() => {
			inputRef.current?.focus()
		}, 0)
		return () => clearTimeout(timer)
	}, [])

	const query = search.trim().toLowerCase()
	const matching = query
		? options.filter((opt) => opt.label.toLowerCase().includes(query))
		: options

	return (
		<>
			<div data-ilamy-part="time-picker-search">
				<input
					data-ilamy-slot="input"
					onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
					placeholder={t('searchTime')}
					ref={inputRef}
					type="text"
					value={search}
				/>
			</div>
			<div data-ilamy-part="time-picker-list">
				{matching.length === 0 ? (
					<div data-ilamy-part="time-picker-empty">{t('noTimeFound')}</div>
				) : (
					matching.map((opt) => (
						<button
							data-ilamy-part="picker-cell"
							data-selected={opt.key === currentKey ? 'true' : undefined}
							key={opt.key}
							onClick={() => onSelect(opt.hour, opt.minute)}
							style={{ textAlign: 'left' }}
							type="button"
						>
							{opt.label}
						</button>
					))
				)}
			</div>
		</>
	)
}

const TimePickerButton = ({
	id,
	hour,
	minute,
	timeFormat,
	locale,
	t,
	onChange,
}: {
	id: string
	hour: number
	minute: number
	timeFormat: '12-hour' | '24-hour'
	locale: string
	t: RendererActions['t']
	onChange: (h: number, m: number) => void
}) => {
	const [open, setOpen] = useState(false)
	const btnRef = useRef<HTMLButtonElement>(null)
	const close = useCallback(() => setOpen(false), [])
	const options = useMemo(
		() => buildTimeOptions(timeFormat, locale),
		[timeFormat, locale]
	)
	const currentKey = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
	const currentLabel =
		options.find((o) => o.key === currentKey)?.label ??
		formatTimeLabel(hour, minute, timeFormat, locale)

	return (
		<>
			<button
				aria-expanded={open}
				data-ilamy-slot="input"
				data-testid={rendererKeys.testId.timePicker(id)}
				id={id}
				onClick={() => setOpen((p) => !p)}
				ref={btnRef}
				role="combobox"
				style={{ textAlign: 'left', cursor: 'pointer' }}
				type="button"
			>
				{currentLabel}
			</button>
			<PopoverShell
				anchorRef={btnRef}
				minWidth={180}
				onClose={close}
				open={open}
			>
				{open && (
					<TimePickerPanel
						currentKey={currentKey}
						onSelect={(h, m) => {
							onChange(h, m)
							setOpen(false)
						}}
						options={options}
						t={t}
					/>
				)}
			</PopoverShell>
		</>
	)
}

const EventScheduleFields = ({
	allDay,
	startDate,
	endDate,
	startTime,
	endTime,
	firstDayOfWeek,
	locale,
	timeFormat,
	t,
	onChangeStartDate,
	onChangeEndDate,
	onChangeStartTime,
	onChangeEndTime,
}: {
	allDay: boolean
	startDate: ZonedDate
	endDate: ZonedDate
	startTime: { hour: number; minute: number }
	endTime: { hour: number; minute: number }
	firstDayOfWeek: number
	locale: string
	timeFormat: '12-hour' | '24-hour'
	t: RendererActions['t']
	onChangeStartDate: (d: ZonedDate) => void
	onChangeEndDate: (d: ZonedDate) => void
	onChangeStartTime: (h: number, m: number) => void
	onChangeEndTime: (h: number, m: number) => void
}) => (
	<>
		<div data-ilamy-part="form-grid-2">
			<div>
				<label data-ilamy-part="form-label" htmlFor="start-date">
					{t('startDate')}
				</label>
				<DatePickerButton
					date={startDate}
					firstDayOfWeek={firstDayOfWeek}
					id="start-date"
					locale={locale}
					onChange={onChangeStartDate}
				/>
			</div>
			<div>
				<label data-ilamy-part="form-label" htmlFor="end-date">
					{t('endDate')}
				</label>
				<DatePickerButton
					date={endDate}
					firstDayOfWeek={firstDayOfWeek}
					id="end-date"
					locale={locale}
					onChange={onChangeEndDate}
				/>
			</div>
		</div>

		{!allDay && (
			<div data-ilamy-part="form-grid-2">
				<div>
					<label data-ilamy-part="form-label" htmlFor="start-time">
						{t('startTime')}
					</label>
					<TimePickerButton
						hour={startTime.hour}
						id="start-time"
						locale={locale}
						minute={startTime.minute}
						onChange={onChangeStartTime}
						t={t}
						timeFormat={timeFormat}
					/>
				</div>
				<div>
					<label data-ilamy-part="form-label" htmlFor="end-time">
						{t('endTime')}
					</label>
					<TimePickerButton
						hour={endTime.hour}
						id="end-time"
						locale={locale}
						minute={endTime.minute}
						onChange={onChangeEndTime}
						t={t}
						timeFormat={timeFormat}
					/>
				</div>
			</div>
		)}
	</>
)

const EventColorSwatches = ({
	bgColor,
	t,
	onPick,
}: {
	bgColor: string
	t: RendererActions['t']
	onPick: (bg: string, fg: string) => void
}) => (
	<div>
		<span data-ilamy-part="form-label">{t('color')}</span>
		<div data-ilamy-part="color-swatches">
			{COLOR_SWATCHES.map((sw) => (
				<button
					aria-label={sw.label}
					data-ilamy-part="color-swatch"
					data-selected={bgColor === sw.bg ? 'true' : undefined}
					key={sw.bg}
					onClick={() => onPick(sw.bg, sw.fg)}
					style={{ backgroundColor: sw.bg }}
					type="button"
				/>
			))}
		</div>
	</div>
)

const EventFormFooter = ({
	hasExisting,
	t,
	onDelete,
	onClose,
}: {
	hasExisting: boolean
	t: RendererActions['t']
	onDelete: () => void
	onClose: () => void
}) => (
	<div data-ilamy-part="dialog-footer">
		{hasExisting && (
			<button
				data-ilamy-part="btn"
				data-testid="dom-event-delete-btn"
				data-variant="danger"
				onClick={onDelete}
				type="button"
			>
				{t('delete')}
			</button>
		)}
		<button data-ilamy-part="btn" onClick={onClose} type="button">
			{t('cancel')}
		</button>
		<button
			data-ilamy-part="btn"
			data-testid="dom-event-save-btn"
			data-variant="primary"
			type="submit"
		>
			{hasExisting ? t('update') : t('create')}
		</button>
	</div>
)

const computeSubmitRange = ({
	allDay,
	startDate,
	endDate,
	startTime,
	endTime,
	timezone,
}: {
	allDay: boolean
	startDate: ZonedDate
	endDate: ZonedDate
	startTime: { hour: number; minute: number }
	endTime: { hour: number; minute: number }
	timezone: string
}) => {
	if (allDay) {
		const sd = startOf(startDate, 'day')
		const rawEd = startOf(endDate, 'day')
		const ed = isBefore(rawEd, sd, 'day')
			? add(sd, 1, 'day')
			: add(rawEd, 1, 'day')
		return { start: toOffsetIso(sd), end: toOffsetIso(ed), allDay: true }
	}
	const sz = fromFields(
		{
			year: startDate.year,
			month: startDate.month,
			day: startDate.day,
			hour: startTime.hour,
			minute: startTime.minute,
		},
		timezone
	)
	let ez = fromFields(
		{
			year: endDate.year,
			month: endDate.month,
			day: endDate.day,
			hour: endTime.hour,
			minute: endTime.minute,
		},
		timezone
	)
	if (!isBefore(sz, ez)) {
		ez = add(sz, 1, 'hour')
	}
	return { start: toOffsetIso(sz), end: toOffsetIso(ez), allDay: false }
}

const isAllowedByBusinessHours = (
	range: { start: string; end: string; allDay: boolean },
	existing: DomCalendarEvent | null,
	chosenResource: Resource | undefined,
	options: DomCalendarOptions,
	timezone: string
): boolean => {
	const constrained =
		(Boolean(existing) && options.eventConstraint === 'businessHours') ||
		(!existing && options.selectConstraint === 'businessHours')
	if (!constrained) return true
	const effHours = resolveEffectiveBusinessHours(options, chosenResource)
	const rStart = parseDate(range.start, timezone)
	const rEnd = parseDate(range.end, timezone)
	if (!effHours || !rStart || !rEnd) return true
	return isRangeWithinBusinessHours({
		start: rStart,
		end: rEnd,
		allDay: range.allDay,
		businessHours: effHours,
	})
}

const resolvePayloadColors = (
	existing: DomCalendarEvent | null,
	colorChanged: boolean,
	bgColor: string,
	fgColor: string
) => {
	if (!colorChanged && existing) {
		return { backgroundColor: existing.backgroundColor, color: existing.color }
	}
	return { backgroundColor: bgColor, color: fgColor }
}

const trimOptional = (value: string): string | undefined =>
	value.trim() || undefined

const resolvePayloadResource = (
	existing: DomCalendarEvent | null,
	chosenResource: Resource | undefined,
	resourceDirty: boolean
) => {
	const preserveCrossResource =
		!resourceDirty &&
		existing?.resourceId === undefined &&
		Boolean(existing?.resourceIds?.length)
	return preserveCrossResource
		? { resourceIds: existing?.resourceIds }
		: { resourceId: chosenResource?.id }
}

const buildSubmittedPayload = (params: {
	existing: DomCalendarEvent | null
	title: string
	description: string
	location: string
	range: { start: string; end: string; allDay: boolean }
	colorChanged: boolean
	bgColor: string
	fgColor: string
	chosenResource: Resource | undefined
	resourceDirty: boolean
	pluginFields: Partial<CalendarEvent>
}): DomCalendarEventInput => {
	const colors = resolvePayloadColors(
		params.existing,
		params.colorChanged,
		params.bgColor,
		params.fgColor
	)
	return {
		...params.pluginFields,
		id: params.existing?.id ?? `evt-${Date.now()}`,
		title: trimOptional(params.title) ?? 'Untitled Event',
		start: params.range.start,
		end: params.range.end,
		allDay: params.range.allDay,
		backgroundColor: colors.backgroundColor,
		color: colors.color,
		description: trimOptional(params.description),
		location: trimOptional(params.location),
		...resolvePayloadResource(
			params.existing,
			params.chosenResource,
			params.resourceDirty
		),
	}
}

const commitFormSave = ({
	existing,
	payload,
	actions,
	onRequestScope,
	onClose,
}: {
	existing: DomCalendarEvent | null
	payload: DomCalendarEventInput
	actions: RendererActions
	onRequestScope: EventFormBodyProps['onRequestScope']
	onClose: () => void
}) => {
	onClose()
	if (existing) {
		const { id: _ignoredId, ...updates } = payload
		if (actions.pluginRuntime.getEventManager(existing)) {
			onRequestScope(existing, 'edit', (scope) => {
				actions.commitUpdate(existing, updates, scope)
			})
			return
		}
		actions.commitUpdate(existing, updates, 'this')
		return
	}
	actions.commitAdd(payload)
}

interface EventFormBodyProps {
	existing: DomCalendarEvent | null
	seedDraft?: OpenEventFormInput
	initialStart: ZonedDate
	initialEnd: ZonedDate
	initialAllDay: boolean
	initialResourceId: string | number | undefined
	resources: Resource[]
	timezone: string
	locale: string
	firstDayOfWeek: number
	timeFormat: '12-hour' | '24-hour'
	options: DomCalendarOptions
	actions: RendererActions
	onRequestScope: (
		event: DomCalendarEvent,
		mode: 'edit' | 'delete',
		onConfirm: (scope: DomMutationScope) => void
	) => void
	onClose: () => void
}

const EventResourceField = ({
	resources,
	resourceId,
	t,
	onChange,
}: {
	resources: Resource[]
	resourceId: string
	t: RendererActions['t']
	onChange: (value: string) => void
}) => {
	if (resources.length === 0) return null
	return (
		<div>
			<label data-ilamy-part="form-label" htmlFor="resource">
				{t('resource')}
			</label>
			<select
				data-ilamy-slot="select"
				id="resource"
				name="resource"
				onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
				value={resourceId}
			>
				{resources.map((res) => (
					<option key={res.id} value={String(res.id)}>
						{res.title}
					</option>
				))}
			</select>
		</div>
	)
}

const MS_PER_MINUTE = 60_000
const FALLBACK_LENGTH_MINUTES = 60

interface ScheduleFieldsState {
	allDay: boolean
	startDate: ZonedDate
	endDate: ZonedDate
	startTime: { hour: number; minute: number }
	endTime: { hour: number; minute: number }
}

const wallMinutes = (
	date: ZonedDate,
	time: { hour: number; minute: number }
): number =>
	Date.UTC(date.year, date.month - 1, date.day, time.hour, time.minute) /
	MS_PER_MINUTE

const fromWallMinutes = (minutes: number, timezone: string) => {
	const d = new Date(minutes * MS_PER_MINUTE)
	return {
		date: fromFields(
			{
				year: d.getUTCFullYear(),
				month: d.getUTCMonth() + 1,
				day: d.getUTCDate(),
			},
			timezone
		),
		time: { hour: d.getUTCHours(), minute: d.getUTCMinutes() },
	}
}

const openedLengthMinutes = (
	start: ZonedDate,
	end: ZonedDate,
	allDay: boolean
): number => {
	if (allDay) return FALLBACK_LENGTH_MINUTES
	const diff =
		wallMinutes(end, { hour: end.hour, minute: end.minute }) -
		wallMinutes(start, { hour: start.hour, minute: start.minute })
	return diff > 0 ? diff : FALLBACK_LENGTH_MINUTES
}

export const keepEndAfterStart = <T extends ScheduleFieldsState>(
	schedule: T,
	movedEdge: 'start' | 'end',
	lengthMinutes: number,
	timezone: string
): T => {
	if (schedule.allDay) {
		if (!isBefore(schedule.endDate, schedule.startDate, 'day')) {
			return schedule
		}
		return movedEdge === 'start'
			? { ...schedule, endDate: schedule.startDate }
			: { ...schedule, startDate: schedule.endDate }
	}
	const start = wallMinutes(schedule.startDate, schedule.startTime)
	const end = wallMinutes(schedule.endDate, schedule.endTime)
	if (end > start) return schedule
	if (movedEdge === 'start') {
		const movedEnd = fromWallMinutes(start + lengthMinutes, timezone)
		return { ...schedule, endDate: movedEnd.date, endTime: movedEnd.time }
	}
	const movedStart = fromWallMinutes(end - lengthMinutes, timezone)
	return { ...schedule, startDate: movedStart.date, startTime: movedStart.time }
}

const createDraftCore = (props: EventFormBodyProps, resourceId: string) => ({
	allDay: props.initialAllDay,
	startDate: props.initialStart,
	endDate: props.initialEnd,
	startTime: {
		hour: props.initialStart.hour,
		minute: props.initialStart.minute,
	},
	endTime: { hour: props.initialEnd.hour, minute: props.initialEnd.minute },
	resourceId,
	colorChanged: false,
	scheduleDirty: false,
	resourceDirty: false,
})

const resolveDefaultResourceId = (
	initialResourceId: string | number | undefined,
	resources: Resource[]
): string => {
	if (initialResourceId !== undefined) return String(initialResourceId)
	const first = resources[0]
	return first ? String(first.id) : ''
}

type DraftTextSource = Partial<
	Pick<
		DomCalendarEvent,
		'title' | 'description' | 'location' | 'backgroundColor' | 'color'
	>
>

const createDraftFromSource = (
	base: ReturnType<typeof createDraftCore>,
	fallbackTitle: string,
	source: DraftTextSource = {}
) => ({
	...base,
	title: source.title ?? fallbackTitle,
	description: source.description ?? '',
	location: source.location ?? '',
	bgColor: source.backgroundColor ?? '#dbeafe',
	fgColor: source.color ?? '#1e40af',
})

const createInitialDraft = (props: EventFormBodyProps) => {
	const base = createDraftCore(
		props,
		resolveDefaultResourceId(props.initialResourceId, props.resources)
	)
	return createDraftFromSource(
		base,
		props.actions.t('newEvent'),
		props.existing ?? props.seedDraft
	)
}

const NativeEventFormBody = (props: EventFormBodyProps) => {
	const {
		existing,
		seedDraft,
		resources,
		timezone,
		locale,
		firstDayOfWeek,
		timeFormat,
		options,
		actions,
		onRequestScope,
		onClose,
	} = props
	const { t } = actions
	const [draft, setDraft] = useState(() => createInitialDraft(props))
	const openedLength = useMemo(
		() =>
			openedLengthMinutes(
				props.initialStart,
				props.initialEnd,
				props.initialAllDay
			),
		[props.initialStart, props.initialEnd, props.initialAllDay]
	)
	const [pluginFields, setPluginFields] = useState<Partial<CalendarEvent>>(
		() => (existing ? {} : { ...seedDraft })
	)
	const [validationError, setValidationError] = useState<string | null>(null)
	const titleInputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		titleInputRef.current?.focus()
	}, [])

	const patch = <K extends keyof typeof draft>(
		key: K,
		value: (typeof draft)[K]
	) => setDraft((prev) => ({ ...prev, [key]: value }))

	const patchSchedule = (
		movedEdge: 'start' | 'end',
		nextFields: Partial<ScheduleFieldsState>
	) =>
		setDraft((prev) =>
			keepEndAfterStart(
				{ ...prev, ...nextFields, scheduleDirty: true },
				movedEdge,
				openedLength,
				timezone
			)
		)

	const untouchedRange =
		existing && !draft.scheduleDirty
			? {
					start: existing.start,
					end: existing.end,
					allDay: Boolean(existing.allDay),
				}
			: null

	const handleSubmit = (evt: Event) => {
		evt.preventDefault()
		const range =
			untouchedRange ??
			computeSubmitRange({
				allDay: draft.allDay,
				startDate: draft.startDate,
				endDate: draft.endDate,
				startTime: draft.startTime,
				endTime: draft.endTime,
				timezone,
			})
		const chosenResource = resources.find(
			(r) => String(r.id) === draft.resourceId
		)
		if (
			!isAllowedByBusinessHours(
				range,
				existing,
				chosenResource,
				options,
				timezone
			)
		) {
			setValidationError('Selected time is outside business hours.')
			return
		}
		const payload = buildSubmittedPayload({
			existing,
			title: draft.title,
			description: draft.description,
			location: draft.location,
			range,
			colorChanged: draft.colorChanged,
			bgColor: draft.bgColor,
			fgColor: draft.fgColor,
			chosenResource,
			resourceDirty: draft.resourceDirty,
			pluginFields,
		})
		commitFormSave({ existing, payload, actions, onRequestScope, onClose })
	}

	const handleDelete = () => {
		if (!existing) return
		onClose()
		if (actions.pluginRuntime.getEventManager(existing)) {
			onRequestScope(existing, 'delete', (scope) => {
				actions.commitDelete(existing, scope)
			})
			return
		}
		actions.commitDelete(existing, 'this')
	}

	const liveRange = useMemo(
		() =>
			untouchedRange ??
			computeSubmitRange({
				allDay: draft.allDay,
				startDate: draft.startDate,
				endDate: draft.endDate,
				startTime: draft.startTime,
				endTime: draft.endTime,
				timezone,
			}),
		[
			untouchedRange,
			draft.allDay,
			draft.startDate,
			draft.endDate,
			draft.startTime,
			draft.endTime,
			timezone,
		]
	)

	const pluginFormContext = useMemo<PluginEventFormContext>(
		() => ({
			event: {
				...pluginFields,
				...(existing ?? {}),
				...pluginFields,
				title: draft.title,
				start: liveRange.start,
				end: liveRange.end,
				allDay: liveRange.allDay,
			},
			onChange: (updates) =>
				setPluginFields((prev) => ({ ...prev, ...updates })),
			rawEvents: actions.rawEvents,
			firstDayOfWeek,
			timezone,
			locale,
			t,
		}),
		[
			pluginFields,
			existing,
			draft.title,
			liveRange.start,
			liveRange.end,
			liveRange.allDay,
			actions.rawEvents,
			firstDayOfWeek,
			timezone,
			locale,
			t,
		]
	)

	return (
		<form data-ilamy-part="form" onSubmit={handleSubmit}>
			<div data-ilamy-part="dialog-body">
				<div data-ilamy-part="form-stack">
					<div>
						<label data-ilamy-part="form-label" htmlFor="title">
							{t('title')}
						</label>
						<input
							data-ilamy-slot="input"
							id="title"
							name="title"
							onInput={(e) =>
								patch('title', (e.target as HTMLInputElement).value)
							}
							placeholder={t('eventTitlePlaceholder')}
							ref={titleInputRef}
							required
							type="text"
							value={draft.title}
						/>
					</div>

					<div>
						<label data-ilamy-part="form-label" htmlFor="description">
							{t('description')}
						</label>
						<textarea
							data-ilamy-slot="textarea"
							id="description"
							name="description"
							onInput={(e) =>
								patch('description', (e.target as HTMLTextAreaElement).value)
							}
							placeholder={t('eventDescriptionPlaceholder')}
							rows={3}
							value={draft.description}
						/>
					</div>

					<label data-ilamy-part="form-checkbox-row" htmlFor="allDay">
						<input
							checked={draft.allDay}
							id="allDay"
							name="allDay"
							onChange={(e) =>
								setDraft((prev) => ({
									...prev,
									allDay: (e.target as HTMLInputElement).checked,
									scheduleDirty: true,
								}))
							}
							type="checkbox"
						/>
						<span>{t('allDay')}</span>
					</label>

					<EventScheduleFields
						allDay={draft.allDay}
						endDate={draft.endDate}
						endTime={draft.endTime}
						firstDayOfWeek={firstDayOfWeek}
						locale={locale}
						onChangeEndDate={(picked) =>
							patchSchedule('end', { endDate: picked })
						}
						onChangeEndTime={(hour, minute) =>
							patchSchedule('end', { endTime: { hour, minute } })
						}
						onChangeStartDate={(picked) =>
							patchSchedule('start', { startDate: picked })
						}
						onChangeStartTime={(hour, minute) =>
							patchSchedule('start', { startTime: { hour, minute } })
						}
						startDate={draft.startDate}
						startTime={draft.startTime}
						t={t}
						timeFormat={timeFormat}
					/>

					<EventColorSwatches
						bgColor={draft.bgColor}
						onPick={(bgColor, fgColor) =>
							setDraft((prev) => ({
								...prev,
								bgColor,
								fgColor,
								colorChanged: true,
							}))
						}
						t={t}
					/>

					<div>
						<label data-ilamy-part="form-label" htmlFor="location">
							{t('location')}
						</label>
						<input
							data-ilamy-slot="input"
							id="location"
							name="location"
							onInput={(e) =>
								patch('location', (e.target as HTMLInputElement).value)
							}
							placeholder={t('eventLocationPlaceholder')}
							type="text"
							value={draft.location}
						/>
					</div>

					<EventResourceField
						onChange={(v) =>
							setDraft((prev) => ({
								...prev,
								resourceId: v,
								resourceDirty: true,
							}))
						}
						resourceId={draft.resourceId}
						resources={resources}
						t={t}
					/>

					<PluginSlotHost
						context={pluginFormContext}
						plugins={actions.pluginRuntime.plugins}
						slotName={SLOT_EVENT_FORM}
					/>

					{validationError && (
						<p data-ilamy-part="form-error" role="alert">
							{validationError}
						</p>
					)}
				</div>
			</div>

			<EventFormFooter
				hasExisting={Boolean(existing)}
				onClose={onClose}
				onDelete={handleDelete}
				t={t}
			/>
		</form>
	)
}

export interface EventFormDialogState {
	open: boolean
	event: DomCalendarEvent | null
	cell?: CellInfo
	draft?: OpenEventFormInput
}

interface EventFormDialogProps {
	state: EventFormDialogState
	controller: HeadlessCalendarController
	options: DomCalendarOptions
	actions: RendererActions
	onRequestScope: (
		event: DomCalendarEvent,
		mode: 'edit' | 'delete',
		onConfirm: (scope: DomMutationScope) => void
	) => void
	onClose: () => void
}

const resolveInitialRange = (
	dialogState: EventFormDialogState,
	calState: ReturnType<HeadlessCalendarController['getState']>
) => {
	const existing = dialogState.event
	if (existing) {
		return {
			initialStart: existing.start,
			initialEnd: existing.end,
			initialAllDay: Boolean(existing.allDay),
		}
	}
	const draft = dialogState.draft
	if (draft?.start) {
		const startIso = String(draft.start)
		const parsedStart =
			parseDate(startIso, calState.timezone) ?? now(calState.timezone)
		const endIso = draft.end
			? String(draft.end)
			: toOffsetIso(add(parsedStart, 1, 'hour'))
		return {
			initialStart: startIso,
			initialEnd: endIso,
			initialAllDay: Boolean(draft.allDay),
		}
	}
	const cell = dialogState.cell
	if (cell) {
		return {
			initialStart: cell.start,
			initialEnd: cell.end,
			initialAllDay: Boolean(cell.allDay),
		}
	}
	const initialStart = calState.currentDate
	const parsed =
		parseDate(initialStart, calState.timezone) ?? now(calState.timezone)
	return {
		initialStart,
		initialEnd: toOffsetIso(add(parsed, 1, 'hour')),
		initialAllDay: false,
	}
}

const resolveInitialResourceId = (
	existing: DomCalendarEvent | null,
	cell?: CellInfo,
	draft?: OpenEventFormInput
): string | number | undefined =>
	existing?.resourceId ??
	existing?.resourceIds?.at(0) ??
	draft?.resourceId ??
	draft?.resource?.id ??
	cell?.resource?.id

const resolveDisplayEnd = (
	initialStart: string,
	initialEnd: string,
	initialAllDay: boolean,
	timezone: string
) => {
	const startZoned = parseDate(initialStart, timezone) ?? now(timezone)
	const rawEndZoned =
		parseDate(initialEnd, timezone) ?? add(startZoned, 1, 'hour')
	const displayEndZoned =
		initialAllDay && !isBefore(rawEndZoned, add(startZoned, 1, 'day'), 'day')
			? add(rawEndZoned, -1, 'day')
			: rawEndZoned
	return { startZoned, displayEndZoned }
}

export const EventFormDialog = ({
	state: dialogState,
	controller,
	options,
	actions,
	onRequestScope,
	onClose,
}: EventFormDialogProps) => {
	const calState = controller.getState()
	const existing = dialogState.event
	const { initialStart, initialEnd, initialAllDay } = resolveInitialRange(
		dialogState,
		calState
	)
	const initialResourceId = resolveInitialResourceId(
		existing,
		dialogState.cell,
		dialogState.draft
	)

	const slotContext = useMemo<EventFormSlotContext>(
		() => ({
			open: dialogState.open,
			event: existing,
			initialStart,
			initialEnd,
			initialAllDay,
			initialResourceId,
			resources: calState.resources,
			timezone: calState.timezone,
			locale: calState.locale,
			timeFormat: options.timeFormat ?? '12-hour',
			onAdd: (input: CalendarEventInput) => {
				actions.commitAdd(input as DomCalendarEventInput)
			},
			onUpdate: (id, updates) => {
				const target =
					existing ??
					(calState.events.find((e) => e.id === id) as
						DomCalendarEvent | undefined)
				if (!target) return
				const { id: _ignoredId, ...cleanUpdates } = updates
				if (actions.pluginRuntime.getEventManager(target)) {
					onRequestScope(target, 'edit', (scope) => {
						actions.commitUpdate(
							target,
							cleanUpdates as Partial<DomCalendarEventInput>,
							scope
						)
					})
					return
				}
				actions.commitUpdate(
					target,
					cleanUpdates as Partial<DomCalendarEventInput>,
					'this'
				)
			},
			onDelete: existing
				? () => {
						if (actions.pluginRuntime.getEventManager(existing)) {
							onRequestScope(existing, 'delete', (scope) => {
								actions.commitDelete(existing, scope)
							})
							return
						}
						actions.commitDelete(existing, 'this')
					}
				: undefined,
			onClose,
			t: actions.t,
		}),
		[
			dialogState.open,
			existing,
			initialStart,
			initialEnd,
			initialAllDay,
			initialResourceId,
			calState.resources,
			calState.timezone,
			calState.locale,
			calState.events,
			options.timeFormat,
			actions,
			onRequestScope,
			onClose,
		]
	)

	const legacyContext = useMemo<DomEventFormRenderContext>(
		() => ({
			event: existing,
			initialStart,
			initialEnd,
			initialAllDay,
			initialResourceId,
			resources: calState.resources,
			onSave: (input, scope) => {
				if (existing) actions.commitUpdate(existing, input, scope)
				else actions.commitAdd(input)
				onClose()
			},
			onDelete: existing
				? (target, scope) => {
						actions.commitDelete(target, scope)
						onClose()
					}
				: undefined,
			onClose,
		}),
		[
			existing,
			initialStart,
			initialEnd,
			initialAllDay,
			initialResourceId,
			calState.resources,
			actions,
			onClose,
		]
	)

	if (options.slots?.eventForm) {
		return (
			<SlotHost
				context={slotContext}
				slot={options.slots.eventForm}
				slotKey="eventForm"
			/>
		)
	}

	if (!dialogState.open) return null

	const title = actions.t(existing ? 'editEvent' : 'createEvent')
	const subtitle = actions.t(existing ? 'editEventDetails' : 'addNewEvent')

	if (options.renderEventForm) {
		return (
			<DialogShell
				onClose={onClose}
				open={dialogState.open}
				subtitle={subtitle}
				testId="dom-event-dialog"
				title={title}
			>
				<LegacyRenderHost
					context={legacyContext}
					renderFn={options.renderEventForm}
					slotKey="eventForm"
				/>
			</DialogShell>
		)
	}

	const { startZoned, displayEndZoned } = resolveDisplayEnd(
		initialStart,
		initialEnd,
		initialAllDay,
		calState.timezone
	)

	return (
		<DialogShell
			onClose={onClose}
			open={dialogState.open}
			subtitle={subtitle}
			testId="dom-event-dialog"
			title={title}
		>
			<NativeEventFormBody
				actions={actions}
				existing={existing}
				firstDayOfWeek={calState.firstDayOfWeek}
				initialAllDay={initialAllDay}
				initialEnd={displayEndZoned}
				initialResourceId={initialResourceId}
				initialStart={startZoned}
				key={rendererKeys.key.eventFormKey(
					existing?.id,
					initialStart,
					initialEnd,
					initialResourceId
				)}
				locale={calState.locale}
				onClose={onClose}
				onRequestScope={onRequestScope}
				options={options}
				resources={calState.resources}
				seedDraft={dialogState.draft}
				timeFormat={options.timeFormat ?? '12-hour'}
				timezone={calState.timezone}
			/>
		</DialogShell>
	)
}
