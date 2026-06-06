/**
 * Restores the original package.json after npm pack/publish.
 */
import { renameSync } from 'node:fs'

renameSync('package.json.backup', 'package.json')
