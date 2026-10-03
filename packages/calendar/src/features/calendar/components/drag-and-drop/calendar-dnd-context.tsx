import { DndContext } from '@dnd-kit/core'
import type React from 'react'
import { useId } from 'react'
import { EventMutationScopeSlot } from '@/features/calendar/components/calendar-slots'
import { useCalendarDrag } from '@/features/calendar/hooks/use-calendar-drag'
import { useDropCommit } from '@/features/calendar/hooks/use-drop-commit'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { DragPreviewContext } from '@/features/calendar/stores/drag-preview-context'
import { pointerWithinLazily } from '@/features/calendar/utils/pointer-within-lazily'
import { EventDragOverlay } from './event-drag-overlay'

interface CalendarDndContextProps {
	children: React.ReactNode
}

export function CalendarDndContext({ children }: CalendarDndContextProps) {
	/*
	 * dnd-kit derives the `aria-describedby` it puts on every draggable from a
	 * module-level counter that is never reset. In the browser that is fine —
	 * the module is fresh per page load. On a server it is not: the module
	 * lives for the life of the process, so the counter carries across
	 * requests and the second render of a page emits `DndDescribedBy-1` where
	 * the client, starting over at 0, emits `DndDescribedBy-0`. Every
	 * server-rendered calendar after the first then fails to hydrate.
	 *
	 * `useId` is React's answer to exactly this: it derives the id from the
	 * component's position in the tree, so server and client agree however many
	 * requests the process has served. Passing it through means consumers do
	 * not have to know any of this.
	 */
	const dndContextId = useId()
	const disableDragAndDrop = useSmartCalendarContext(
		(context) => context.disableDragAndDrop
	)
	const { commitDrop, scopeDialog } = useDropCommit()
	const { sensors, dragPreview, overlayRef, handlers } =
		useCalendarDrag(commitDrop)
	const isDragging = dragPreview !== null

	// If drag and drop is disabled, just return children without DndContext
	if (disableDragAndDrop) {
		return children as React.ReactElement
	}

	return (
		<DragPreviewContext.Provider value={dragPreview}>
			<DndContext
				collisionDetection={pointerWithinLazily}
				id={dndContextId}
				sensors={sensors}
				{...handlers}
			>
				{/* `data-dragging` lets a cell drop its hover tint while an event is
				    dragged over it, leaving the drop tint as the only one (#299).
				    `contents` keeps the wrapper out of the layout. */}
				<div
					className="contents"
					data-dragging={isDragging ? 'true' : undefined}
				>
					{children}
				</div>
				<EventDragOverlay ref={overlayRef} />
			</DndContext>

			{/* Scope dialog for the owned event, provided by the owning plugin */}
			<EventMutationScopeSlot {...scopeDialog} />
		</DragPreviewContext.Provider>
	)
}
