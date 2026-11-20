import { type IlamyPlugin, SLOT_TOOLBAR } from '@ilamy/calendar'
import { createElement } from 'react'
import { IcalExportButton } from './ical-export-button'

export {
	type CollectFn,
	downloadICalendar,
	type ExportICalendarOptions,
	exportToICalendar,
} from './export-ical'
export {
	IcalExportButton,
	type IcalExportButtonProps,
} from './ical-export-button'

export interface IcalPluginOptions {
	/** Calendar name written to `X-WR-CALNAME`. Defaults to `'ilamy Calendar'`. */
	calendarName?: string
	/** Prefix for downloaded `.ics` files. Defaults to `'ilamy-calendar'`. */
	filenamePrefix?: string
	/** Set `false` to register the plugin without mounting the header Export button. */
	showToolbarButton?: boolean
}

/**
 * Adds RFC 5545 iCalendar (`.ics`) export with `VTIMEZONE`/`TZID` support and
 * mounts the Export action into the calendar header toolbar (`SLOT_TOOLBAR`).
 */
export const icalPlugin = (options: IcalPluginOptions = {}): IlamyPlugin => {
	const {
		calendarName = 'ilamy Calendar',
		filenamePrefix = 'ilamy-calendar',
		showToolbarButton = true,
	} = options

	return {
		name: 'ical',
		renderSlot: (slotName) => {
			if (slotName !== SLOT_TOOLBAR || !showToolbarButton) {
				return null
			}
			return createElement(IcalExportButton, {
				calendarName,
				filenamePrefix,
			})
		},
	}
}
