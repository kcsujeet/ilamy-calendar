import type React from 'react'
import type { IlamyCalendarProps } from '../types'
import { IlamyCalendar } from './ilamy-calendar'

/**
 * @deprecated Since v2.0 `IlamyCalendar` accepts `resources`, `renderResource`,
 * `orientation`, and `weekViewGranularity` directly — use it instead. This
 * alias will be removed in the next major.
 */
export type IlamyResourceCalendarProps = IlamyCalendarProps

/** @deprecated Since v2.0 — use `IlamyCalendar` with the `resources` prop. */
export const IlamyResourceCalendar: React.FC<IlamyResourceCalendarProps> = (
	props
) => <IlamyCalendar {...props} />
