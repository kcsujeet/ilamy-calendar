import type React from 'react'
import { useCalendarComponents } from '@/stores/calendar-theme-context'

type TextFieldName = 'title' | 'description' | 'location'

interface EventFormTextFieldProps {
	name: TextFieldName
	label: string
	placeholder: string
	value: string
	required?: boolean
	multiline?: boolean
	onChange: (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
	) => void
}

const TextFieldControl = ({
	multiline,
	name,
	onChange,
	placeholder,
	required,
	value,
}: Omit<EventFormTextFieldProps, 'label'>) => {
	const { Input, Textarea } = useCalendarComponents()

	if (multiline) {
		return (
			<Textarea
				className="min-h-16 text-sm"
				id={name}
				name={name}
				onChange={onChange}
				placeholder={placeholder}
				required={required}
				value={value}
			/>
		)
	}

	return (
		<Input
			className="h-8 text-sm sm:h-9"
			id={name}
			name={name}
			onChange={onChange}
			placeholder={placeholder}
			required={required}
			value={value}
		/>
	)
}

/** Shared labelled text or multiline field for the event form (lives outside EventForm to keep focus). */
export const EventFormTextField = ({
	name,
	label,
	placeholder,
	value,
	required = false,
	multiline = false,
	onChange,
}: EventFormTextFieldProps) => {
	const { Label } = useCalendarComponents()

	return (
		<div className="grid gap-1 sm:gap-2">
			<Label className="text-xs sm:text-sm" htmlFor={name}>
				{label}
			</Label>
			<TextFieldControl
				multiline={multiline}
				name={name}
				onChange={onChange}
				placeholder={placeholder}
				required={required}
				value={value}
			/>
		</div>
	)
}
