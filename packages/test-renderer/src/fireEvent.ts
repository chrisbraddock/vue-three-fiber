import type { RootStore } from '@xperimntl/vue-threejs'

import { toEventHandlerName } from './helpers/strings'

import { VueThreeTestInstance } from './createTestInstance'

import type { Act, MockSyntheticEvent } from './types/public'
import type { MockEventData } from './types/internal'

export const createEventFirer = (act: Act, store: RootStore) => {
  const createSyntheticEvent = (
    element: VueThreeTestInstance,
    eventName: string,
    data: MockEventData,
  ): MockSyntheticEvent => {
    const state = store.getState()
    const target =
      (state.events.connected as EventTarget | undefined) ?? (state.gl.domElement as EventTarget | undefined)
    const object = element.instance
    const defaultX = state.size.width / 2
    const defaultY = state.size.height / 2

    return {
      camera: state.camera,
      stopPropagation: () => {},
      target: {
        setPointerCapture: () => {},
        releasePointerCapture: () => {},
        hasPointerCapture: () => false,
        ...target,
      },
      currentTarget: element,
      sourceEvent: data,
      object,
      eventObject: object,
      pointerId: 1,
      buttons: 1,
      offsetX: defaultX,
      offsetY: defaultY,
      type: eventName,
      ...data,
    }
  }

  const fireEvent = async (
    element: VueThreeTestInstance,
    eventName: string,
    data: MockEventData = {},
  ): Promise<unknown> => {
    const handlerName = eventName.startsWith('on') ? eventName : toEventHandlerName(eventName)
    const handlers = store.getState().events.handlers

    const handler = handlers?.[handlerName as keyof typeof handlers]
    if (!handler) {
      console.warn(
        `Handler for ${eventName} was not found. You must pass event names in camelCase or name of the handler https://github.com/pmndrs/vue-three-fiber/blob/master/packages/test-renderer/markdown/vttr.md#create-fireevent`,
      )
      return
    }

    let returnValue: unknown

    await act(async () => {
      returnValue = (handler as any)(createSyntheticEvent(element, handlerName, data))
    })

    return returnValue
  }

  return fireEvent
}
