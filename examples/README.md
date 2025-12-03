# ilamy Calendar - Framework Examples

This directory contains integration examples for using ilamy Calendar with popular frameworks.

## Available Examples

### [Next.js](./nextjs)
Complete example showing how to integrate ilamy Calendar with Next.js 15 using the App Router.

**Key features:**
- Uses `'use client'` directive for client-side rendering
- Tailwind CSS v4 configuration
- TypeScript support
- Works with both App Router and Pages Router

[View Next.js Example →](./nextjs)

### [Astro](./astro)
Complete example showing how to integrate ilamy Calendar with Astro 5+ using React integration.

**Key features:**
- Uses `client:only="react"` directive (required)
- Astro React integration with Vite
- Tailwind CSS v4 via `@tailwindcss/vite` plugin
- TypeScript support

[View Astro Example →](./astro)

## Quick Start

Each example is a standalone project. To run an example:

```bash
# Navigate to the example directory
cd nextjs  # or cd astro

# Install dependencies
npm install
# or
bun install  # Uses isolated installs (see bunfig.toml)

# Run the development server
npm run dev
# or
bun run dev
```

### Bun Users

Both examples include a `bunfig.toml` file that enables [isolated installs](https://bun.com/docs/pm/isolated-installs). This prevents lockfile conflicts with parent directories and ensures clean dependency management.

## Common Integration Requirements

All examples require the calendar package and its dependencies:

```bash
npm install @ilamy/calendar react react-dom tailwindcss dayjs
```

And dayjs configuration with required plugins:

```tsx
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)
```

## Framework-Specific Notes

### Next.js
- Calendar components must use `'use client'` directive
- Compatible with both App Router (Next.js 13+) and Pages Router
- Server components can pass props to client calendar components

### Astro
- **Must use `client:only="react"`** - other directives like `client:load` or `client:idle` will not work
- Requires `@astrojs/react` integration
- Uses Vite-based Tailwind CSS setup with `@tailwindcss/vite` plugin
- Calendar component is a standard React component

## Documentation

For complete documentation, visit [ilamy.dev/docs](https://ilamy.dev/docs)

## Need Help?

- [Documentation](https://ilamy.dev/docs)
- [GitHub Issues](https://github.com/kcsujeet/ilamy-calendar/issues)
- [FAQ](https://ilamy.dev/docs/help/faq)
