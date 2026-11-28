import { useLayoutEffect } from 'preact/hooks'
import { parseSlotRange } from '../../../index'

/** Warns once per unusable visible-hours configuration, matching v3 prop validation. */
export const useInvalidSlotPropsWarning = (
	slotMinTime: string | undefined,
	slotMaxTime: string | undefined
): void => {
	const { invalidProps } = parseSlotRange(slotMinTime, slotMaxTime)
	const invalidNames = invalidProps.join(', ')

	useLayoutEffect(() => {
		if (!invalidNames) return
		console.warn(
			`[@ilamy/calendar] \`${invalidNames}\` is not a usable visible-hours range ('HH:mm' from '00:00' to '24:00', with slotMaxTime after slotMinTime), so the whole day is shown.`
		)
	}, [invalidNames])
}
