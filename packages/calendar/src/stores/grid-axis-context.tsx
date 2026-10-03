import { createContext, useContext } from 'react'

/** The axis a grid's time runs along. Not exported: nothing outside needs to
 * name it, and the two providers pass it as a literal. */
type GridAxis = 'vertical' | 'horizontal'

/**
 * Which grid drew the bar you are inside. Ambient rather than a prop, because
 * every bar in a layer shares one answer that the layer knows as a literal —
 * threading it through `DraggableEvent` and `renderEventContent` would carry a
 * compile-time constant down three components.
 *
 * It cannot come from the calendar context: `view: 'week'` renders BOTH a
 * vertical time grid and a horizontal all-day band, so the view does not
 * determine the axis. Only the events layer does, and there are exactly two
 * that provide it.
 *
 * Defaults to `horizontal`, which is what a bar rendered outside any grid gets
 * (the all-events dialog). Such a bar is never truncated, so the axis decides
 * nothing for it.
 */
export const GridAxisContext = createContext<GridAxis>('horizontal')

export const useGridAxis = () => useContext(GridAxisContext)
