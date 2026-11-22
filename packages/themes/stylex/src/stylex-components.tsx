import type {
	CalendarButtonProps,
	CalendarComponents,
	CalendarInputProps,
	CalendarTextareaProps,
} from '@ilamy/calendar'
import type { CSSProperties } from 'react'

const BUTTON_BASE_STYLE: CSSProperties = {
	display: 'inline-flex',
	alignItems: 'center',
	justifyContent: 'center',
	gap: '6px',
	whiteSpace: 'nowrap',
	cursor: 'pointer',
	borderRadius: '6px',
	fontSize: '0.875rem',
	fontWeight: 500,
	height: '36px',
	padding: '0 12px',
	border: '1px solid var(--ilamy-border)',
	backgroundColor: 'var(--ilamy-bg)',
	color: 'var(--ilamy-text)',
}

const BUTTON_VARIANT_STYLES: Record<
	NonNullable<CalendarButtonProps['variant']>,
	CSSProperties
> = {
	default: {
		backgroundColor: 'var(--ilamy-primary)',
		color: 'var(--ilamy-primary-fg)',
		border: '1px solid transparent',
	},
	destructive: {
		backgroundColor: 'var(--ilamy-danger)',
		color: 'var(--ilamy-primary-fg)',
		border: '1px solid transparent',
	},
	outline: {
		backgroundColor: 'var(--ilamy-bg)',
		color: 'var(--ilamy-text)',
		border: '1px solid var(--ilamy-border)',
	},
	secondary: {
		backgroundColor: 'var(--ilamy-surface-muted)',
		color: 'var(--ilamy-text)',
		border: '1px solid transparent',
	},
	ghost: {
		backgroundColor: 'transparent',
		color: 'var(--ilamy-text)',
		border: '1px solid transparent',
	},
	link: {
		backgroundColor: 'transparent',
		color: 'var(--ilamy-primary)',
		border: 'none',
		padding: 0,
		height: 'auto',
	},
}

const FIELD_STYLE: CSSProperties = {
	width: '100%',
	borderRadius: '6px',
	border: '1px solid var(--ilamy-border)',
	backgroundColor: 'var(--ilamy-bg)',
	color: 'var(--ilamy-text)',
	fontSize: '0.875rem',
	padding: '6px 10px',
	outline: 'none',
}

const StylexCalendarButton = ({
	variant = 'default',
	size = 'default',
	style,
	ref,
	type = 'button',
	...rest
}: CalendarButtonProps) => {
	let sizeStyle: CSSProperties | undefined
	if (size === 'sm') {
		sizeStyle = { height: '32px', padding: '0 10px', fontSize: '0.8125rem' }
	} else if (size === 'icon') {
		sizeStyle = { height: '36px', width: '36px', padding: 0 }
	}
	return (
		<button
			ref={ref}
			style={{
				...BUTTON_BASE_STYLE,
				...BUTTON_VARIANT_STYLES[variant],
				...sizeStyle,
				...style,
			}}
			type={type}
			{...rest}
		/>
	)
}

const StylexCalendarInput = ({ style, ref, ...rest }: CalendarInputProps) => (
	<input
		ref={ref}
		style={{ ...FIELD_STYLE, height: '36px', ...style }}
		{...rest}
	/>
)

const StylexCalendarTextarea = ({ style, ...rest }: CalendarTextareaProps) => (
	<textarea style={{ ...FIELD_STYLE, minHeight: '72px', ...style }} {...rest} />
)

/** Token-driven form/button primitives for `@ilamy/theme-stylex`. */
export const stylexCalendarComponents: CalendarComponents = {
	Button: StylexCalendarButton,
	Input: StylexCalendarInput,
	Textarea: StylexCalendarTextarea,
}
