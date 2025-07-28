# Ilamy Calendar - AI Coding Instructions

## 🚨 CRITICAL RULE: NEVER START/STOP DEV SERVER

**The development server is ALWAYS running. NEVER run `bun dev` or any server start/stop commands. Always assume hot reloading is active.**

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

## Project Structure & Organization

### Bullet-Proof React Project Structure

**ALWAYS follow the bullet-proof React project structure** for maintainability, scalability, and team collaboration:

#### Component Organization

- **One component per folder** with dedicated files for logic, types, and tests
- **Co-located files**: Keep related files together (component.tsx, component.test.tsx, types.ts, utils.ts)
- **Index files**: Each component folder exports through an index.ts file
- **Feature-based grouping**: Group components by calendar features (month-view/, week-view/, event-form/)

#### File Naming Conventions

- **Components**: PascalCase (`EventForm.tsx`, `MonthView.tsx`)
- **Hooks**: camelCase with `use` prefix (`useCalendarContext.ts`, `useRecurringEventActions.ts`)
- **Utilities**: camelCase (`utils.ts`, `dayjs-config.ts`)
- **Types**: camelCase with descriptive names (`types.ts`, `calendar-types.ts`)
- **Tests**: Match component name with `.test.tsx` suffix

#### Folder Structure Rules

```
project-root/
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── ui/          # Base UI components (shadcn/ui)
│   │   ├── [feature-name]/  # Feature-specific components
│   │   │   ├── index.ts     # Barrel exports
│   │   │   ├── component.tsx
│   │   │   ├── component.test.tsx
│   │   │   ├── types.ts     # Component-specific types
│   │   │   └── utils.ts     # Component-specific utilities
│   ├── contexts/        # React contexts and providers
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities, configurations, and helpers
│   ├── types/           # Global TypeScript definitions
│   └── features/        # Large feature modules (if needed)
├── styles/              # Global styles and themes
├── .github/             # GitHub workflows and templates
└── README.md            # Main project documentation
```

#### Import Organization

- **Absolute imports**: Always use `@/` alias for internal imports
- **Import grouping**: External dependencies → Internal modules → Relative imports
- **Type imports**: Use `import type` for TypeScript types
- **Barrel exports**: Use index.ts files to create clean import paths

#### Component Architecture

- **Single Responsibility**: Each component should have one clear purpose
- **Composition over Inheritance**: Prefer component composition patterns
- **Props Interface**: Define clear TypeScript interfaces for all props
- **Error Boundaries**: Implement error handling at appropriate component levels
- **Accessibility**: Follow ARIA standards and semantic HTML

#### Documentation Organization

- **Changelog**: Keep version history in CHANGELOG.md
- **README**: Project overview stays in root

This structure ensures code remains maintainable, testable, and scalable as the project grows.

## Development Workflow

### ⚠️ CRITICAL: Never Start/Stop Dev Server

**NEVER RUN `bun dev` OR START/STOP THE DEVELOPMENT SERVER** - The dev server is already running and should remain running. Only use existing terminal sessions and assume hot reloading is active.

### Build System (Bun-First)

- **Always use Bun** instead of npm/node/vite (see `.cursor/rules/`)
- **🚨 NEVER start dev server** - it's already running with hot reloading enabled
- **🚨 NEVER stop dev server** - assume it's always available
- Dev server: `bun dev` (hot reloading enabled) - ⚠️ DO NOT RUN THIS
- Build: `bun run build.ts` (custom build script with CLI options)
- Production: `bun start`

### Test-Driven Development (TDD)

- **Write tests FIRST** before implementing any new functionality
- **All new code must have meaningful tests** - no exceptions
- Test files should be co-located with components: `component.test.tsx`
- Use `bun test` for running tests (no Jest/Vitest)
- Test structure:
  - Unit tests for utilities and pure functions
  - Component tests for UI behavior and interactions
  - Integration tests for context and provider logic
- Follow the Red-Green-Refactor cycle:
  1. **Red**: Write failing test that describes desired behavior
  2. **Green**: Write minimal code to make test pass
  3. **Refactor**: Improve code while keeping tests green

### Component Development

1. **Start with tests** - define expected behavior before coding
2. New components go in `src/components/[component-name]/`
3. Export from component's index file and `src/components/index.ts`
4. UI components use shadcn/ui pattern in `src/components/ui/`
5. All components import dayjs from `@/lib/dayjs-config` (pre-configured with plugins)

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

### Date Handling & Timezone Safety

- **CRITICAL**: Never use `YYYY-MM-DD` format for date serialization
- **Always use full ISO strings** (`toISOString()`) when storing/transmitting dates
- `YYYY-MM-DD` format causes timezone shifts (day-before bugs) in western timezones
- Use `dayjs().toISOString()` instead of `dayjs().format('YYYY-MM-DD')`
- This applies to: form inputs, API calls, localStorage, database storage, URL params
- Exception: Only use `YYYY-MM-DD` for display purposes in UI components

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
- `motion` (framer-motion) for view transitions

### Data Flow

1. Events stored in calendar context state
2. Views query context for date-specific events
3. Event positioning calculated per view (month/week/day have different logic)
4. Form submissions update context state
5. DnD operations update event times/dates via context

## Testing & Debugging

- **Test-First Development**: Always write tests before implementation
- Use `bun test` for testing (no Jest/Vitest)
- **Mandatory test coverage**: Every new function, component, and feature must have tests
- Test file naming: `component.test.tsx` or `utility.test.ts`
- Focus on testing behavior, not implementation details
- Mock external dependencies and focus on unit isolation
- Console logs echo from browser to server in development
- Hot reloading enabled for rapid development
- Build script supports sourcemaps and various output formats

## Common Patterns to Follow

- Always destructure what you need from `useCalendarContext()`
- Use `dayjs` consistently for all date operations
- Wrap new calendar features in the existing provider hierarchy
- Follow the view component pattern for new calendar layouts
- Use the event form pattern for user interactions with events
