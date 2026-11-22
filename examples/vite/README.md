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

### 2. CSS — Import `@ilamy/calendar/styles.css`

Import `@ilamy/calendar/styles.css` before `@import 'tailwindcss'` so the layer order is preserved:

```css
/* src/index.css */
@import '@ilamy/calendar/styles.css';
@import 'tailwindcss';
```

### 3. Import CSS in your entry point

```tsx
// src/main.tsx
import './index.css'
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
│   │   └── Calendar.tsx     # Calendar component
│   ├── App.tsx              # Root app component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles with @ilamy/calendar/styles.css + Tailwind v4
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Learn More

- [ilamy Calendar Documentation](https://ilamy.dev/docs)
- [Vite Documentation](https://vite.dev)
- [Tailwind CSS v4 with Vite](https://tailwindcss.com/docs/installation/using-vite)
