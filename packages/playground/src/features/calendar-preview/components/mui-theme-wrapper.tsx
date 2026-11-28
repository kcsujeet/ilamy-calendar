import type {
	CalendarEventInput,
	CalendarView,
	EventFormSlotContext,
	HeaderSlotContext,
	MoreEventsDialogSlotContext,
	RecurrenceScopeDialogSlotContext,
} from '@ilamy/calendar'
import type { CalendarThemeAdapter } from '@ilamy/calendar/react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Popover from '@mui/material/Popover'
import {
	createTheme,
	ThemeProvider as MuiThemeProvider,
	type Theme,
} from '@mui/material/styles'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { ChevronDown } from 'lucide-react'
import {
	type FormEvent,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react'
import type { ThemeAccent } from '../../../types/settings-form.types'
import { THEME_ACCENTS } from '../../../utils/demo-themes.utils'
import { HeaderDatePickerGrid } from './header-date-picker-grid'
import {
	RECURRENCE_SCOPE_ITEMS,
	SlotPreviewOptionsContext,
} from './primitive-slot-chrome'

/** Maps a MUI Theme object purely into `--ilamy-*` CSS variables (zero calendar dependency). */
const buildMuiCssVars = (theme: Theme): Record<string, string> => {
	const mutedBg =
		theme.palette.mode === 'dark'
			? theme.palette.background.default
			: theme.palette.grey[100]
	const borderRadius =
		typeof theme.shape.borderRadius === 'number'
			? `${theme.shape.borderRadius}px`
			: String(theme.shape.borderRadius)
	return {
		'--ilamy-bg': theme.palette.background.paper,
		'--ilamy-fg': theme.palette.text.primary,
		'--ilamy-surface': theme.palette.background.default,
		'--ilamy-muted': mutedBg,
		'--ilamy-muted-fg': theme.palette.text.secondary,
		'--ilamy-border': theme.palette.divider,
		'--ilamy-primary': theme.palette.primary.main,
		'--ilamy-primary-fg': theme.palette.primary.contrastText,
		'--ilamy-danger': theme.palette.error.main,
		'--ilamy-radius': borderRadius,
		'--ilamy-font': theme.typography.fontFamily ?? 'inherit',
		'--background': theme.palette.background.paper,
		'--foreground': theme.palette.text.primary,
		'--card': theme.palette.background.paper,
		'--card-foreground': theme.palette.text.primary,
		'--popover': theme.palette.background.paper,
		'--popover-foreground': theme.palette.text.primary,
		'--primary': theme.palette.primary.main,
		'--primary-foreground': theme.palette.primary.contrastText,
		'--secondary': mutedBg,
		'--secondary-foreground': theme.palette.text.primary,
		'--muted': mutedBg,
		'--muted-foreground': theme.palette.text.secondary,
		'--accent': theme.palette.action.hover,
		'--accent-foreground': theme.palette.text.primary,
		'--destructive': theme.palette.error.main,
		'--border': theme.palette.divider,
		'--input': theme.palette.divider,
		'--ring': theme.palette.primary.main,
		colorScheme: theme.palette.mode,
	}
}

/** Material UI `Dialog` region slot for `slots.eventForm` in React. */
export function MuiEventFormSlot({
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
}: EventFormSlotContext) {
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
			id: event?.id ?? `mui-${Date.now()}`,
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

	return (
		<Dialog
			fullWidth
			maxWidth="xs"
			onClose={onClose}
			open={open}
			slotProps={{
				paper: { 'data-testid': 'mui-event-form-dialog' } as Record<
					string,
					unknown
				>,
			}}
		>
			<DialogTitle>{event ? 'Edit Event' : 'Create Event'}</DialogTitle>
			<form onSubmit={handleSubmit}>
				<DialogContent
					sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
				>
					<Typography color="text.secondary" variant="caption">
						Rendered via slots.eventForm with Material UI Dialog
					</Typography>
					<TextField
						autoFocus
						fullWidth
						label="Title"
						onChange={(e) => setTitle(e.target.value)}
						size="small"
						slotProps={{ htmlInput: { 'data-testid': 'mui-form-title' } }}
						value={title}
					/>
					<TextField
						fullWidth
						label="Description"
						multiline
						onChange={(e) => setDescription(e.target.value)}
						rows={3}
						size="small"
						slotProps={{ htmlInput: { 'data-testid': 'mui-form-description' } }}
						value={description}
					/>
				</DialogContent>
				<DialogActions sx={{ px: 3, pb: 2 }}>
					{event && onDelete && (
						<Button
							color="error"
							data-testid="mui-form-delete"
							onClick={() => {
								onDelete(event.id)
								onClose()
							}}
							sx={{ mr: 'auto' }}
						>
							Delete
						</Button>
					)}
					<Button data-testid="mui-form-cancel" onClick={onClose}>
						Cancel
					</Button>
					<Button data-testid="mui-form-save" type="submit" variant="contained">
						{event ? 'Update' : 'Create'}
					</Button>
				</DialogActions>
			</form>
		</Dialog>
	)
}

interface MuiThemeWrapperProps {
	mode: 'light' | 'dark'
	accent: ThemeAccent
	applyThemeVars: boolean
	children: (
		muiVarsAdapter: CalendarThemeAdapter | undefined,
		muiSlots: {
			header: typeof MuiHeaderSlot
			eventForm: typeof MuiEventFormSlot
			moreEventsDialog: typeof MuiMoreEventsDialogSlot
			recurrenceScopeDialog: typeof MuiRecurrenceScopeDialogSlot
		}
	) => ReactNode
}

/** Material UI `slots.header` with full width and interactive MUI `Popover` date selector. */
export function MuiHeaderSlot({
	currentDate,
	locale,
	timezone,
	title,
	view,
	views,
	nextPeriod,
	prevPeriod,
	selectDate,
	today,
	setView,
	openEventForm,
	t,
}: HeaderSlotContext) {
	const { hideNewButton } = useContext(SlotPreviewOptionsContext)
	const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)
	const pickerOpen = Boolean(anchorEl)

	return (
		<Box
			data-component-library="mui"
			sx={{
				width: '100%',
				display: 'flex',
				flexWrap: 'wrap',
				alignItems: 'center',
				justifyContent: 'space-between',
				gap: 1,
				minHeight: 36,
			}}
		>
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
				<ButtonGroup
					size="small"
					sx={{
						height: 36,
						'& .MuiButton-root': { minWidth: 36, height: 36, px: 1 },
					}}
					variant="outlined"
				>
					<Button aria-label="Previous" onClick={prevPeriod}>
						‹
					</Button>
					<Button aria-label="Next" onClick={nextPeriod}>
						›
					</Button>
				</ButtonGroup>
				<Button
					onClick={today}
					size="small"
					sx={{ height: 36, textTransform: 'none', fontWeight: 500 }}
					variant="outlined"
				>
					{t('today')}
				</Button>
				<Button
					aria-expanded={pickerOpen}
					aria-haspopup="dialog"
					data-testid="calendar-title"
					endIcon={<ChevronDown size={14} />}
					onClick={(evt) => setAnchorEl(evt.currentTarget)}
					size="small"
					sx={{ height: 36, textTransform: 'none', fontWeight: 600 }}
					variant="outlined"
				>
					{title}
				</Button>
				<Popover
					anchorEl={anchorEl}
					anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
					onClose={() => setAnchorEl(null)}
					open={pickerOpen}
					slotProps={{
						paper: {
							'data-testid': 'mui-date-picker-popover',
							sx: { mt: 0.75, p: 1.5 },
						} as Record<string, unknown>,
					}}
				>
					<HeaderDatePickerGrid
						currentDate={currentDate}
						locale={locale}
						onSelectDate={(iso) => {
							selectDate(iso)
							setAnchorEl(null)
						}}
						timezone={timezone}
						view={view}
					/>
				</Popover>
			</Box>

			<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
				<ToggleButtonGroup
					aria-label="View"
					exclusive
					onChange={(_e, next: CalendarView | null) => {
						if (next) setView(next)
					}}
					role="group"
					size="small"
					sx={{
						height: 36,
						'& .MuiToggleButton-root': {
							height: 36,
							px: 1.5,
							textTransform: 'none',
						},
					}}
					value={view}
				>
					{views.map((item) => (
						<ToggleButton
							aria-pressed={view === item}
							data-testid={`view-btn-${item}`}
							key={item}
							value={item}
						>
							{t(item)}
						</ToggleButton>
					))}
				</ToggleButtonGroup>
				{!hideNewButton && (
					<Button
						aria-label="New"
						data-testid="new-event-btn"
						onClick={() => openEventForm()}
						size="small"
						sx={{ height: 36, textTransform: 'none', fontWeight: 600 }}
						variant="contained"
					>
						+ {t('new')}
					</Button>
				)}
			</Box>
		</Box>
	)
}

