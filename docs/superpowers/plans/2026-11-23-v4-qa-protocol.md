# v4.0 QA protocol (cross-framework, cross-styling)

**For:** whoever QAs a phase of `2026-11-23-v4-modular-architecture-plan.md`. A phase is not done until this protocol passes and its report is written.

## Why this exists

The owner found the issues in the examples table (end of this file) by hand, after QA had passed the work. They are the ones the owner happened to notice, not the full set: assume more of the same kinds exist that nobody has found yet. Almost all are one shape: **a combination of framework x CSS x view that differs from another**, or a playground control that looks or behaves wrong. The e2e harness cannot select a framework or styling today (`apps/e2e/src/harness-config.ts` only has `themeVariant`), so none of this was gated. QA's job is to find these before the owner does.

## Rules

1. **One reference: React + `@ilamy/calendar/styles.css`, light mode, default settings.** Every other combination must look and behave the same, except the colours, fonts and radius a styling system is meant to change. A difference is a bug until the owner says otherwise.
2. **Measure, never eyeball.** "Looks fine" and "no console errors" are not results. Each check names what to measure.
3. **Every cell of the matrix is checked, or listed as not checked with the reason.** Silence reads as passed.
4. **Find everything, report, then fix, then rerun the whole matrix.** A fix in the shared renderer moves every cell.
5. **Prove each probe can fail** on a known-bad state before trusting a pass (AGENTS.md).
6. **Anything found by hand becomes a spec** before the phase is done.
7. **Look at it as a user too.** After the measurements pass, open each framework in the playground and the demo and use it for real: switch views, create, drag, resize, scroll, switch frameworks and CSS. Write down anything that looks off even if no check flags it, then turn it into a check.

## Defect classes to hunt

The owner's past feedback (examples at the end of this file) falls into these classes. Hunt each **class** everywhere, not only the listed examples: the examples show what the class looks like, not where it ends.

