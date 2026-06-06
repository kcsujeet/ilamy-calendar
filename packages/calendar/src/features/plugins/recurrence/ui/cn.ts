import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Local class-name combiner for the recurrence plugin's UI. `cn` is not part of
 * the public `@ilamy/calendar` surface, so a plugin brings its own copy. Mirrors
 * the core implementation (clsx + tailwind-merge).
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}
