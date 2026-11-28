import type {
	CalendarEvent,
	CalendarEventInput,
	EventFormSlotContext,
	HeaderSlotContext,
	RecurrenceScope,
	RecurrenceScopeDialogSlotContext,
} from '@ilamy/calendar'
import {
	createContext,
	type FormEvent,
	type ReactNode,
	useEffect,
	useState,
} from 'react'
import type { CssMode } from '../../../types/settings-form.types'
import { resolvePrimitiveHeaderStyles } from '../utils/primitive-slot-styles.utils'

export const SlotPreviewOptionsContext = createContext<{
	cssMode: CssMode
	hideNewButton: boolean
}>({
	cssMode: 'plain',
	hideNewButton: false,
})

interface PrimitiveHeaderViewProps extends HeaderSlotContext {
	variant: 'radix' | 'base-ui'
	cssMode: CssMode
	hideNewButton: boolean
	renderDatePicker: (triggerClassName: string) => ReactNode
}

/** Shared calendar header slot UI rendered inside Radix UI and Base UI slots. */
export function PrimitiveHeaderView({
	variant,
	cssMode,
	hideNewButton,
	view,
	views,
	nextPeriod,
	prevPeriod,
	today,
	setView,
	openEventForm,
	t,
	renderDatePicker,
}: PrimitiveHeaderViewProps) {
	const styles = resolvePrimitiveHeaderStyles(cssMode, variant)

	return (
		<div className={styles.header} data-component-library={variant}>
			<div className="flex items-center gap-2 min-w-0">
				<div className={styles.arrowGroup}>
					<button
						aria-label="Previous"
						className={styles.arrowBtn}
						onClick={prevPeriod}
						type="button"
					>
						‹
					</button>
					<button
						aria-label="Next"
						className={styles.arrowBtn}
						onClick={nextPeriod}
						type="button"
					>
						›
					</button>
				</div>
				<button className={styles.todayBtn} onClick={today} type="button">
					{t('today')}
				</button>
				{renderDatePicker(styles.titleBtn)}
			</div>

			<div className="flex items-center gap-2">
				<div aria-label="View" className={styles.switcherGroup} role="group">
					{views.map((item) => {
						const active = view === item
						return (
							<button
								aria-pressed={active}
								className={active ? styles.viewBtnActive : styles.viewBtn}
								data-testid={`view-btn-${item}`}
								key={item}
								onClick={() => setView(item)}
								type="button"
							>
								{t(item)}
							</button>
						)
					})}
				</div>
				{!hideNewButton && (
					<button
						aria-label="New"
						className={styles.newBtn}
						data-testid="new-event-btn"
						onClick={() => openEventForm()}
						type="button"
					>
						+ {t('new')}
					</button>
				)}
			</div>
		</div>
	)
}

interface PrimitiveEventFormBodyProps extends EventFormSlotContext {
	prefix: 'radix' | 'base-ui'
}

/** Shared form state and fields used by Radix UI and Base UI event modals. */
export function PrimitiveEventFormBody({
	prefix,
	open,
	event,
	initialStart,
	initialEnd,
	initialAllDay,
	initialResourceId,
	onAdd,
	onUpdate,
	onDelete,
	onClose,
}: PrimitiveEventFormBodyProps) {
	const [title, setTitle] = useState('')
	const [description, setDescription] = useState('')

	useEffect(() => {
		if (!open) return
		setTitle(event?.title ?? '')
		setDescription(event?.description ?? '')
	}, [open, event])

	const handleSubmit = (submitEvent: FormEvent) => {
		submitEvent.preventDefault()
		const payload: CalendarEventInput = {
			id: event?.id ?? `${prefix}-${Date.now()}`,
			title: title.trim() || 'Untitled Event',
			start: event?.start ?? initialStart,
			end: event?.end ?? initialEnd,
			allDay: event?.allDay ?? initialAllDay,
			resourceId: event?.resourceId ?? initialResourceId,
			description,
		}
		if (event) {
			onUpdate(event.id, payload)
		} else {
			onAdd(payload)
		}
		onClose()
	}

	const titleId = `${prefix}-slot-title`
	const descId = `${prefix}-slot-desc`

	return (
		<form className="space-y-4" onSubmit={handleSubmit}>
			<div className="space-y-1.5">
				<label className="block text-sm font-medium" htmlFor={titleId}>
					Title
				</label>
				<input
					className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					data-testid={`${prefix}-form-title`}
					id={titleId}
					onChange={(e) => setTitle(e.target.value)}
					placeholder="Event title"
					type="text"
					value={title}
				/>
			</div>
			<div className="space-y-1.5">
				<label className="block text-sm font-medium" htmlFor={descId}>
					Description
				</label>
				<textarea
					className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-20"
					data-testid={`${prefix}-form-description`}
					id={descId}
					onChange={(e) => setDescription(e.target.value)}
					placeholder="Optional details"
					value={description}
				/>
			</div>
			<div className="flex items-center justify-end gap-2 pt-2">
				{event && onDelete && (
					<button
						className="mr-auto rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 cursor-pointer"
						data-testid={`${prefix}-form-delete`}
						onClick={() => {
							onDelete(event.id)
							onClose()
						}}
						type="button"
					>
						Delete
					</button>
				)}
				<button
					className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted cursor-pointer"
					data-testid={`${prefix}-form-cancel`}
					onClick={onClose}
					type="button"
				>
					Cancel
				</button>
				<button
					className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 cursor-pointer"
					data-testid={`${prefix}-form-save`}
					type="submit"
				>
					{event ? 'Update' : 'Create'}
				</button>
			</div>
		</form>
	)
}

