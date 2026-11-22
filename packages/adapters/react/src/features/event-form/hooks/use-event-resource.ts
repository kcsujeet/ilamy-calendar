import { useState } from 'react'

interface EventResourceInput {
	resourceId?: string | number
	resourceIds?: (string | number)[]
	hasResourceAxis: boolean
}

/** Tracks resource selection state and persistence fields for the event form. */
export const useEventResource = ({
	resourceId,
	resourceIds,
	hasResourceAxis,
}: EventResourceInput) => {
	const initialSelectedResourceId = resourceId ?? resourceIds?.at(0)
	const showResourceSelector =
		hasResourceAxis && initialSelectedResourceId === undefined

	const [selectedResourceId, setSelectedResourceId] = useState<
		string | number | undefined
	>(initialSelectedResourceId)

	const effectiveResourceId = hasResourceAxis ? selectedResourceId : resourceId
	const isResourceMissing =
		showResourceSelector && selectedResourceId === undefined

	const hasResourceIds = resourceIds !== undefined
	let resourceFields: { resourceId?: string | number } = {}
	if (!hasResourceIds) {
		resourceFields = { resourceId: effectiveResourceId }
	}

	return {
		selectedResourceId,
		setSelectedResourceId,
		effectiveResourceId,
		resourceFields,
		showResourceSelector,
		isResourceMissing,
	}
}
