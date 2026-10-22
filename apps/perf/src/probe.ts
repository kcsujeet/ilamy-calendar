/**
 * Measurement hooks the Playwright specs read through `window.__perf`.
 *
 * Installed before React renders so the long-task observer sees the mount. The
 * file imports nothing from the calendar: it is the same on every build.
 */

export interface PerfProbe {
	/** `performance.now()` when the app's script began running. */
	scriptStart: number
	/** React commits and summed `actualDuration`, from the <Profiler>. */
	commits: number
	actualMs: number
	/** Tasks over 50 ms, from a `longtask` PerformanceObserver. */
	longTasks: Array<{ start: number; duration: number }>
	/** `event.timeStamp` of the latest pointer or click input. */
	lastInputAt: number
	/** `requestAnimationFrame` callbacks seen, for per-frame averages. */
	frameCount: number
	/** Resolves with `performance.now()` once the frame after now has painted. */
	settle: () => Promise<number>
	/**
	 * Input-to-next-paint of the latest input: `event.timeStamp` to the first
	 * task after the next frame's paint, started INSIDE the capture listener so
	 * a Playwright round trip never adds to it.
	 */
	pending: Promise<number>
}

declare global {
	interface Window {
		__perf: PerfProbe
	}
}

export const installProbe = (): PerfProbe => {
	const probe: PerfProbe = {
		scriptStart: performance.now(),
		commits: 0,
		actualMs: 0,
		longTasks: [],
		lastInputAt: 0,
		frameCount: 0,
		pending: Promise.resolve(0),
		/*
		 * requestAnimationFrame runs before the frame's paint; a task queued from
		 * inside it runs after that paint. That is the usual "next paint" probe
		 * (https://web.dev/articles/optimize-long-tasks, "yield until next frame").
		 */
		settle: () =>
			new Promise<number>((resolve) => {
				requestAnimationFrame(() => {
					setTimeout(() => resolve(performance.now()), 0)
				})
			}),
	}

	new PerformanceObserver((list) => {
		for (const entry of list.getEntries()) {
			probe.longTasks.push({ start: entry.startTime, duration: entry.duration })
		}
	}).observe({ type: 'longtask', buffered: true })

	// Capture phase on window: runs before any handler the calendar registers.
	for (const type of ['pointerdown', 'pointermove', 'pointerup', 'click']) {
		window.addEventListener(
			type,
			(event) => {
				const inputAt = event.timeStamp
				probe.lastInputAt = inputAt
				probe.pending = probe.settle().then((paintedAt) => paintedAt - inputAt)
			},
			{ capture: true }
		)
	}

	const countFrame = () => {
		probe.frameCount += 1
		requestAnimationFrame(countFrame)
	}
	requestAnimationFrame(countFrame)

	window.__perf = probe
	return probe
}
