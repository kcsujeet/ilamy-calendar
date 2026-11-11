import { describe, expect, test } from 'bun:test'
import path from 'node:path'

/*
 * `@ilamy/calendar` bundles this package from source, and Bun resolves each
 * import through the tsconfig nearest the importing file. Without `paths` here,
 * `@ilamy/utils/*` went through the package exports to `packages/utils/dist`: a
 * fresh clone could not run `build:lib`, and an old checkout shipped a second,
 * stale copy of the dayjs configuration next to the source one.
 */
describe('@ilamy/utils from @ilamy/ui', () => {
	const utilsSource = path.resolve(import.meta.dir, '../../utils/src')

	test.each([
		['@ilamy/utils/dayjs', 'dayjs.ts'],
		['@ilamy/utils/helpers', 'helpers.ts'],
	])('%s resolves to source, not dist', (specifier, sourceFile) => {
		const resolved = Bun.resolveSync(specifier, import.meta.dir)

		expect(resolved).toBe(path.join(utilsSource, sourceFile))
	})
})
