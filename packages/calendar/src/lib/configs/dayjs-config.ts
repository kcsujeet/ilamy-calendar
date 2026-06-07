// The configured dayjs instance now lives in the shared `@ilamy/utils` package
// so the calendar and its plugins share one instance (its plugin augmentations
// only apply once per dayjs copy). Re-exported here so the existing
// `import dayjs, { type Dayjs } from '@/lib/configs/dayjs-config'` call sites
// across core stay unchanged.
export type { Dayjs, ManipulateType, OpUnitType } from '@ilamy/utils/dayjs'
export { default } from '@ilamy/utils/dayjs'
