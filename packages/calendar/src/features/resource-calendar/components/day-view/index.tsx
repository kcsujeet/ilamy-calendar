import type React from 'react'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { ResourceDayHorizontal } from './resource-day-horizontal'
import { ResourceDayVertical } from './resource-day-vertical'

export const ResourceDayView: React.FC = () => {
	const { orientation } = useSmartCalendarContext()

	if (orientation === 'vertical') {
		return <ResourceDayVertical />
	}

	return <ResourceDayHorizontal />
}