interface MoreEventsListBodyProps {
	events: CalendarEvent[]
	onEventClick: (event: CalendarEvent) => void
	onClose: () => void
}

/** Shared list body for Radix UI and Base UI `+N More` dialogs. */
export function MoreEventsListBody({
	events,
	onEventClick,
	onClose,
}: MoreEventsListBodyProps) {
	return (
		<div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto py-1">
			{events.map((ev) => (
				<button
					className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-muted cursor-pointer"
					key={String(ev.id)}
					onClick={() => {
						onEventClick(ev)
						onClose()
					}}
					type="button"
				>
					<span className="truncate font-medium">{ev.title}</span>
				</button>
			))}
		</div>
	)
}

export const RECURRENCE_SCOPE_ITEMS: ReadonlyArray<{
	scope: RecurrenceScope
	titleKey: 'thisEvent' | 'thisAndFollowingEvents' | 'allEvents'
	editKey: 'onlyChangeThis' | 'changeThisAndFuture' | 'changeEntireSeries'
	deleteKey: 'onlyDeleteThis' | 'deleteThisAndFuture' | 'deleteEntireSeries'
}> = [
	{
		scope: 'this',
		titleKey: 'thisEvent',
		editKey: 'onlyChangeThis',
		deleteKey: 'onlyDeleteThis',
	},
	{
		scope: 'following',
		titleKey: 'thisAndFollowingEvents',
		editKey: 'changeThisAndFuture',
		deleteKey: 'deleteThisAndFuture',
	},
	{
		scope: 'all',
		titleKey: 'allEvents',
		editKey: 'changeEntireSeries',
		deleteKey: 'deleteEntireSeries',
	},
]

/** Shared scope picker body for Radix UI and Base UI `recurrenceScopeDialog` slots. */
export function RecurrenceScopeListBody({
	operation,
	t,
	onConfirm,
	onCancel,
}: Pick<
	RecurrenceScopeDialogSlotContext,
	'operation' | 't' | 'onConfirm' | 'onCancel'
>) {
	const isEdit = operation === 'edit'
	return (
		<div className="space-y-3">
			<div className="flex flex-col gap-2">
				{RECURRENCE_SCOPE_ITEMS.map((item) => (
					<button
						className="w-full rounded-lg border border-border bg-background p-3 text-left hover:bg-muted cursor-pointer transition-colors"
						data-testid={`scope-option-${item.scope}`}
						key={item.scope}
						onClick={() => onConfirm(item.scope)}
						type="button"
					>
						<div className="text-sm font-medium text-foreground">
							{t(item.titleKey)}
						</div>
						<div className="mt-0.5 text-xs text-muted-foreground">
							{t(isEdit ? item.editKey : item.deleteKey)}
						</div>
					</button>
				))}
			</div>
			<div className="flex justify-end pt-1">
				<button
					className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted cursor-pointer"
					onClick={onCancel}
					type="button"
				>
					{t('cancel')}
				</button>
			</div>
		</div>
	)
}
