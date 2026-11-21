import { Button } from '@ilamy/ui/components/button'
import { Checkbox } from '@ilamy/ui/components/checkbox'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@ilamy/ui/components/dialog'
import { Input } from '@ilamy/ui/components/input'
import { Label } from '@ilamy/ui/components/label'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@ilamy/ui/components/popover'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@ilamy/ui/components/select'
import { Textarea } from '@ilamy/ui/components/textarea'
import { type CSSProperties, createContext, useContext } from 'react'
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
} from '@/types/calendar.types'

/** Carries theme CSS custom properties (e.g. StyleX / slotProps vars) into portaled primitives. */
export const PortalThemeStyleContext = createContext<CSSProperties | undefined>(
	undefined
)

const DefaultCheckbox = ({
	checked,
	onCheckedChange,
	...rest
}: CalendarCheckboxProps) => (
	<Checkbox
		checked={checked}
		onCheckedChange={(value) => onCheckedChange(value === true)}
		{...rest}
	/>
)

const DefaultDialog = ({
	open,
	onOpenChange,
	title,
	description,
	footer,
	className,
	onOpenAutoFocus,
	onCloseAutoFocus,
	children,
}: CalendarDialogProps) => {
	const portalStyle = useContext(PortalThemeStyleContext)
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent
				className={className}
				onCloseAutoFocus={onCloseAutoFocus}
				onOpenAutoFocus={onOpenAutoFocus}
				style={portalStyle}
			>
				{(title || description) && (
					<DialogHeader>
						{title && <DialogTitle>{title}</DialogTitle>}
						{description && (
							<DialogDescription>{description}</DialogDescription>
						)}
					</DialogHeader>
				)}
				{children}
				{footer && <DialogFooter>{footer}</DialogFooter>}
			</DialogContent>
		</Dialog>
	)
}

const DefaultSelect = ({
	id,
	value,
	onValueChange,
	options,
	placeholder,
	disabled,
	className,
	'aria-label': ariaLabel,
}: CalendarSelectProps) => {
	const portalStyle = useContext(PortalThemeStyleContext)
	return (
		<Select disabled={disabled} onValueChange={onValueChange} value={value}>
			<SelectTrigger aria-label={ariaLabel} className={className} id={id}>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent style={portalStyle}>
				{options.map((option) => (
					<SelectItem
						disabled={option.disabled}
						key={option.value}
						value={option.value}
					>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	)
}

const DefaultPopover = ({
	open,
	onOpenChange,
	trigger,
	content,
	align = 'start',
	className,
	contentStyle,
}: CalendarPopoverProps) => {
	const portalStyle = useContext(PortalThemeStyleContext)
	let mergedStyle: CSSProperties | undefined
	if (portalStyle || contentStyle) {
		mergedStyle = { ...portalStyle, ...contentStyle }
	}
	return (
		<Popover onOpenChange={onOpenChange} open={open}>
			<PopoverTrigger asChild>{trigger}</PopoverTrigger>
			<PopoverContent align={align} className={className} style={mergedStyle}>
				{content}
			</PopoverContent>
		</Popover>
	)
}

/** Built-in shadcn/Radix UI primitives used when no theme overrides them. */
export const DEFAULT_CALENDAR_COMPONENTS: Required<CalendarComponents> = {
	Button,
	Input,
	Textarea,
	Label,
	Checkbox: DefaultCheckbox,
	Dialog: DefaultDialog,
	Select: DefaultSelect,
	Popover: DefaultPopover,
}

const UnstyledButton = ({
	variant: _variant,
	size: _size,
	type = 'button',
	...rest
}: CalendarButtonProps) => <button type={type} {...rest} />

const UnstyledInput = (props: CalendarInputProps) => <input {...props} />

const UnstyledTextarea = (props: CalendarTextareaProps) => (
	<textarea {...props} />
)

const UnstyledLabel = (props: CalendarLabelProps) => <label {...props} />

const UnstyledCheckbox = ({
	checked,
	onCheckedChange,
	...rest
}: CalendarCheckboxProps) => (
	<input
		checked={checked}
		onChange={(event) => onCheckedChange(event.target.checked)}
		type="checkbox"
		{...rest}
	/>
)

const UnstyledSelect = ({
	id,
	value,
	onValueChange,
	options,
	placeholder,
	disabled,
	className,
	'aria-label': ariaLabel,
}: CalendarSelectProps) => (
	<select
		aria-label={ariaLabel}
		className={className}
		disabled={disabled}
		id={id}
		onChange={(event) => onValueChange(event.target.value)}
		value={value}
	>
		{placeholder && (
			<option disabled value="">
				{placeholder}
			</option>
		)}
		{options.map((option) => (
			<option
				disabled={option.disabled}
				key={option.value}
				value={option.value}
			>
				{option.label}
			</option>
		))}
	</select>
)

/** Bare HTML primitives used when `unstyled` is true and no `components` override is given. */
export const UNSTYLED_CALENDAR_COMPONENTS: Required<CalendarComponents> = {
	Button: UnstyledButton,
	Input: UnstyledInput,
	Textarea: UnstyledTextarea,
	Label: UnstyledLabel,
	Checkbox: UnstyledCheckbox,
	Dialog: DefaultDialog,
	Select: UnstyledSelect,
	Popover: DefaultPopover,
}
