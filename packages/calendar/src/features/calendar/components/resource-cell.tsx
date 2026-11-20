import type { Resource } from '@ilamy/types'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import type { StickyInsetSide } from '@/features/calendar/hooks/use-sticky-insets'
import { useSlotProps } from '@/features/calendar/stores/calendar-theme-context'

interface ResourceCellProps {
	resource: Resource
	className?: string
	children?: React.ReactNode
	'data-testid'?: string
	'data-sticky-inset'?: StickyInsetSide
}

export const ResourceCell: React.FC<ResourceCellProps> = ({
	resource,
	className,
	children,
	'data-testid': dataTestId,
	'data-sticky-inset': stickyInset,
}) => {
	const { renderResource } = useSmartCalendarContext()
	const slot = useSlotProps('resourceHeader', {
		structuralClassName: 'flex items-center justify-center p-2',
		extraClassName: className,
		style: {
			color: resource.color,
			backgroundColor: resource.backgroundColor,
		},
	})

	return (
		<div
			className={slot.className}
			data-sticky-inset={stickyInset}
			data-testid={dataTestId}
			style={slot.style}
		>
			{renderResource
				? renderResource(resource)
				: (children ?? (
						<div className="text-sm font-medium truncate">{resource.title}</div>
					))}
		</div>
	)
}
