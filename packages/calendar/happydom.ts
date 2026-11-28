import { GlobalRegistrator } from '@happy-dom/global-registrator'

;(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true
GlobalRegistrator.register()
