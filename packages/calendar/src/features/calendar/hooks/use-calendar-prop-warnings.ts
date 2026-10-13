import { useEffect } from 'react'
import { parseSlotRange } from '@/features/calendar/utils/view-hours'
import { warnInDev } from '@/features/calendar/utils/warn-in-dev'

/** `orientation` only means something on a calendar that has a resource axis. */
export const useOrientationWarning = (
	orientation: string | undefined,
	hasResources: boolean
) => {
	useEffect(() => {
		if (orientation && !hasResources) {
			warnInDev(
				'[@ilamy/calendar] `orientation` was provided without `resources` — it only applies when the calendar has resources, so it is ignored.'
			)
		}
	}, [orientation, hasResources])
}

/** The visible-hours props that could not be used fall back to the whole day. */
export const useInvalidSlotPropsWarning = (
	slotMinTime: string | undefined,
	slotMaxTime: string | undefined
) => {
	const { invalidProps } = parseSlotRange(slotMinTime, slotMaxTime)
	const invalidSlotPropNames = invalidProps.join(', ')
	useEffect(() => {
		if (invalidSlotPropNames) {
			// Unguarded on purpose, unlike `warnInDev`: its `typeof process` guard
			// drops the warning in a Vite browser, where `process` is undefined.
			console.warn(
				`[@ilamy/calendar] \`${invalidSlotPropNames}\` is not a usable visible-hours range ('HH:mm' from '00:00' to '24:00', with slotMaxTime after slotMinTime), so the whole day is shown.`
			)
		}
	}, [invalidSlotPropNames])
}
