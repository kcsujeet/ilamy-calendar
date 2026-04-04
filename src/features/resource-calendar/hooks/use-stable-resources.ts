import { useRef } from 'react'
import type { BusinessHours } from '@/components/types'
import type { Resource } from '@/features/resource-calendar/types'

export function useStableResources(resources: Resource[]): Resource[] {
	const ref = useRef(resources)
	const prevIds = ref.current.map((r) => r.id).join(',')
	const nextIds = resources.map((r) => r.id).join(',')
	if (prevIds !== nextIds) {
		ref.current = resources
	}
	return ref.current
}

export const getResourceBusinessHours = (
	resources: Resource[]
): (BusinessHours | BusinessHours[])[] =>
	resources.map((r) => r.businessHours).filter(Boolean) as (
		| BusinessHours
		| BusinessHours[]
	)[]