/** Material UI `Dialog` region slot for `slots.moreEventsDialog` in React. */
export function MuiMoreEventsDialogSlot({
	open,
	title,
	events,
	onEventClick,
	onClose,
}: MoreEventsDialogSlotContext) {
	return (
		<Dialog
			fullWidth
			maxWidth="xs"
			onClose={onClose}
			open={open}
			slotProps={{
				paper: { 'data-testid': 'mui-more-events-dialog' } as Record<
					string,
					unknown
				>,
			}}
		>
			<DialogTitle>{title}</DialogTitle>
			<DialogContent dividers sx={{ p: 0 }}>
				<List dense>
					{events.map((ev) => (
						<ListItemButton
							key={String(ev.id)}
							onClick={() => {
								onEventClick(ev)
								onClose()
							}}
						>
							<ListItemText primary={ev.title} />
						</ListItemButton>
					))}
				</List>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Close</Button>
			</DialogActions>
		</Dialog>
	)
}

/** Material UI `Dialog` region slot for `slots.recurrenceScopeDialog` in React. */
export function MuiRecurrenceScopeDialogSlot({
	open,
	event,
	operation,
	onConfirm,
	onCancel,
	t,
}: RecurrenceScopeDialogSlotContext) {
	const isEdit = operation === 'edit'
	const titleText = t(isEdit ? 'editRecurringEvent' : 'deleteRecurringEvent')
	const question = t(
		isEdit ? 'editRecurringEventQuestion' : 'deleteRecurringEventQuestion'
	)
	return (
		<Dialog
			fullWidth
			maxWidth="xs"
			onClose={onCancel}
			open={open}
			slotProps={{
				paper: { 'data-testid': 'mui-recurrence-scope-dialog' } as Record<
					string,
					unknown
				>,
			}}
		>
			<DialogTitle>{titleText}</DialogTitle>
			<DialogContent dividers sx={{ pt: 1.5 }}>
				<Typography color="text.secondary" sx={{ mb: 1.5 }} variant="caption">
					&ldquo;{event?.title}&rdquo; {question}
				</Typography>
				<List
					disablePadding
					sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
				>
					{RECURRENCE_SCOPE_ITEMS.map((item) => (
						<ListItemButton
							data-testid={`scope-option-${item.scope}`}
							key={item.scope}
							onClick={() => onConfirm(item.scope)}
							sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}
						>
							<ListItemText
								primary={t(item.titleKey)}
								secondary={t(isEdit ? item.editKey : item.deleteKey)}
							/>
						</ListItemButton>
					))}
				</List>
			</DialogContent>
			<DialogActions>
				<Button onClick={onCancel}>{t('cancel')}</Button>
			</DialogActions>
		</Dialog>
	)
}

