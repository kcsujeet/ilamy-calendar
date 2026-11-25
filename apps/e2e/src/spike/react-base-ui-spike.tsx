/** @jsxImportSource react */
import { Dialog } from '@base-ui/react/dialog'
import { Popover } from '@base-ui/react/popover'
import { Select } from '@base-ui/react/select'
import type {
	CalendarEvent,
	CalendarEventInput,
	EventFormSlotContext,
	EventSlotContext,
	HeaderSlotContext,
} from '@ilamy/calendar'
import { IlamyCalendar, useIlamyCalendarContext } from '@ilamy/calendar/react'
import { createContext, useContext, useEffect, useRef, useState } from 'react'

const DemoThemeContext = createContext({ brand: 'base-ui-indigo' })

const SEED_EVENTS: CalendarEvent[] = [
	{
		id: '1',
		title: 'Initial Event',
		start: '2025-03-12T09:00:00.000Z',
		end: '2025-03-12T10:00:00.000Z',
		description: 'Baseline description',
		data: { category: 'work' },
	},
]

const CATEGORIES = ['work', 'personal', 'urgent'] as const

const eventButtonTestId = (id: string | number) => `spike-event-${String(id)}`
const eventMountTestId = (id: string | number) =>
	`event-mount-count-${String(id)}`
const categoryOptionTestId = (cat: string) => `form-category-${cat}`

const BaseUiHeader = ({
	title,
	prevPeriod,
	nextPeriod,
	openEventForm,
}: HeaderSlotContext) => {
	const theme = useContext(DemoThemeContext)
	const calendar = useIlamyCalendarContext()
	const [mountCount, setMountCount] = useState(0)

	useEffect(() => {
		setMountCount((count) => count + 1)
	}, [])

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.altKey && event.key === 'ArrowRight') {
				event.preventDefault()
				calendar.nextPeriod()
			}
		}
		window.addEventListener('keydown', handleKeyDown, true)
		return () => {
			window.removeEventListener('keydown', handleKeyDown, true)
		}
	}, [calendar])

	return (
		<div
			data-testid="custom-header-slot"
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: '8px',
				padding: '12px',
				borderBottom: '1px solid #d4d4d8',
			}}
		>
			<span data-testid="header-theme">{theme.brand}</span>
			<span data-testid="header-mount-count">{String(mountCount)}</span>
			<span data-testid="header-title">{title}</span>
			<span data-testid="header-context-date">{calendar.currentDate}</span>
			<input
				aria-label="Search events"
				data-testid="header-search"
				placeholder="Search"
				type="text"
			/>
			<button
				data-testid="header-prev"
				onClick={() => prevPeriod()}
				type="button"
			>
				Previous
			</button>
			<button
				data-testid="header-next"
				onClick={() => nextPeriod()}
				type="button"
			>
				Next
			</button>
			<button
				data-testid="header-new"
				onClick={() => openEventForm()}
				type="button"
			>
				+ New
			</button>
		</div>
	)
}

const BaseUiEvent = ({ event, onClick }: EventSlotContext) => {
	const [mountCount, setMountCount] = useState(0)

	useEffect(() => {
		setMountCount((count) => count + 1)
	}, [])

	return (
		<button
			data-testid={eventButtonTestId(event.id)}
			onClick={onClick}
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: '8px',
				margin: '8px',
				padding: '8px 12px',
				border: '1px solid #6366f1',
				borderRadius: '4px',
			}}
			type="button"
		>
			<span>{event.title}</span>
			<span data-testid={eventMountTestId(event.id)}>{String(mountCount)}</span>
		</button>
	)
}

const readCategory = (event: CalendarEvent | null): string => {
	const value = event?.data?.category
	return typeof value === 'string' ? value : 'work'
}

