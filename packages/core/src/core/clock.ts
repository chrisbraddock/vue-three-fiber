/**
 * Internal drop-in replacement for `THREE.Clock`.
 *
 * three.js r166+ deprecated `THREE.Clock` in favor of `THREE.Timer`, but the
 * two have incompatible APIs (Clock: start/stop/elapsedTime/getDelta; Timer:
 * update/getElapsed/getDelta). vue-threejs's render loop was built against
 * the Clock API; replacing it with Timer is a non-trivial surface change.
 *
 * Constructing a `THREE.Clock` prints
 *   "THREE.THREE.Clock: This module has been deprecated. Please use THREE.Timer instead."
 * once per instance. vue-threejs creates a Clock per Canvas root, so the
 * warning fires for every scene.
 *
 * This file is a byte-for-byte behavioral clone of three.js's Clock class
 * with the deprecation warning removed. Same API, same semantics.
 */
export class Clock {
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
