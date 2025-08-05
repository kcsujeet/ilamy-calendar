# ilamy Calendar

A powerful, full-featured React calendar component library built with TypeScript, Tailwind CSS, and modern React patterns. Features multiple calendar views, drag-and-drop support, recurring events, and comprehensive internationalization.

<img width="1643" height="873" alt="Screenshot 2025-08-05 at 9 46 41 AM" src="https://github.com/user-attachments/assets/d289f034-0d26-4a1c-a997-dfa1ad26aa7a" />

## Features

- 🗓️ **Multiple Views**: Month, Week, Day, and Year views with smooth transitions
- 🎯 **Drag & Drop**: Move events between dates and time slots with collision detection
- 🔄 **RFC 5545 Recurring Events**: Full RRULE support with Google Calendar-style operations
  - **RRULE Patterns**: Daily, Weekly, Monthly, Yearly with complex frequencies
  - **Smart Operations**: Edit "this event", "this and following", or "all events"
  - **Exception Handling**: EXDATE exclusions and modified instance support
  - **rrule.js Integration**: Battle-tested library for robust recurrence generation
- 📤 **iCalendar Export**: RFC 5545 compliant .ics file export with proper recurring event handling
- 🌍 **Internationalization**: 100+ locales with dayjs and configurable week start days
- 🎨 **Customizable Styling**:
  - Flexible theming with Tailwind CSS and CSS variables
  - Custom event rendering with render props
  - Configurable colors, fonts, and spacing
- ⚡ **Performance Optimized**:
  - On-demand recurring event generation
  - Efficient date range calculations
  - Minimal re-renders with optimized React patterns
- 📱 **Responsive Design**: Adaptive layouts for desktop, tablet, and mobile
- 🔧 **Developer Experience**:
  - Full TypeScript support with comprehensive type definitions
  - IntelliSense and autocompletion
  - Extensive JSDoc documentation
  - Test-driven development with 100% test coverage
- 🎛️ **Advanced Event Management**:
  - All-day events with proper timezone handling
  - Multi-day events with smart positioning
  - Event validation and error handling
  - Bulk operations and batch updates

## Documentation

For comprehensive documentation, examples, and interactive demos, visit [ilamy.dev](https://ilamy.dev)
