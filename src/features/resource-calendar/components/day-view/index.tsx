import type React from 'react'
import { useResourceCalendarContext } from '@/features/resource-calendar/contexts/resource-calendar-context'
import { ResourceDayHorizontal } from './resource-day-horizontal'
import { ResourceDayVertical } from './resource-day-vertical'

export const ResourceDayView: React.FC = () => {
	const { orientation } = useResourceCalendarContext()

	if (orientation === 'vertical') {
		return <ResourceDayVertical />
	}

	return <ResourceDayHorizontal />
}
