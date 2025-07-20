# Ilamy Calendar

A powerful, full-featured React calendar component library built with TypeScript, Tailwind CSS, and modern React patterns. Features multiple calendar views, drag-and-drop support, recurring events, and comprehensive internationalization.

## Features

- 🗓️ **Multiple Views**: Month, Week, Day, and Year views
- 🎯 **Drag & Drop**: Move events between dates and time slots
- 🔄 **Recurring Events**: Support for complex recurring patterns
- 🌍 **Internationalization**: 100+ locales with dayjs
- 🎨 **Customizable**: Flexible styling with Tailwind CSS
- ⚡ **Performance**: Optimized rendering with React patterns
- 📱 **Responsive**: Works seamlessly across devices
- 🔧 **TypeScript**: Full type safety and IntelliSense support

## Documentation

For comprehensive documentation, examples, and interactive demos, visit [calendar.ilamy.io](https://calendar.ilamy.io)

## Installation

```bash
npm install @ilamy/calendar
# or
yarn add @ilamy/calendar
# or
pnpm add @ilamy/calendar
# or
bun add @ilamy/calendar
```

## Quick Start

```tsx
import React from 'react'
import { IlamyCalendar, useIlamyCalendarContext } from '@ilamy/calendar'

function App() {
  return (
    <div className="h-screen p-4">
      <IlamyCalendar
        initialEvents=[
            {
                title: 'My Event',
                start: '2025-01-20T19:57:55.476Z',
                end: '2025-01-25T19:57:55.476Z'
            }
        ]
        dayMaxEvents={3}
        onEventClick={(event) => console.log('Event clicked:', event)}
        onCellClick={(start, end) => console.log('Date clicked:', start, end)}
      />
    </div>
  )
}

export default App
```
