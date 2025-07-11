# Ilamy Calendar - AI Coding Instructions

## Project Overview

A full-featured React calendar component library built with Bun, TypeScript, and modern React patterns. The project uses a component-based architecture with multiple calendar views (month, week, day, year) and advanced features like drag-and-drop, recurring events, and internationalization.

## Architecture & Core Patterns

### 1. Context-First State Management

The calendar state is centralized in `src/contexts/calendar-context/` with a provider pattern:

- **CalendarProvider** wraps the entire calendar component
- **useCalendarContext** hook provides access to all calendar operations
- State includes: currentDate, view, events, form state, and navigation methods
- All event operations (CRUD) flow through the context

### 2. View-Based Component Architecture

Calendar views are separate components in dedicated folders:

- `month-view/`, `week-view/`, `day-view/`, `year-view/`
- Each view handles its own layout logic and event positioning
- Views are switched via AnimatePresence for smooth transitions
- Main calendar component (`ilamy-calendar.tsx`) orchestrates view rendering

### 3. Event System with Recurring Support

Events use a sophisticated model defined in `src/components/types.ts`:

- Base `CalendarEvent` interface with optional recurrence patterns
- `ProcessedCalendarEvent` extends base with positioning data (left, width)
- Recurring events expand into individual instances with parent tracking
- Event positioning calculated in view-specific components

### 4. Drag & Drop Integration

DnD implemented via `@dnd-kit/core` in `src/contexts/calendar-dnd-context.tsx`:

- Wraps calendar views with DndContext
- Handles event dragging between time slots and dates
- Uses sensors for mouse/touch with reduced activation constraints
- Updates events through context after successful drops

## Development Workflow

### Build System (Bun-First)

- **Always use Bun** instead of npm/node/vite (see `.cursor/rules/`)
- Dev server: `bun dev` (hot reloading enabled)
- Build: `bun run build.ts` (custom build script with CLI options)
- Production: `bun start`

### Component Development

1. New components go in `src/components/[component-name]/`
2. Export from component's index file and `src/components/index.ts`
3. UI components use shadcn/ui pattern in `src/components/ui/`
4. All components import dayjs from `@/lib/dayjs-config` (pre-configured with plugins)

### Styling & UI

- TailwindCSS with custom config supporting CSS4 features
- shadcn/ui components for consistent design system
- Framer Motion for animations (imported as `motion`)
- CSS variables for theming in `styles/globals.css`

### Internationalization

- DayJS with 100+ locales pre-loaded in `dayjs-config.ts`
- Locale switching via calendar context
- Week start day configurable (Sunday/Monday)
- Timezone support built-in

## Key Conventions

### Import Patterns

```tsx
// Absolute imports using @/ alias
import { useCalendarContext } from '@/contexts/calendar-context/context'
import dayjs from '@/lib/dayjs-config' // Always use pre-configured dayjs
import type { CalendarEvent } from '@/components/types'
```

### Event Handling

- Events flow through context methods: `addEvent`, `updateEvent`, `deleteEvent`
- Form state managed via `isEventFormOpen`, `selectedEvent`, `selectedDate`
- Date selection triggers `selectDate` and optionally opens event form

### Component Composition

- Calendar wrapped in providers: `CalendarProvider` → `CalendarDndContext` → Views
- Demo page in `src/components/demo/` shows integration patterns
- Settings component demonstrates configuration options

### File Organization

- One component per file with co-located types when needed
- Shared types in `src/components/types.ts`
- Utilities in `src/lib/` (utils, dayjs config, seed data)
- Contexts have separate provider and context files

## Integration Points

### External Dependencies

- `@dnd-kit/core` for drag and drop (configured in dnd-context)
- `dayjs` for date manipulation (extensive plugin configuration)
- `@radix-ui` components via shadcn/ui
- `react-hook-form` + `zod` for form validation
- `motion` (framer-motion) for view transitions

### Data Flow

1. Events stored in calendar context state
2. Views query context for date-specific events
3. Event positioning calculated per view (month/week/day have different logic)
4. Form submissions update context state
5. DnD operations update event times/dates via context

## Testing & Debugging

- Use `bun test` for testing (no Jest/Vitest)
- Console logs echo from browser to server in development
- Hot reloading enabled for rapid development
- Build script supports sourcemaps and various output formats

## Common Patterns to Follow

- Always destructure what you need from `useCalendarContext()`
- Use `dayjs` consistently for all date operations
- Wrap new calendar features in the existing provider hierarchy
- Follow the view component pattern for new calendar layouts
- Use the event form pattern for user interactions with events