const BaseUiEventForm = ({
	open,
	event,
	initialStart,
	initialEnd,
	initialAllDay,
	onAdd,
	onUpdate,
	onClose,
}: EventFormSlotContext) => {
	const theme = useContext(DemoThemeContext)
	const calendar = useIlamyCalendarContext()
	const [mountCount, setMountCount] = useState(0)
	const [title, setTitle] = useState('')
	const [description, setDescription] = useState('')
	const [category, setCategory] = useState('work')
	const [popoverNote, setPopoverNote] = useState('none')

	const prevOpenRef = useRef(false)
	const prevEventIdRef = useRef<string | number | null>(null)

	useEffect(() => {
		setMountCount((count) => count + 1)
	}, [])

	useEffect(() => {
		const nextId = event?.id ?? null
		const openedNow = open && !prevOpenRef.current
		const switchedEvent = open && nextId !== prevEventIdRef.current
		if (openedNow || switchedEvent) {
			setTitle(event?.title ?? '')
			setDescription(event?.description ?? '')
			setCategory(readCategory(event))
			setPopoverNote('none')
		}
		prevOpenRef.current = open
		prevEventIdRef.current = nextId
	}, [open, event])

	const handleSubmit = (submitEvent: React.FormEvent) => {
		submitEvent.preventDefault()
		const payload: CalendarEventInput = {
			id: event?.id ?? crypto.randomUUID(),
			title: title.trim() || 'Untitled',
			start: event?.start ?? initialStart,
			end: event?.end ?? initialEnd,
			allDay: event?.allDay ?? initialAllDay,
			description,
			data: { ...(event?.data ?? {}), category, note: popoverNote },
		}
		if (event) {
			onUpdate(event.id, payload)
		} else {
			onAdd(payload)
		}
		onClose()
	}

	return (
		<Dialog.Root
			onOpenChange={(nextOpen) => {
				if (!nextOpen) {
					onClose()
				}
			}}
			open={open}
		>
			<Dialog.Portal>
				<Dialog.Backdrop
					data-testid="form-backdrop"
					style={{
						position: 'fixed',
						inset: 0,
						backgroundColor: 'rgba(0, 0, 0, 0.35)',
						zIndex: 40,
					}}
				/>
				<Dialog.Popup
					data-testid="form-dialog-popup"
					style={{
						position: 'fixed',
						top: '50%',
						left: '50%',
						transform: 'translate(-50%, -50%)',
						zIndex: 50,
						width: '420px',
						backgroundColor: '#ffffff',
						padding: '20px',
						border: '1px solid #d4d4d8',
					}}
				>
					<Dialog.Title>{event ? 'Edit Event' : 'Create Event'}</Dialog.Title>
					<div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
						<span data-testid="form-theme">{theme.brand}</span>
						<span data-testid="form-context-view">{calendar.view}</span>
						<span data-testid="form-mount-count">{String(mountCount)}</span>
					</div>
					<form onSubmit={handleSubmit}>
						<div style={{ marginBottom: '8px' }}>
							<label htmlFor="spike-react-title">Title</label>
							<input
								data-testid="form-title-input"
								id="spike-react-title"
								onChange={(e) => setTitle(e.target.value)}
								style={{
									width: '100%',
									border: '1px solid #cbd5e1',
									padding: '4px 8px',
								}}
								type="text"
								value={title}
							/>
						</div>
						<div style={{ marginBottom: '8px' }}>
							<label htmlFor="spike-react-description">Description</label>
							<input
								data-testid="form-description-input"
								id="spike-react-description"
								onChange={(e) => setDescription(e.target.value)}
								style={{
									width: '100%',
									border: '1px solid #cbd5e1',
									padding: '4px 8px',
								}}
								type="text"
								value={description}
							/>
						</div>
						<div style={{ marginBottom: '8px' }}>
							<Select.Root
								onValueChange={(value) => {
									if (typeof value === 'string') {
										setCategory(value)
									}
								}}
								value={category}
							>
								<Select.Trigger
									aria-label="Category"
									data-testid="form-category-trigger"
									style={{
										border: '1px solid #cbd5e1',
										padding: '4px 8px',
									}}
								>
									<Select.Value data-testid="form-category-value" />
								</Select.Trigger>
								<Select.Portal>
									<Select.Positioner style={{ zIndex: 60 }}>
										<Select.Popup
											data-testid="form-category-popup"
											style={{
												backgroundColor: '#ffffff',
												border: '1px solid #cbd5e1',
												padding: '4px',
											}}
										>
											{CATEGORIES.map((item) => (
												<Select.Item
													data-testid={categoryOptionTestId(item)}
													key={item}
													style={{ padding: '4px 8px', cursor: 'pointer' }}
													value={item}
												>
													<Select.ItemText>{item}</Select.ItemText>
												</Select.Item>
											))}
										</Select.Popup>
									</Select.Positioner>
								</Select.Portal>
							</Select.Root>
						</div>
						<div style={{ marginBottom: '12px' }}>
							<Popover.Root>
								<Popover.Trigger
									data-testid="form-note-popover-trigger"
									style={{
										border: '1px solid #cbd5e1',
										padding: '4px 8px',
									}}
									type="button"
								>
									Quick Note ({popoverNote})
								</Popover.Trigger>
								<Popover.Portal>
									<Popover.Positioner style={{ zIndex: 60 }}>
										<Popover.Popup
											data-testid="form-note-popover-popup"
											style={{
												backgroundColor: '#ffffff',
												border: '1px solid #cbd5e1',
												padding: '8px',
											}}
										>
											<span data-testid="popover-body">Popover content</span>
											<button
												data-testid="popover-set-note"
												onClick={() => setPopoverNote('pinned')}
												type="button"
											>
												Pin note
											</button>
										</Popover.Popup>
									</Popover.Positioner>
								</Popover.Portal>
							</Popover.Root>
						</div>
						<div style={{ display: 'flex', gap: '8px' }}>
							<button data-testid="form-save" type="submit">
								Save
							</button>
							<Dialog.Close
								data-testid="form-cancel"
								onClick={() => onClose()}
								type="button"
							>
								Cancel
							</Dialog.Close>
						</div>
					</form>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	)
}

/** Phase 0 E2E fixture validating React 19 portals + Base UI region slots. */
export const ReactBaseUiSpike = () => {
	const [events, setEvents] = useState<CalendarEvent[]>(SEED_EVENTS)
	const [themeBrand] = useState('base-ui-indigo')

	return (
		<DemoThemeContext.Provider value={{ brand: themeBrand }}>
			<div data-testid="react-base-ui-spike" style={{ padding: '16px' }}>
				<IlamyCalendar
					events={events}
					initialDate="2025-03-12T09:00:00.000Z"
					onEventAdd={(added) => setEvents((prev) => [...prev, added])}
					onEventDelete={(deleted) =>
						setEvents((prev) => prev.filter((e) => e.id !== deleted.id))
					}
					onEventUpdate={(updated) =>
						setEvents((prev) =>
							prev.map((e) => (e.id === updated.id ? updated : e))
						)
					}
					slots={{
						header: BaseUiHeader,
						event: BaseUiEvent,
						eventForm: BaseUiEventForm,
					}}
					timezone="UTC"
					titleFormat={{ month: 'long', year: 'numeric' }}
				/>
				<script data-testid="spike-events" type="application/json">
					{JSON.stringify(events)}
				</script>
			</div>
		</DemoThemeContext.Provider>
	)
}
