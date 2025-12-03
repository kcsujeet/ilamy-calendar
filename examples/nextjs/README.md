# Next.js + ilamy Calendar Example

This example demonstrates how to integrate ilamy Calendar with Next.js 15 using the App Router.

## Key Integration Points

### 1. Client Component Directive

Since ilamy Calendar is a client-side component, you must use the `'use client'` directive:

```tsx
'use client'

import { IlamyCalendar } from '@ilamy/calendar'

export default function Calendar() {
  // ...
}
```

### 2. Dayjs Configuration

Configure dayjs with required plugins before using the calendar:

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

### 3. Peer Dependencies

Make sure to install all required peer dependencies:

```bash
npm install react react-dom tailwindcss tailwindcss-animate
# or
yarn add react react-dom tailwindcss tailwindcss-animate
# or
pnpm add react react-dom tailwindcss tailwindcss-animate
# or
bun add react react-dom tailwindcss tailwindcss-animate
```

## Getting Started

1. **Install dependencies:**

```bash
npm install
# or
yarn
# or
pnpm install
# or
bun install  # Uses isolated installs (configured in bunfig.toml)
```

This will install:

- Next.js framework
- React and React DOM
- ilamy Calendar package
- Tailwind CSS v4
- All required dayjs plugins

> **Note for Bun users:** This example uses [isolated installs](https://bun.com/docs/pm/isolated-installs) via `bunfig.toml` to avoid lockfile conflicts with parent directories.

2. **Run the development server:**

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun run dev  # Uses bunx to run Next.js with Bun
```

> **Note:** When using Bun, the scripts use `bunx` to ensure Next.js runs correctly with Bun's runtime. Other package managers (npm/yarn/pnpm) work normally.

3. **Open [http://localhost:3000](http://localhost:3000) in your browser.**

## Project Structure

```
nextjs/
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Home page
│   │   └── globals.css      # Global styles with Tailwind v4
│   └── components/
│       └── calendar.tsx     # Calendar component with 'use client'
├── package.json
├── next.config.mjs
└── tsconfig.json
```

## Notes

- The calendar component must be a client component (use `'use client'`)
- Works with both Pages Router and App Router
- Supports Next.js 14 and 15
- Full TypeScript support included
- Tailwind CSS v4 uses `@import "tailwindcss"` in CSS (no config file needed)

## Learn More

- [ilamy Calendar Documentation](https://ilamy.dev/docs)
- [Next.js Documentation](https://nextjs.org/docs)
