import { describe, expect, it } from 'bun:test'
import {
	type CalendarEditFlags,
	resolveStartEditable,
} from './resolve-editability'

const canMove = (
	calendarFlags: CalendarEditFlags,
	eventFlags: { editable?: boolean; startEditable?: boolean } = {}
) => resolveStartEditable(eventFlags, calendarFlags)

describe('resolveStartEditable', () => {
	it('allows moving by default', () => {
		expect(canMove({})).toBe(true)
	})

	it('lets editable=false turn it off', () => {
		expect(canMove({ editable: false })).toBe(false)
	})

	it('lets eventStartEditable beat editable on the calendar', () => {
		expect(canMove({ editable: false, eventStartEditable: true })).toBe(true)
		expect(canMove({ editable: true, eventStartEditable: false })).toBe(false)
	})

	it('treats disableDragAndDrop as editable=false', () => {
		expect(canMove({ disableDragAndDrop: true })).toBe(false)
	})

	it('lets an explicit editable win over disableDragAndDrop', () => {
		expect(canMove({ disableDragAndDrop: true, editable: true })).toBe(true)
	})

	it('lets an explicit eventStartEditable win over disableDragAndDrop', () => {
		expect(
			canMove({ disableDragAndDrop: true, eventStartEditable: true })
		).toBe(true)
	})

	it('lets event.editable=false beat a permissive calendar', () => {
		expect(canMove({ editable: true }, { editable: false })).toBe(false)
	})

	it('lets event.startEditable=true beat editable=false on the calendar', () => {
		expect(canMove({ editable: false }, { startEditable: true })).toBe(true)
	})

	it('lets event.startEditable beat event.editable', () => {
		expect(canMove({}, { editable: false, startEditable: true })).toBe(true)
		expect(canMove({}, { editable: true, startEditable: false })).toBe(false)
	})
})
