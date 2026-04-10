import * as THREE from 'three'
import { WebGL2RenderingContext } from '@xperimntl/vue-threejs-test-renderer/src/WebGL2RenderingContext'
import { extend } from '@xperimntl/vue-threejs'

const DEFAULT_RECT = { width: 1280, height: 800, top: 0, left: 0, right: 1280, bottom: 800, x: 0, y: 0 }
const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect

function getRect(target: Element) {
  const rect = originalGetBoundingClientRect.call(target as HTMLElement)
  const width = rect?.width || (target as HTMLElement).clientWidth || DEFAULT_RECT.width
  const height = rect?.height || (target as HTMLElement).clientHeight || DEFAULT_RECT.height
  const top = rect?.top ?? DEFAULT_RECT.top
  const left = rect?.left ?? DEFAULT_RECT.left
  return {
    width,
    height,
    top,
    left,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON() {
      return this
    },
  }
}

// PointerEvent is not in JSDOM
// https://github.com/jsdom/jsdom/pull/2666#issuecomment-691216178
// https://w3c.github.io/pointerevents/#pointerevent-interface
if (!global.PointerEvent) {
  global.PointerEvent = class extends MouseEvent implements PointerEvent {
    readonly pointerId: number = 0
    readonly width: number = 1
    readonly height: number = 1
    readonly pressure: number = 0
    readonly tangentialPressure: number = 0
    readonly tiltX: number = 0
    readonly tiltY: number = 0
    readonly twist: number = 0
    readonly pointerType: string = ''
    readonly isPrimary: boolean = false
    readonly altitudeAngle: number = 0
    readonly azimuthAngle: number = 0

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params)
      Object.assign(this, params)
    }

    getCoalescedEvents = () => []
    getPredictedEvents = () => []
  }
}

// ResizeObserver is not in JSDOM
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserver {
    private readonly callback: ResizeObserverCallback

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback
    }

    observe(target: Element) {
      this.callback(
        [
          {
            target,
            contentRect: getRect(target),
            borderBoxSize: [] as ResizeObserverSize[],
            contentBoxSize: [] as ResizeObserverSize[],
            devicePixelContentBoxSize: [] as ResizeObserverSize[],
          } as ResizeObserverEntry,
        ],
        this,
      )
    }

    unobserve() {}
    disconnect() {}
  }
}

HTMLElement.prototype.getBoundingClientRect = function () {
  const rect = originalGetBoundingClientRect.call(this)
  if (rect.width && rect.height) return rect
  return getRect(this)
}

// @ts-expect-error - mock WebGL context for test environment
globalThis.WebGL2RenderingContext = WebGL2RenderingContext
// @ts-expect-error - mock WebGL context for test environment
globalThis.WebGLRenderingContext = class WebGLRenderingContext extends WebGL2RenderingContext {}

// @ts-expect-error - mock WebGL context for test environment
HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
  return new WebGL2RenderingContext(this)
}

// Extend catalogue for render API in tests
// @ts-expect-error - THREE namespace is a valid catalogue of constructors
extend(THREE)
