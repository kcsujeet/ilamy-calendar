import type { CalendarEventInput, EventFormSlotContext } from '@ilamy/calendar'
import type { CalendarThemeAdapter } from '@ilamy/calendar/react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import {
	createTheme,
	ThemeProvider as MuiThemeProvider,
	type Theme,
} from '@mui/material/styles'
import {
	type FormEvent,
	type ReactNode,
	useEffect,
	useMemo,
	useState,
} from 'react'
import type { ThemeAccent } from '../../../types/settings-form.types'
import { THEME_ACCENTS } from '../../../utils/demo-themes.utils'

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
	children: (muiVarsAdapter: CalendarThemeAdapter | undefined) => ReactNode
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

	return (
		<MuiThemeProvider theme={muiTheme}>{children(adapter)}</MuiThemeProvider>
	)
}
