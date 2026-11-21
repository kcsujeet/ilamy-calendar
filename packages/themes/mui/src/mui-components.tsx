import type {
	CalendarButtonProps,
	CalendarCheckboxProps,
	CalendarComponents,
	CalendarDialogProps,
	CalendarInputProps,
	CalendarLabelProps,
	CalendarPopoverProps,
	CalendarSelectProps,
	CalendarTextareaProps,
} from '@ilamy/calendar'
import MuiButton from '@mui/material/Button'
import MuiCheckbox from '@mui/material/Checkbox'
import MuiDialog from '@mui/material/Dialog'
import MuiDialogActions from '@mui/material/DialogActions'
import MuiDialogContent from '@mui/material/DialogContent'
import MuiDialogContentText from '@mui/material/DialogContentText'
import MuiDialogTitle from '@mui/material/DialogTitle'
import MuiFormLabel from '@mui/material/FormLabel'
import MuiMenuItem from '@mui/material/MenuItem'
import MuiPopover from '@mui/material/Popover'
import MuiSelect from '@mui/material/Select'
import { type SxProps, type Theme, useTheme } from '@mui/material/styles'
import MuiTextField from '@mui/material/TextField'
import { type CSSProperties, useState } from 'react'

/** Maps a Material UI Theme palette to the CSS variables used by portal children. */
export const buildMuiCssVars = (theme: Theme): Record<string, string> => {
	let mutedBg = theme.palette.action.hover
	if (theme.palette.mode === 'dark') {
		mutedBg = theme.palette.background.default
	}
	return {
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

const BUTTON_VARIANT_MAP: Record<
	NonNullable<CalendarButtonProps['variant']>,
	'contained' | 'outlined' | 'text'
> = {
	default: 'contained',
	destructive: 'contained',
	outline: 'outlined',
	secondary: 'contained',
	ghost: 'text',
	link: 'text',
}

const BUTTON_SIZE_MAP: Record<
	NonNullable<CalendarButtonProps['size']>,
	'small' | 'medium' | 'large'
> = {
	default: 'medium',
	sm: 'small',
	lg: 'large',
	icon: 'small',
}

const BUTTON_COLOR_MAP: Record<
	NonNullable<CalendarButtonProps['variant']>,
	'primary' | 'secondary' | 'error'
> = {
	default: 'primary',
	destructive: 'error',
	outline: 'primary',
	secondary: 'secondary',
	ghost: 'primary',
	link: 'primary',
}

const MuiCalendarButton = ({
	variant = 'default',
	size = 'default',
	color: _htmlColor,
	ref,
	children,
	...rest
}: CalendarButtonProps) => {
	let buttonSx: SxProps<Theme> = { gap: 0.75, textTransform: 'none' }
	if (size === 'icon') {
		buttonSx = { minWidth: 36, px: 1 }
	}
	return (
		<MuiButton
			color={BUTTON_COLOR_MAP[variant]}
			ref={ref}
			size={BUTTON_SIZE_MAP[size]}
			sx={buttonSx}
			variant={BUTTON_VARIANT_MAP[variant]}
			{...rest}
		>
			{children}
		</MuiButton>
	)
}

const MuiCalendarInput = ({
	className,
	id,
	name,
	value,
	onChange,
	placeholder,
	required,
	disabled,
	type,
	ref,
	'aria-label': ariaLabel,
}: CalendarInputProps) => (
	<MuiTextField
		className={className}
		disabled={disabled}
		fullWidth
		id={id}
		inputRef={ref}
		name={name}
		onChange={onChange}
		placeholder={placeholder}
		required={required}
		size="small"
		slotProps={{ htmlInput: { 'aria-label': ariaLabel } }}
		type={type}
		value={value ?? ''}
		variant="outlined"
	/>
)

const MuiCalendarTextarea = ({
	className,
	id,
	name,
	value,
	onChange,
	placeholder,
	required,
	disabled,
	'aria-label': ariaLabel,
}: CalendarTextareaProps) => (
	<MuiTextField
		className={className}
		disabled={disabled}
		fullWidth
		id={id}
		minRows={3}
		multiline
		name={name}
		onChange={onChange}
		placeholder={placeholder}
		required={required}
		size="small"
		slotProps={{ htmlInput: { 'aria-label': ariaLabel } }}
		value={value ?? ''}
		variant="outlined"
	/>
)

const MuiCalendarLabel = ({
	className,
	htmlFor,
	id,
	children,
}: CalendarLabelProps) => (
	<MuiFormLabel className={className} htmlFor={htmlFor} id={id}>
		{children}
	</MuiFormLabel>
)

const MuiCalendarCheckbox = ({
	id,
	checked,
	onCheckedChange,
	disabled,
	className,
	'aria-label': ariaLabel,
}: CalendarCheckboxProps) => (
	<MuiCheckbox
		checked={checked}
		className={className}
		disabled={disabled}
		id={id}
		onChange={(event) => onCheckedChange(event.target.checked)}
		size="small"
		slotProps={{ input: { 'aria-label': ariaLabel } }}
	/>
)

const MuiCalendarDialog = ({
	open,
	onOpenChange,
	title,
	description,
	footer,
	className,
	children,
}: CalendarDialogProps) => {
	const theme = useTheme()
	return (
		<MuiDialog
			fullWidth
			maxWidth="sm"
			onClose={() => onOpenChange(false)}
			open={open}
			slotProps={{
				paper: { style: buildMuiCssVars(theme) as CSSProperties },
			}}
		>
			{title && <MuiDialogTitle>{title}</MuiDialogTitle>}
			<MuiDialogContent className={className}>
				{description && (
					<MuiDialogContentText sx={{ mb: 2 }}>
						{description}
					</MuiDialogContentText>
				)}
				{children}
			</MuiDialogContent>
			{footer && <MuiDialogActions>{footer}</MuiDialogActions>}
		</MuiDialog>
	)
}

const MuiCalendarSelect = ({
	id,
	value,
	onValueChange,
	options,
	placeholder,
	disabled,
	className,
	'aria-label': ariaLabel,
}: CalendarSelectProps) => (
	<MuiSelect
		className={className}
		disabled={disabled}
		displayEmpty={Boolean(placeholder)}
		fullWidth
		id={id}
		inputProps={{ 'aria-label': ariaLabel }}
		onChange={(event) => onValueChange(String(event.target.value))}
		size="small"
		value={value}
	>
		{placeholder && (
			<MuiMenuItem disabled value="">
				{placeholder}
			</MuiMenuItem>
		)}
		{options.map((option) => (
			<MuiMenuItem
				disabled={option.disabled}
				key={option.value}
				value={option.value}
			>
				{option.label}
			</MuiMenuItem>
		))}
	</MuiSelect>
)

const ALIGN_TO_ANCHOR: Record<
	NonNullable<CalendarPopoverProps['align']>,
	'left' | 'center' | 'right'
> = {
	start: 'left',
	center: 'center',
	end: 'right',
}

const MuiCalendarPopover = ({
	open: controlledOpen,
	onOpenChange,
	trigger,
	content,
	align = 'start',
	className,
	contentStyle,
}: CalendarPopoverProps) => {
	const theme = useTheme()
	const [anchorEl, setAnchorEl] = useState<HTMLSpanElement | null>(null)
	const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
	const isOpen = controlledOpen ?? uncontrolledOpen
	const setOpen = (next: boolean) => {
		if (controlledOpen === undefined) {
			setUncontrolledOpen(next)
		}
		onOpenChange?.(next)
	}
	const horizontal = ALIGN_TO_ANCHOR[align]

	return (
		<>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: wrapper anchors MUI Popover to the supplied interactive trigger */}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard activation lives on the child button trigger */}
			<span
				onClick={() => setOpen(!isOpen)}
				ref={setAnchorEl}
				style={{ display: 'inline-flex', width: '100%' }}
			>
				{trigger}
			</span>
			<MuiPopover
				anchorEl={anchorEl}
				anchorOrigin={{ vertical: 'bottom', horizontal }}
				onClose={() => setOpen(false)}
				open={isOpen}
				slotProps={{
					paper: {
						className,
						style: {
							...(buildMuiCssVars(theme) as CSSProperties),
							...contentStyle,
						},
					},
				}}
				transformOrigin={{ vertical: 'top', horizontal }}
			>
				{content}
			</MuiPopover>
		</>
	)
}

/** Native Material UI primitive overrides for `<IlamyCalendar components={...} />`. */
export const muiCalendarComponents: Required<CalendarComponents> = {
	Button: MuiCalendarButton,
	Input: MuiCalendarInput,
	Textarea: MuiCalendarTextarea,
	Label: MuiCalendarLabel,
	Checkbox: MuiCalendarCheckbox,
	Dialog: MuiCalendarDialog,
	Select: MuiCalendarSelect,
	Popover: MuiCalendarPopover,
}
