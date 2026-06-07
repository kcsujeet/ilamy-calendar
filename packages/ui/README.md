# @ilamy/ui

Shared [shadcn/ui](https://ui.shadcn.com) primitives (Radix + Tailwind CSS v4) for the [`@ilamy/calendar`](https://www.npmjs.com/package/@ilamy/calendar) ecosystem.

## Install

```sh
bun add @ilamy/ui
```

Peer deps: `react`, `react-dom`, `tailwindcss` (v4), `tailwindcss-animate`.

## Usage

No barrel — import each primitive from its own subpath:

```tsx
import { Button } from '@ilamy/ui/components/button'
import { Dialog, DialogContent } from '@ilamy/ui/components/dialog'
import { cn } from '@ilamy/ui/lib/utils'
```

## Styling (required)

This package ships the design tokens (CSS variables + Tailwind import) as a stylesheet. Import it once at your app's CSS entry:

```css
@import '@ilamy/ui/styles.css';
```

### Tailwind content detection

Tailwind v4 does **not** scan `node_modules` by default, so its pre-built class names won't be generated unless you register the package as a source. Add this to the same CSS file (adjust the relative depth to your stylesheet):

```css
@source "../node_modules/@ilamy/ui/dist";
```

If you also use `@ilamy/calendar` / `@ilamy/calendar-recurrence`, register their `dist` directories the same way.

## License

MIT