| Class | What it means | How to hunt it | Checks |
|---|---|---|---|
| 1. Cross-framework drift | Same settings, different look or behaviour between React and Vue/Svelte/Solid/Angular | Diff every cell against the React reference: layout, borders, type, payloads | A, B, D, E |
| 2. Cross-CSS drift | Same framework, different layout between Unstyled/Plain/Tailwind/StyleX (or MUI-themed variables) beyond colours and fonts | Diff each CSS option against plain CSS in the same framework | A, B, C4 |
| 3. Feature in one framework only | A control or behaviour that exists or works in one framework but not the others | Build the interactive inventory from the reference and use every item in every cell | D1 |
| 4. Styling leaks | Styles appearing where they should not (Unstyled not bare, Tailwind classes in a no-Tailwind app, one option's tokens bleeding into another) | Inspect computed styles and class names, not appearance | C1, C3 |
| 5. Edges and seams | Double, thick or missing borders; gaps or no gap between parts; rounded vs square corners; clipped corners or outlines | Measure every edge where two parts meet, on every view including plugins | A3, B1, B2 |
| 6. Wrong visual meaning | Something looks like a different state than it is: a normal day looking disabled, a transparent sticky header, a selected look on an unselected item | Compare state styling cell by cell; check what is under sticky surfaces after scrolling | B4, B5 |
| 7. Scroll and overflow | Scrolling broken, unwanted scrollbars, content unreachable, sticky parts moving | Scroll every scroll container; flag every element that overflows when the reference does not | B6 |
| 8. Size and rhythm | Font sizes, line heights, control heights or spacing that differ between parts or cells | Measure type and control heights in every header, view and form | A2, B3 |
| 9. State lost on switching | Changing one setting silently changes another (framework switch resets granularity) | Record all settings before and after every switch | G3 |
| 10. Weak or false affordances | Interactive things hard to notice (subtle resize handles); non-interactive things looking clickable; duplicate controls | Hover and click every element; list every control and check each setting has one | D4, G4, G5 |
| 11. Wrong mental model in the UI | The UI groups things that are not alternatives (CSS libraries next to component libraries) or hides a combination by swapping it | Ask, for every control: are its options really one choice of the same kind? | G1, G2 |

When you find something that fits no class, add a class and a check here.

## The matrix

| Axis | Values |
|---|---|
| Framework | React, Vue, Svelte, Solid, Angular |
| CSS | Unstyled (`base.css` + `unstyled`), plain `styles.css`, Tailwind (`unstyled` + `slotProps.className`), StyleX (recipe) |
| Components | Native defaults; per framework one real library in the region slots (React: shadcn on Base UI, MUI; Vue: shadcn-vue / reka-ui; Svelte: shadcn-svelte / bits-ui; Solid, Angular: native + one custom slot) |
| View | month, week, day, resource month, resource week (daily and hourly), resource day, horizontal and vertical, agenda, year |
| Colour scheme | light, dark |
| Viewport | 1440x900, 390x844 |

Minimum per phase: **all 5 frameworks x all 4 CSS options x all views**, light, 1440x900; plus dark and 390x844 for plain CSS in every framework; plus every component-library cell.

## Checks (the minimum, not the limit)

These checks are the floor for each class. Passing them does not mean a class is clean: keep hunting by the class's description.

### A. Layout and geometry (automated; vs reference; 1px tolerance)

Snapshot `getBoundingClientRect()` and `getComputedStyle()` from `[data-ilamy-slot=...]` selectors.

- **A1 Header layout:** every header control (prev, next, today, title/date picker, view switcher, custom buttons) present, in the same left-to-right order, same x/y position and size as the reference.
- **A2 Header control heights:** all buttons and selects in the header have equal height, within each cell and vs the reference.
- **A3 Header-to-body gap:** bottom of header to top of the view container equals the reference in every CSS option (no extra gap, no missing gap).
- **A4 Grid geometry:** root, view container, first/last day column, first/last hour row, all-day row, resource rows/columns: width and height.
- **A5 Event bars:** left, top, width, height of the seed events, including multi-day continuing segments.
- **A6 Time-grid granularity:** number of hour rows and slot rows equals the reference for the same `slot` setting; resource week hourly stays hourly.
- **A7 Views as a whole:** agenda and year views get the same full A1-A5 snapshot as the time grids; they are not exempt because they are plugins.
- **A8 Event form and dialogs:** dialog width/height/position, field order, label text, field heights, button order and sizes equal the reference.

### B. Borders, corners, backgrounds, type (automated)

- **B1 Border count and width:** for each edge of cells, header, root, hour gutter and event bars, the element's border width plus its neighbour's equals the reference (catches double and missing borders). Explicitly check: outer border around the header; right border of the hour column in week/day; left/right borders on continuing multi-day events.
- **B2 Corners:** `border-radius` of root, header and view container equals the reference (owner decision: calendar body unrounded), and nothing is clipped: children's rects and outlines sit inside the parent's padding box.
- **B3 Type:** `font-size`, `line-height`, `font-weight`, `font-family` of title, header buttons, day headers, hour labels, event titles and form labels equal the reference (except font family where a CSS option sets it on purpose).
- **B4 State styling:** computed background, colour and opacity of today, selected, hover, disabled, weekend and business-hours-closed cells equal the reference. A normal day must not look disabled in any CSS option.
- **B5 Sticky surfaces are opaque:** sticky header, day header row and hour gutter have an opaque background (alpha 1). After scrolling, `document.elementFromPoint` at a point inside the sticky header returns the header, not an event underneath.
- **B6 Scrolling and scrollbars:** the scroll container scrolls by wheel and by drag-auto-scroll; the last hour row is reachable; sticky parts stay put; `scrollbar-width` / `scrollbar-color` equal the reference. No element anywhere (calendar or playground) has an unexpected scrollbar: flag every element with `scrollWidth > clientWidth` or `scrollHeight > clientHeight` that the reference does not have.

### C. Styling isolation

- **C1 Unstyled is bare:** no Tailwind or shadcn class names in the calendar's DOM; no colours, shadows, radius or fonts from `theme.css` (computed background transparent/inherited, `box-shadow: none`, `border-radius: 0`); structure (grid, sticky, scroll) still intact.
- **C2 Tailwind:** app has Tailwind, calendar uses `unstyled` + `slotProps.className`; A and B equal the reference.
- **C3 No Tailwind needed:** the calendar renders correctly in an app with no Tailwind at all, in every framework (`zero-tailwind-styles.spec.ts` extended).
- **C4 CSS options agree:** Tailwind, plain, StyleX (and MUI-themed variables) produce the same A and B results; only colours and fonts may differ.

### D. Behaviour (automated; same payloads as the reference)

Real pointer (`page.mouse`, small steps, target confirmed with `document.elementFromPoint`). The published `onEventsChange` / `onEventUpdate` payload equals the reference cell's, field by field.

- **D1 Interactive inventory:** list every interactive element in the reference (`role`/tag button, link, input, select, clickable title/date picker, view switcher, more-events link, resize handle). Each exists in every cell and does the same thing when used.
- **D2 CRUD:** click a cell, open the form, create, edit, delete.
- **D3 Drag and resize:** move to another day and time; resize from the end (and start with `eventResizableFromStart`); drag-to-create; resource timeline across resources.
- **D4 Resize cue:** hovering an event edge changes the cursor and shows the owner's edge cue (VS Code style: cursor change plus a 3-dot indicator on the edge), in every framework and CSS option.
- **D5 Recurrence:** edit and delete with each scope (this, this and following, all).
- **D6 Navigation:** prev/next/today, view switch, header date picker.
- **D7 Keyboard:** tab order through header and grid; Escape closes dialogs; focus returns to the trigger.
- **D8 Forms:** create and edit forms have the same fields, validation and save payload as the reference.

### E. Text

- **E1 Translations:** every visible string (header, views, form, dialogs) equals the reference for the same `locale` / `translations`.
- **E2 Formats:** dates and times equal the reference for the same `timezone`, `locale` and format props.

### F. Region slots (component libraries)

For each slot (`header`, `event`, `resource`, `eventForm`, `moreEventsDialog`, `recurrenceScopeDialog`) with the framework's library:

- **F1** Slot content mounts once and survives calendar updates (navigate, drag) without remounting: a counter in the slot must not reset; focus inside it is not lost.
- **F2** Library dialogs/popovers/selects inside `eventForm`: open, pick, close with Escape and outside click; nothing closes early.
- **F3** App context (theme provider, store) is visible inside the slot.
- **F4** Saving from a custom `eventForm` produces the same payload as the native form.

### G. Playground and demo UX

- **G1 Three independent axes:** Framework, CSS (Unstyled, Plain CSS, Tailwind, StyleX), Components (Native + libraries available for that framework). MUI is a component library, never an option next to Tailwind/StyleX. Today `preview-header-bar.tsx` mixes them in one list and `calendar-display.tsx:166-167` silently swaps MUI for Tailwind outside React.
- **G2 No silent replacement:** a combination that does not exist for a framework is disabled with a reason; it is never swapped for another value.
- **G3 Switching keeps settings:** changing framework, CSS or components keeps every other setting (view, resource granularity, locale, toggles). Check by reading the settings before and after each switch.
- **G4 One control per setting:** no setting has two controls (e.g. a theme switcher in the top bar and another in the sidebar).
- **G5 Affordance honesty:** things that look clickable are clickable, and things that are not clickable do not look it (no pointer cursor, no button styling on status chips such as the view/CSS labels next to "Live Preview").
- **G6 Layout:** the top bar reads as one clear set of controls, not two awkward rows; no stray scrollbars (B6 applies to the playground too).
- **G7 Code panel truth:** the code shown is exactly what the selected combination needs; pasted into a fresh app it produces what the preview shows (one combination per framework).

## The demo pass

After the matrix: `apps/demo` with its default settings and seed events (600px scroll, `dayMaxEvents`, `scrollToNow`, business hours, timezone, all plugins) in every framework; repeat D there (AGENTS.md: not done until exercised in the demo).

## Automation to add (before the first QA round)

- Harness parameters `framework=react|vue|svelte|solid|angular`, `css=unstyled|plain|tailwind|stylex`, `components=native|<library>` in `apps/e2e/src/harness-config.ts`; unknown values render an error (existing convention).
- One parity spec that loops the matrix, takes the A/B snapshots and D payloads, and diffs each cell against the reference. No screenshot baselines (AGENTS.md).
- One playground spec for G1-G5.

## The report

1. One table, one row per cell: framework, CSS, components, view, scheme, viewport, and pass/fail per check group. Each failure gives measured values (reference vs cell) or the payload diff.
2. Per defect class: what you hunted (cells, views, controls), what you found (with evidence), and what you could not cover. A class with nothing found still lists what was searched.
3. Cells not checked and why; probes shown to fail first; specs added; anything found in rule 7's hands-on pass.

No "all good" without the tables.

## Examples: owner feedback on PR #400

Illustrations only: they show what each class looks like in this codebase. They are not a checklist to tick off, and fixing them is not the goal. The goal is to find the issues of the same classes that nobody has reported yet.

| # | Owner found | Class | Check |
|---|---|---|
| 1 | Header layout and Today button placement differ between React and other frameworks | 1 | A1 |
| 2 | Outer border around the header in Vue/Svelte/Solid/Angular but not React | 1, 5 | B1 |
| 3 | React fonts noticeably larger; weird borders on events | 1, 8 | B3, B1 |
| 4 | Continuing multi-day events missing left/right borders outside React | 1, 5 | B1, A5 |
| 5 | Hour column missing its right border in week/day outside React | 1, 5 | B1 |
| 6 | Agenda view completely different between React and others | 1 | A7 |
| 7 | Header date picker worked only in React | 3 | D1, D6 |
| 8 | Create/edit forms looked and behaved differently across frameworks | 1, 3 | A8, D8 |
| 9 | Switching React to Vue dropped resource week from hourly to daily | 9 | G3, A6 |
| 10 | Unstyled still heavily styled | 4 | C1 |
| 11 | Layout and styling drift across Tailwind, MUI and StyleX | 2 | C4 |
| 12 | Header buttons of different heights | 8 | A2 |
| 13 | Header-to-body gap: small in Tailwind, larger in React MUI/StyleX, zero in Vue/Svelte/Solid/Angular StyleX | 2, 5 | A3 |
| 14 | Rounded corners clipped; body square in Tailwind, rounded in MUI/StyleX (owner: always unrounded) | 5 | B2 |
| 15 | Thicker body borders in StyleX and MUI | 2, 5 | B1 |
| 16 | Saturdays look disabled in resources view under MUI/StyleX | 6 | B4 |
| 17 | StyleX scrolling broken in Vue/Svelte/Solid/Angular, ugly scrollbar | 7 | B6 |
| 18 | Transparent sticky header; content bleeds through | 6 | B5 |
| 19 | Resize handles too subtle; wanted VS Code-style cursor plus 3-dot edge cue | 10 | D4 |
| 20 | Duplicate theme switcher in the demo sidebar and top bar | 10 | G4 |
| 21 | Awkward two-row top bar; non-interactive status chips look clickable | 10, 11 | G5, G6 |
| 22 | Scrollbar inside the preset tab strip | 7 | B6, G6 |
| 23 | Tailwind, MUI and StyleX in one mutually exclusive switcher, mixing CSS and component libraries | 11 | G1 |
