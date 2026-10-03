# Design: one callback per user action (`onEventsChange`)

Status: implemented (#309). The one change from the proposal is how `scope` is typed; see below.

## The problem

Every change to events reaches the consumer through `onEventAdd`,
`onEventUpdate` and `onEventDelete`, one call per stored row the change
touches (`dispatchMutationResult` in
`features/calendar/hooks/calendar-data/event-changes.ts`, which `use-calendar-data.ts` used to hold). For a plain event that is one
call. For a recurring event, one user action is several rows, so it is several
independent calls.

Measured on `main` with a daily series that has two moved occurrences, editing
or deleting the occurrence on Wednesday:

| User action | onEventUpdate | onEventAdd | onEventDelete |
|---|---|---|---|
| Edit this occurrence | 1 (series, gains an EXDATE) | 1 (the new override) | 0 |
| Edit this and following | 1 (series, gains an UNTIL) | 1 (the new series) | 1 (moved occurrence after the cut) |
| Edit all | 1 (series) | 0 | 2 (every moved occurrence) |
| Delete this occurrence | 1 (series, gains an EXDATE) | 0 | 0 |
| Delete this and following | 1 (series, gains an UNTIL) | 0 | 0 (see "Related bug") |
| Delete all | 0 | 0 | 3 (series and every moved occurrence) |

Nothing tells the consumer that these calls belong to one action, which action
it was, or which scope was chosen. A backend that refuses one call (#309: a
business rule rejects the update but allows the deletes) persists half of the
action, and the user loses data they expected to keep.

## What the references do

- **FullCalendar** fires one callback per user action. A drag fires one
  `eventDrop` and one `eventChange`, each carrying `event`, `oldEvent`,
  `relatedEvents` (the other events the action changed) and `revert()`, which
  undoes all of it (`interaction/src/interactions/EventDragging.ts:279-305`,
  v6.1.21; [docs](https://fullcalendar.io/docs/eventChange)). `remove()` fires
  one `eventRemove` (`core/src/api/EventImpl.ts`, v6.1.21). FullCalendar has no
  per-occurrence editing: a recurring event moves as one definition when it has
  a `groupId` ([docs](https://fullcalendar.io/docs/recurring-events)), so it
  never splits an action into an exclusion plus an override the way we do.
- **CalDAV** stores a series and its overridden instances as one object:
  "Calendar components with the same UID property value, in a given calendar
  collection, MUST be contained in the same calendar object resource"
  ([RFC 4791 §4.1](https://www.rfc-editor.org/rfc/rfc4791#section-4.1)).
  Editing or deleting the whole series is one write of that object.
- **Google Calendar's API** represents an exception as its own instance with
  `recurringEventId` and `originalStartTime`, and warns against editing
  instances one by one to change the whole series
  ([guide](https://developers.google.com/workspace/calendar/api/guides/recurringevents)).
  Its docs do not say whether deleting a series deletes its exceptions, so this
  design does not rely on Google for that.

Both references treat one user action as one unit. Our per-row calls are a
faithful picture of our storage model (each moved occurrence is its own row the
consumer must persist), so they are not wrong, but they give the consumer no
way to see the unit.

## Proposal

Add one optional prop, fired once per user action, alongside the existing
callbacks:

```tsx
<IlamyCalendar
  events={events}
  onEventsChange={(change) => api.applyChange(change)}
/>
```

```ts
// @ilamy/types
export interface EventsChange {
  /** What the user did. */
  action: 'add' | 'update' | 'delete'
  /** The event the user acted on, as it was shown (an occurrence, for a series). */
  event: CalendarEvent
  /**
   * The scope chosen when a plugin manages the event, otherwise undefined.
   * The core cannot know a plugin's scopes. The recurrence plugin passes its
   * RecurrenceEditScope ('this' | 'following' | 'all'), now exported from
   * `@ilamy/calendar/plugins/recurrence`.
   */
  scope?: unknown
  /** New rows, the same ones passed to onEventAdd. */
  added: CalendarEvent[]
  /** Changed rows, the same ones passed to onEventUpdate. */
  updated: CalendarEvent[]
  /** Removed rows, the same ones passed to onEventDelete. */
  deleted: CalendarEvent[]
}
```

With it, #309's two cases become one call each that a backend can apply in one
transaction, or refuse as a whole:

- Edit all: `{ action: 'update', scope: 'all', updated: [series], deleted: [two moved occurrences] }`
- Edit this occurrence: `{ action: 'update', scope: 'this', updated: [series with EXDATE], added: [override] }`

Correction to the first draft: it proposed narrowing `scope` in the recurrence
plugin's `augment.ts`, as it does for `CalendarEvent.rrule`. Declaration
merging cannot do that: a merged interface may not redeclare an existing
property with a different type, so `scope?: unknown` cannot become the
recurrence scopes that way. The plugin exports `RecurrenceEditScope` instead,
for consumers to narrow against.

### When it fires

From every path in the data slice (`features/calendar/hooks/calendar-data/`) that changes events, once per call,
after the store is updated and after the per-row callbacks:

| Path | Reached from | `added` / `updated` / `deleted` |
|---|---|---|
| `addEvent` | event form (create, including the form drag-to-create opens), public `addEvent` | the event / none / none |
| `updateEvent` | event form (edit), drag and drop of a plain event, public `updateEvent` | none / the event / none |
| `deleteEvent` | event form (delete), public `deleteEvent` | none / none / the event |
| `applyScopedEdit` | edit or drop of a plugin-managed event (recurring), after the scope dialog | the plugin's `PluginMutationResult` |
| `applyScopedDelete` | delete of a plugin-managed event (recurring) | the plugin's `PluginMutationResult` |

When a plugin returns a plain event list rather than a `PluginMutationResult`,
the change is reported the way the per-row callback is today: the event under
`updated` (edit) or `deleted` (delete).

### The existing callbacks do not change

`onEventAdd`, `onEventUpdate` and `onEventDelete` keep firing exactly as they
do now. Changing them, for example to stop reporting moved occurrences that
"edit all" removes, would leave those rows behind in every consumer that
persists row by row. The docs will say to use one or the other: the per-row
callbacks to persist rows independently, `onEventsChange` to persist an action
as a unit.

### Naming

`onEventsChange`, plural, because it covers adds and deletes as well as updates
and usually carries several rows. FullCalendar's `eventChange` means
modifications only (adds and removals are `eventAdd` and `eventRemove`), so
reusing that name would suggest a narrower callback than this one.

## Not in this proposal

- **Refusing a change.** FullCalendar's `revert()` lets a consumer undo an
  action after the fact. Ours would need the store to roll back to its state
  before the action, which `use-calendar-data` cannot do today. Worth doing
  next, on top of this, since one callback per action is what makes a single
  revert possible.
- **Async confirmation** (waiting for the backend before updating the grid).
- **Changing how rows are stored** (for example, overrides inside the series
  object, as CalDAV does).

## Related bug

"Delete this and following" only sets UNTIL on the series
(`deleteFollowingScope` in `plugins/recurrence/src/utils/delete-recurring-event.ts`).
Moved occurrences after the cut stay in the store, are not reported, and are
still drawn. "Edit this and following" removes and reports them. Reproduced in
the browser; filed as #315. It should be fixed first, so the new callback
does not ship with a wrong `deleted` list for that action.

## Tests

- Unit (`use-calendar-data` / `CalendarProvider`): each of the five paths fires
  `onEventsChange` exactly once with the expected action and rows, and the
  per-row callbacks still fire as before.
- Recurrence plugin: each scope of edit and delete gives one call whose rows
  match the table above, with `scope` set.
- E2e: the harness records `onEventsChange`; editing a recurring occurrence
  with "All events" through the real dialog produces one change.

## Docs to update

`docs/hooks-and-context.md`, `docs/types-and-interfaces.md`, the website's
calendar props table, and the recurrence plugin docs (the scope values).
