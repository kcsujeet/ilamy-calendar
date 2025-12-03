# Astro + ilamy Calendar Example

This example demonstrates how to integrate ilamy Calendar with Astro using React integration.

## Key Integration Points

### 1. Critical: Use `client:only="react"`

The calendar **must** use the `client:only="react"` directive. Other directives like `client:load` or `client:idle` will not work correctly:

```astro
---
import Calendar from '../components/Calendar'
---

<Calendar client:only="react" />
```

### 2. Astro Configuration with Vite

Install and configure the React integration with Tailwind CSS v4 via Vite:

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
})
```

### 3. Dayjs Configuration

Configure dayjs with required plugins in your React component:

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

### 4. Dependencies

Make sure to install all required dependencies:

```bash
npm install @astrojs/react @ilamy/calendar astro dayjs react react-dom tailwindcss
npm install -D @tailwindcss/vite @types/react @types/react-dom typescript
# or
bun install @astrojs/react @ilamy/calendar astro dayjs react react-dom tailwindcss
bun install -D @tailwindcss/vite @types/react @types/react-dom typescript
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

- Astro and `@astrojs/react` integration
- React and React DOM
- ilamy Calendar package
- Tailwind CSS v4 and Vite plugin
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
bun run dev  # Uses bunx to run Astro with Bun
```

> **Note:** When using Bun, the scripts use `bunx` to ensure Astro runs correctly with Bun's runtime. Other package managers (npm/yarn/pnpm) work normally.

3. **Open [http://localhost:4321](http://localhost:4321) in your browser.**

## Project Structure

```
astro/
├── src/
│   ├── components/
│   │   └── Calendar.tsx     # React calendar component
│   ├── layouts/
│   │   └── Layout.astro     # Base layout
│   ├── pages/
│   │   └── index.astro      # Home page with client:only directive
│   └── styles/
│       └── global.css       # Global styles with Tailwind v4
├── package.json
├── astro.config.mjs
└── tsconfig.json
```

## Important Notes

- **Must use `client:only="react"`** - Other client directives will not work
- The calendar component is a regular React component (no special Astro syntax needed)
- Supports Astro 5+ (uses Vite-based Tailwind CSS setup)
- Full TypeScript support included
- Tailwind CSS v4 uses `@tailwindcss/vite` plugin and `@import "tailwindcss"` in CSS (no config file needed)

## Learn More

- [ilamy Calendar Documentation](https://ilamy.dev/docs)
- [Astro Documentation](https://docs.astro.build)
- [Astro React Integration](https://docs.astro.build/en/guides/integrations-guide/react/)
