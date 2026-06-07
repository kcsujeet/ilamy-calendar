# @ilamy/ui

> **Internal package — not published.** These shadcn/ui primitives are bundled into [`@ilamy/calendar`](https://www.npmjs.com/package/@ilamy/calendar) at build time. The design tokens ship from `@ilamy/calendar/styles.css`. Consumers don't install this directly.

Shared [shadcn/ui](https://ui.shadcn.com) primitives (Radix + Tailwind CSS v4) used by the calendar and its plugins, kept in one workspace package to avoid per-feature duplication.

## Usage (within the workspace)

No barrel — import each primitive from its own subpath:

```tsx
import { Button } from '@ilamy/ui/components/button'
import { Dialog, DialogContent } from '@ilamy/ui/components/dialog'
import { cn } from '@ilamy/ui/lib/utils'
```

New primitives are added with the shadcn CLI (see `components.json`).

## License

MIT
