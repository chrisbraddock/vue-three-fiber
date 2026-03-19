import { RootState, RootStore } from '../core/store'
import { EventManager, Events, createEvents, DomEvent } from '../core/events'

const DOM_EVENTS = {
  onClick: ['click', false],
  onContextMenu: ['contextmenu', false],
  onDoubleClick: ['dblclick', false],
  onWheel: ['wheel', true],
  onPointerDown: ['pointerdown', true],
  onPointerUp: ['pointerup', true],
  onPointerLeave: ['pointerleave', true],
  onPointerMove: ['pointermove', true],
  onPointerCancel: ['pointercancel', true],
  onLostPointerCapture: ['lostpointercapture', true],
} as const

function buildHandlers(handlePointer: (name: string) => EventListener): Events {
  return {
    onClick: handlePointer('onClick'),
    onContextMenu: handlePointer('onContextMenu'),
    onDoubleClick: handlePointer('onDoubleClick'),
    onWheel: handlePointer('onWheel'),
    onPointerDown: handlePointer('onPointerDown'),
    onPointerUp: handlePointer('onPointerUp'),
    onPointerLeave: handlePointer('onPointerLeave'),
    onPointerMove: handlePointer('onPointerMove'),
    onPointerCancel: handlePointer('onPointerCancel'),
    onLostPointerCapture: handlePointer('onLostPointerCapture'),
  }
}

/** Default V3F event manager for web */
export function createPointerEvents(store: RootStore): EventManager<HTMLElement> {
  const { handlePointer } = createEvents(store)

  return {
    priority: 1,
    enabled: true,
    compute(event: DomEvent, state: RootState, previous?: RootState) {
      // https://github.com/pmndrs/vue-three-fiber/pull/782
      // Events trigger outside of canvas when moved, use offsetX/Y by default and allow overrides
      state.pointer.set((event.offsetX / state.size.width) * 2 - 1, -(event.offsetY / state.size.height) * 2 + 1)
      state.raycaster.setFromCamera(state.pointer, state.camera)
    },

    connected: undefined,
    handlers: buildHandlers(handlePointer),
    update: () => {
      const { events, internal } = store.getState()
      if (internal.lastEvent?.current && events.handlers) events.handlers.onPointerMove(internal.lastEvent.current)
    },
    connect: (target: HTMLElement) => {
      const { set, events } = store.getState()
      events.disconnect?.()
      set((state) => ({ events: { ...state.events, connected: target } }))
      if (events.handlers) {
        for (const name in events.handlers) {
          const event = events.handlers[name as keyof typeof events.handlers]
          const [eventName, passive] = DOM_EVENTS[name as keyof typeof DOM_EVENTS]
          target.addEventListener(eventName, event, { passive })
        }
      }
    },
    disconnect: () => {
      const { set, events } = store.getState()
      if (events.connected) {
        if (events.handlers) {
          for (const name in events.handlers) {
            const event = events.handlers[name as keyof typeof events.handlers]
            const [eventName] = DOM_EVENTS[name as keyof typeof DOM_EVENTS]
            events.connected.removeEventListener(eventName, event)
          }
        }
        set((state) => ({ events: { ...state.events, connected: undefined } }))
      }
    },
  }
}
