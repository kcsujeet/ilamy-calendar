# Vite + ilamy Calendar Example

This example demonstrates how to integrate `@ilamy/calendar` in a plain **Vite + React** project using **Tailwind CSS v4** via `@tailwindcss/vite`.

## Key Integration Points

### 1. Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

### 2. CSS — `@source` Directive

Add `@source` pointing at the ilamy dist folder so Tailwind v4 scans and generates all the utility classes used by the calendar:

```css
/* src/index.css */
@import 'tailwindcss';
@source "../node_modules/@ilamy/calendar/dist";
```

> [!IMPORTANT]
> The `@source` path is **relative to your CSS file**, not the project root.
> The correct depth depends on where your CSS lives:
>
> ```css
> /* CSS at src/index.css — one level deep */
> @source "../node_modules/@ilamy/calendar/dist";
>
> /* CSS at src/styles/global.css — two levels deep */
> @source "../../node_modules/@ilamy/calendar/dist";
> ```
>
> A wrong depth silently points at a non-existent directory and Tailwind generates no classes.

### 3. Import CSS in your entry point

```tsx
// src/main.tsx
import './index.css'
```

### 4. Dayjs Plugins

Configure dayjs with the required plugins in your component:

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

## Getting Started

1. **Install dependencies:**

```bash
bun install
# or: npm install / pnpm install / yarn
```

2. **Run the development server:**

```bash
bun run dev
# or: npm run dev
```

3. **Open [http://localhost:5173](http://localhost:5173) in your browser.**

## Project Structure

```
vite/
├── src/
│   ├── components/
│   │   └── Calendar.tsx     # Calendar component with dayjs setup
│   ├── App.tsx              # Root app component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles with Tailwind v4 + @source
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Learn More

- [ilamy Calendar Documentation](https://ilamy.dev/docs)
- [Vite Documentation](https://vite.dev)
- [Tailwind CSS v4 with Vite](https://tailwindcss.com/docs/installation/using-vite)
