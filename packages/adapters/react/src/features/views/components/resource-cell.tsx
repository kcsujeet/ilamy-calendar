import type { Resource } from '@ilamy/types'
import type { StickyInsetSide } from '@/features/views/hooks/use-sticky-insets'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { useSlotProps } from '@/stores/calendar-theme-context'

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
	})
	const cellStyle: React.CSSProperties = {
		...slot.style,
		...(resource.color ? { color: resource.color } : {}),
		...(resource.backgroundColor
			? { backgroundColor: resource.backgroundColor }
			: {}),
	}

	return (
		<div
			className={slot.className}
			data-ilamy-slot="resource-header"
			data-sticky-inset={stickyInset}
			data-testid={dataTestId}
			style={cellStyle}
		>
			{renderResource
				? renderResource(resource)
				: (children ?? (
						<div className="text-sm font-medium truncate">{resource.title}</div>
					))}
		</div>
	)
}
