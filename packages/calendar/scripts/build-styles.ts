import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const pkgRoot = resolve(scriptDir, '..')
const stylesSrcDir = resolve(pkgRoot, 'styles')
const distDir = resolve(pkgRoot, 'dist')
const distStylesDir = resolve(distDir, 'styles')

const baseCss = readFileSync(resolve(stylesSrcDir, 'base.css'), 'utf8')
const themeCss = readFileSync(resolve(stylesSrcDir, 'theme.css'), 'utf8')

mkdirSync(distStylesDir, { recursive: true })

writeFileSync(
	resolve(distStylesDir, 'base.css'),
	`@layer theme, base, ilamy.base, components, utilities;\n\n${baseCss}`
)
writeFileSync(
	resolve(distStylesDir, 'theme.css'),
	`@layer theme, base, ilamy.base, ilamy.theme, components, utilities;\n\n${themeCss}`
)
writeFileSync(
	resolve(distDir, 'styles.css'),
	`@layer theme, base, ilamy.base, ilamy.theme, components, utilities;\n\n${baseCss}\n${themeCss}`
)
