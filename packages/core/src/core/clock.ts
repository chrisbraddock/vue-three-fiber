/**
 * Internal timekeeper used by vue-threejs's render loop. Byte-for-byte
 * clone of three.js's Clock semantics (start/stop/elapsedTime/getDelta)
 * without the r166 warn-on-construct emitted by THREE.Clock.
 *
 * Named `V3fClock` rather than `Clock` on purpose: when consumer
 * bundlers (Vite + rollup on app builds) scope-hoist this file
 * alongside `three.module.js`, two top-level classes named `Clock`
 * collide. Rollup has been observed to rewrite local call-sites to
 * three's class, which reintroduces the r166 warn. A distinct name
 * removes the collision outright.
 */
export class V3fClock {
  autoStart: boolean
  running = false
  startTime = 0
  oldTime = 0
  elapsedTime = 0

  constructor(autoStart = true) {
    this.autoStart = autoStart
  }

  start(): void {
    this.startTime = now()
    this.oldTime = this.startTime
    this.elapsedTime = 0
    this.running = true
  }

  stop(): void {
    this.getElapsedTime()
    this.running = false
    this.autoStart = false
  }

  getElapsedTime(): number {
    this.getDelta()
    return this.elapsedTime
  }

  getDelta(): number {
    let diff = 0

    if (this.autoStart && !this.running) {
      this.start()
      return 0
    }

    if (this.running) {
      const newTime = now()
      diff = (newTime - this.oldTime) / 1000
      this.oldTime = newTime
      this.elapsedTime += diff
    }

    return diff
  }
}

function now(): number {
  return (typeof performance === 'undefined' ? Date : performance).now()
}
