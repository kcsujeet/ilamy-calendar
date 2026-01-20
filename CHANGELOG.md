### Changelog

All notable changes to this project will be documented in this file. Dates are displayed in UTC.

#### [v1.3.1](https://github.com/kcsujeet/ilamy-calendar/compare/v1.3.0...v1.3.1)

> 20 January 2026

##### Features

- feat: standardize animations with `AnimatedSection` component and remove unused dependencies [`#60`](https://github.com/kcsujeet/ilamy-calendar/pull/60)

##### Fixes

- fix: resolve vertical resource grid cell rendering [`#68`](https://github.com/kcsujeet/ilamy-calendar/pull/68) - Thanks [@sfradel](https://github.com/sfradel)!
- fix: export `BusinessHours` type from main entry point [`#69`](https://github.com/kcsujeet/ilamy-calendar/pull/69)

#### [v1.3.0](https://github.com/kcsujeet/ilamy-calendar/compare/v1.2.3...v1.3.0)

> 4 January 2026

##### Features

- feat: implement `hideNonBusinessHours` support to collapse non-working hours in the view [`#51`](https://github.com/kcsujeet/ilamy-calendar/pull/51)
- feat: add `renderCurrentTimeIndicator` prop for custom current time indicator rendering [`#53`](https://github.com/kcsujeet/ilamy-calendar/pull/53)
- feat: add `eventSpacing` prop to `GridCell` for more granular event layout control [`#55`](https://github.com/kcsujeet/ilamy-calendar/pull/55)


#### [v1.2.3](https://github.com/kcsujeet/ilamy-calendar/compare/v1.2.2...v1.2.3)

> 2 January 2026

##### Fixes

- fix: resolve Month View height expansion and clickability issues [`#54`](https://github.com/kcsujeet/ilamy-calendar/pull/54)
- feat: add layout regression tests for grid components


#### [v1.2.2](https://github.com/kcsujeet/ilamy-calendar/compare/v1.2.1...v1.2.2)

> 25 December 2025

##### Fixes

- fix: improve responsiveness in month view and resource components [`#48`](https://github.com/kcsujeet/ilamy-calendar/pull/48)
- fix(tailwind): explicitly declare form color option classes [`#47`](https://github.com/kcsujeet/ilamy-calendar/pull/47) - Thanks [@habovh](https://github.com/habovh)!

#### [v1.2.1](https://github.com/kcsujeet/ilamy-calendar/compare/v1.2.0...v1.2.1)

> 24 December 2025

##### Breaking Changes

- **BREAKING:** Removed default `dayjs` locale imports from the library bundle. Users are now responsible for importing the necessary `dayjs` locales in their application to reduce bundle size.

##### Fixes

- fix: resolve sticky-header issues and update dependencies
- fix: remove borders from day and week view headers for a cleaner appearance
- fix: update border styles in `GridCell` and refactor available views in `ViewControls`

#### [v1.2.0](https://github.com/kcsujeet/ilamy-calendar/compare/v1.1.1...v1.2.0)

> 24 December 2025

##### Features

- feat: implement vertical resource view for Resource Calendar [`#42`](https://github.com/kcsujeet/ilamy-calendar/pull/42)
- feat: implement generic horizontal grid and refine calendar architecture [`#42`](https://github.com/kcsujeet/ilamy-calendar/pull/42)
- feat: migrate MonthView to HorizontalGrid and refine all-day event filtering [`#42`](https://github.com/kcsujeet/ilamy-calendar/pull/42)
- feat: improve cell click info and fix hour/minute passing in resource calendar [`#46`](https://github.com/kcsujeet/ilamy-calendar/pull/46)
- feat: enhance grid components with `variant` and `dayNumberHeight` props

##### Tooling & Infrastructure

- docs: update README with examples directory and demo link

#### [v1.1.1](https://github.com/kcsujeet/ilamy-calendar/compare/v1.1.0...v1.1.1)

> 6 December 2025

##### Features

- feat: add `eventSpacing` prop for customizable event spacing in calendar views [`#32`](https://github.com/kcsujeet/ilamy-calendar/pull/32) - Thanks [@owyndevz](https://github.com/owyndevz)!
- feat: add `classesOverride` prop for custom disabled cell styling [`#33`](https://github.com/kcsujeet/ilamy-calendar/pull/33)
- feat: support `BusinessHours` array for different hours per day [`#29`](https://github.com/kcsujeet/ilamy-calendar/pull/29) - Thanks [@okejminja](https://github.com/okejminja)!

##### Tooling & Infrastructure

- chore: migrate from oxlint + Prettier to Biome for unified linting and formatting [`#34`](https://github.com/kcsujeet/ilamy-calendar/pull/34)
  - Replaced oxlint and Prettier with Biome v2.3.8
  - Faster linting and formatting with Rust-based tooling
  - Unified configuration for consistent code style

##### Fixes

- fix: scrollbar hidden behind sticky resource column and events [`#35`](https://github.com/kcsujeet/ilamy-calendar/pull/35)
  - Added `z-30` to horizontal scrollbars in all calendar views (Month, Week, Day, Year)
  - Ensures scrollbars appear above sticky resource columns (`z-20`) and event layers (`z-10`)
  - Fixes issue where horizontal scrollbar was invisible in Resource Calendar views

#### [v1.1.0](https://github.com/kcsujeet/ilamy-calendar/compare/v1.0.2...v1.1.0)

##### Features

- feat: add `renderEventForm` prop for custom event form support [`#24`](https://github.com/kcsujeet/ilamy-calendar/pull/24)
- feat: add `businessHours` prop for restricting calendar interactions [`#23`](https://github.com/kcsujeet/ilamy-calendar/pull/23)
- feat: add `timeFormat` prop to configure 12-hour or 24-hour time display [`#25`](https://github.com/kcsujeet/ilamy-calendar/pull/25) - Thanks [@git-ari](https://github.com/git-ari)!

##### Breaking Changes

- **BREAKING:** `onCellClick` callback signature changed from `(start, end) => void` to `(info: CellClickInfo) => void`. The new `CellClickInfo` type includes `{ start, end, resourceId }` for better extensibility and resource calendar support.
- **BREAKING:** `openEventForm` now accepts `Partial<CalendarEvent>` as argument instead of just a date string, enabling pre-populated event form fields.
- **BREAKING:** `ResourceCalendarEvent` type has been removed. `CalendarEvent` now includes `resourceId` and `resourceIds` properties directly.

##### Fixes

- fix: resolve stale current date issue [`#22`](https://github.com/kcsujeet/ilamy-calendar/pull/22) - Thanks [@WhiteLady1](https://github.com/WhiteLady1)!

#### [v1.0.2](https://github.com/kcsujeet/ilamy-calendar/compare/v1.0.1...v1.0.2)

##### Features

- feat: add initialDate prop [`0709260`](https://github.com/kcsujeet/ilamy-calendar/commit/0709260)
- feat: enhance drag-and-drop functionality for calendar events with all-day and timed event conversions [`85fe985`](https://github.com/kcsujeet/ilamy-calendar/commit/85fe985)

##### Fixes

- fix: update package versions and improve ScrollArea component props handling [`63988c2`](https://github.com/kcsujeet/ilamy-calendar/commit/63988c2)
- fix: correct week/month range calculation for firstDayOfWeek [`576d79e`](https://github.com/kcsujeet/ilamy-calendar/commit/576d79e)
- fix: add month state management to DatePicker for dropdown navigation

#### [v1.0.1](https://github.com/kcsujeet/ilamy-calendar/compare/v1.0.0...v1.0.1)

- fix: add data-testid to day view time cells, resolve CI failures and add type checking to pipeline [`#16`](https://github.com/kcsujeet/ilamy-calendar/pull/16)

### [v1.0.0](https://github.com/kcsujeet/ilamy-calendar/compare/v0.3.3...v1.0.0)

> 13 October 2025

- feat: add resource calendar [`#13`](https://github.com/kcsujeet/ilamy-calendar/pull/13)

#### [v0.3.3](https://github.com/kcsujeet/ilamy-calendar/compare/v0.3.2...v0.3.3)

- fix: capitalize weekday names in month header [`#11`](https://github.com/kcsujeet/ilamy-calendar/pull/11)

#### [v0.3.2](https://github.com/kcsujeet/ilamy-calendar/compare/0.3.1...v0.3.2)

> 12 September 2025

- fix: improve week view time indicator alignment [`a43a3c7`](https://github.com/kcsujeet/ilamy-calendar/commit/a43a3c7156a0fea8325bbd600a138d7f80306d60)
- feat: add translation support for 'all-day' label and week number in calendar views [`b787e0d`](https://github.com/kcsujeet/ilamy-calendar/commit/b787e0d22c88436f3ce14ee1a4fdfc0f017b9906)
- fix: update 'All-day' label to 'All day' for consistency in day view tests [`3566637`](https://github.com/kcsujeet/ilamy-calendar/commit/3566637f89f54e98fe54e94864caab93a2caef13)

#### [0.3.1](https://github.com/kcsujeet/ilamy-calendar/compare/v0.3.1...0.3.1)

> 20 August 2025

- feat: add translation keys for 'new' and 'export' actions in header component [`9faf464`](https://github.com/kcsujeet/ilamy-calendar/commit/9faf464931d3e735c1a653a390ce6e034a50ea88)
- chore: update changelog for v0.3.1 release [`5f2f70f`](https://github.com/kcsujeet/ilamy-calendar/commit/5f2f70f3084de1accf8224f452fdac5f99dbd639)

#### [v0.3.0](https://github.com/kcsujeet/ilamy-calendar/compare/v0.2.1...v0.3.0)

> 20 August 2025

- Feat/add support for translations [`#2`](https://github.com/kcsujeet/ilamy-calendar/pull/2)
- Feature/event continuation indicators and recurring event generation fix [`#1`](https://github.com/kcsujeet/ilamy-calendar/pull/1)
- feat(i18n): Implement internationalization support with translation objects and functions [`083a963`](https://github.com/kcsujeet/ilamy-calendar/commit/083a9638b16ea370e9e435a8c7d732ed4f233f9a)
- feat: add event handling callbacks for adding, updating, deleting events and date changes in CalendarProvider [`d415b48`](https://github.com/kcsujeet/ilamy-calendar/commit/d415b48b97239e2f3e9c092b5e746c91a8b53072)
- feat: improve recurring events and add visual continuation indicators [`1d4f95c`](https://github.com/kcsujeet/ilamy-calendar/commit/1d4f95cc7775ed4ded05c274b383bbfbf959d5c5)

#### [v0.2.1](https://github.com/kcsujeet/ilamy-calendar/compare/v0.2.0...v0.2.1)

> 4 August 2025

#### [v0.2.0](https://github.com/kcsujeet/ilamy-calendar/compare/v0.1.10...v0.2.0)

> 4 August 2025

- feat: add support for rrule based recurring events and add corresponding tests [`bc28261`](https://github.com/kcsujeet/ilamy-calendar/commit/bc28261a1010a520d7bcf789e236373cf69fc811)
- feat: add recurrence support [`440c11a`](https://github.com/kcsujeet/ilamy-calendar/commit/440c11ac2d739c5f12e61424e3113fc811bc0c7a)
- feat: use object rrule instead of string rrule for simplicity and remove originalStart and originalEnd [`649e5c1`](https://github.com/kcsujeet/ilamy-calendar/commit/649e5c1a1197cbbc86562beaf0df61a57957d3e1)

#### [v0.1.10](https://github.com/kcsujeet/ilamy-calendar/compare/v0.1.9...v0.1.10)

> 21 July 2025

- chore: update changelog and package.json for version 0.1.9 enhancements [`b55f8f7`](https://github.com/kcsujeet/ilamy-calendar/commit/b55f8f7459dfae1062d01568e7f5cdb10a69f663)
- feat: add type support for useIlamyCalendarConetxt hook [`d4ca380`](https://github.com/kcsujeet/ilamy-calendar/commit/d4ca380bd870fc9016fd02080faa661e7de0e838)
- Update README.md [`45ad45d`](https://github.com/kcsujeet/ilamy-calendar/commit/45ad45dbe9bb38725f042dca878d506524294d69)

#### [v0.1.9](https://github.com/kcsujeet/ilamy-calendar/compare/v0.1.8...v0.1.9)

> 21 July 2025

- feat: refactor openEventForm to accept only date parameter and implement handleOpenEventForm for event creation [`fa179f8`](https://github.com/kcsujeet/ilamy-calendar/commit/fa179f83b049f4c6084ed656c022066d44dcdee4)
- chore: update changelog for version 0.1.9 with fixes and enhancements [`e9b5a44`](https://github.com/kcsujeet/ilamy-calendar/commit/e9b5a445688b715584a10f5566c7771643ec8569)

#### [v0.1.8](https://github.com/kcsujeet/ilamy-calendar/compare/v0.1.7...v0.1.8)

> 21 July 2025

- feat: introduce IlamyCalendarEvent and update event normalization for improved type safety [`6050607`](https://github.com/kcsujeet/ilamy-calendar/commit/6050607030e7d76dbf92b958c2222fdcb964e7f4)

#### [v0.1.7](https://github.com/kcsujeet/ilamy-calendar/compare/v0.1.6...v0.1.7)

> 21 July 2025

- feat: enhance calendar event handling and update types for better type safety [`43fb0f2`](https://github.com/kcsujeet/ilamy-calendar/commit/43fb0f29800d549300a7ebed48a3da81fec25ac9)
- feat: remove support for cjs and enhance calendar component [`7bd0267`](https://github.com/kcsujeet/ilamy-calendar/commit/7bd02677f94fdfe5a6daf12d84c6128d4b005fdb)
- fix: ensure recurrence endDate is handled correctly in normalizeCalendarEvents [`1085903`](https://github.com/kcsujeet/ilamy-calendar/commit/1085903687a7cbddb371c7f0b42d51df30101ad5)

#### [v0.1.6](https://github.com/kcsujeet/ilamy-calendar/compare/v0.1.5...v0.1.6)

> 20 July 2025

- fix: set NODE_ENV to production in build script for consistency [`c8b8cd4`](https://github.com/kcsujeet/ilamy-calendar/commit/c8b8cd441bd2e215a549ac5eb584275b6ec26cc9)

#### [v0.1.5](https://github.com/kcsujeet/ilamy-calendar/compare/v0.1.4...v0.1.5)

> 20 July 2025

- fix: replace ScrollArea with a div for fixed height in MonthView component [`824a7db`](https://github.com/kcsujeet/ilamy-calendar/commit/824a7db4afcf22f83caa57e79263d5746894e8a9)
- fix: update homepage URL in README.md and package.json to reflect the correct domain [`029e44d`](https://github.com/kcsujeet/ilamy-calendar/commit/029e44d5403b7dd37c3d78239701732f0d2648e2)
- fix: update homepage URL in README.md and package.json to reflect the correct domain [`2d53499`](https://github.com/kcsujeet/ilamy-calendar/commit/2d534993629a61d7ee1519a0bfccf0c40257cf56)

#### [v0.1.4](https://github.com/kcsujeet/ilamy-calendar/compare/v0.1.3...v0.1.4)

> 20 July 2025

- refactor: rename stickyHeader to stickyViewHeader and update related props across components [`4fdd07f`](https://github.com/kcsujeet/ilamy-calendar/commit/4fdd07f5233a137ceff17857814748f3236b2476)
- feat: update dayjs imports to use custom configuration and enhance calendar components [`ed7594a`](https://github.com/kcsujeet/ilamy-calendar/commit/ed7594a7644e2e029052ea61ce04f8840120957f)
- chore: remove installation and quick start sections from README.md [`7b30637`](https://github.com/kcsujeet/ilamy-calendar/commit/7b306371d46b2abaeee8e73bccfe9d0359d231b9)

#### [v0.1.3](https://github.com/kcsujeet/ilamy-calendar/compare/v0.1.2...v0.1.3)

> 19 July 2025

- fix: update dayjs locale imports to include .js extension [`7cf557a`](https://github.com/kcsujeet/ilamy-calendar/commit/7cf557a7e0acc127494e37518003081e89e2a342)

#### [v0.1.2](https://github.com/kcsujeet/ilamy-calendar/compare/v0.1.1...v0.1.2)

> 19 July 2025

#### v0.1.1

> 19 July 2025

- feat: initialize project with Bun and React setup [`cfbff21`](https://github.com/kcsujeet/ilamy-calendar/commit/cfbff2174adec9a8e215b2a34b5091f0ca6c935c)
- refactor: standardize import statements and formatting across multiple files [`cc84462`](https://github.com/kcsujeet/ilamy-calendar/commit/cc8446237ea4ac6662666f63388f65537803d184)
- test: added tests for day, week, and month view components [`9552034`](https://github.com/kcsujeet/ilamy-calendar/commit/9552034c8b81fd1e9df04a7087acd39c09b88884)