export function MuiThemeWrapper({
	mode,
	accent,
	applyThemeVars,
	children,
}: MuiThemeWrapperProps) {
	const palette = THEME_ACCENTS[accent]
	const muiTheme = useMemo(
		() =>
			createTheme({
				palette: {
					mode,
					primary: {
						main: mode === 'dark' ? palette.primaryDark : palette.primary,
					},
				},
				shape: { borderRadius: 10 },
			}),
		[mode, palette.primary, palette.primaryDark]
	)
	const adapter = useMemo<CalendarThemeAdapter | undefined>(
		() =>
			applyThemeVars
				? {
						unstyled: false,
						slotProps: {
							root: {
								style: {
									...buildMuiCssVars(muiTheme),
									fontFamily: muiTheme.typography.fontFamily,
								},
							},
						},
					}
				: undefined,
		[applyThemeVars, muiTheme]
	)

	const muiSlots = useMemo(
		() => ({
			header: MuiHeaderSlot,
			eventForm: MuiEventFormSlot,
			moreEventsDialog: MuiMoreEventsDialogSlot,
			recurrenceScopeDialog: MuiRecurrenceScopeDialogSlot,
		}),
		[]
	)

	return (
		<MuiThemeProvider theme={muiTheme}>
			{children(adapter, muiSlots)}
		</MuiThemeProvider>
	)
}
