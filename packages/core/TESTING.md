# Testing — Gap-to-Proof Map

Internal reference mapping each behavioral claim to the test that proves it.
This is not part of the public docs.

## Divergence Coverage

| Behavior                                       | Test Name                                                         | File              |
| ---------------------------------------------- | ----------------------------------------------------------------- | ----------------- |
| Refs: instanceof works via proxy               | "should forward ref three object"                                 | renderer.test.tsx |
| Refs: identity requires .object                | "should handle the object prop reactively"                        | renderer.test.tsx |
| Suspense: visibility stays true                | "should toggle visibility during Suspense non-destructively"      | renderer.test.tsx |
| Suspense: old content stays during re-entrance | "should handle Suspense lifecycle with async primitives" (Step 3) | renderer.test.tsx |
| flushSync: synchronous scene update            | "should update scene synchronously with flushSync"                | renderer.test.tsx |
| flushSync: nested component flush              | "should flush nested component updates synchronously"             | renderer.test.tsx |
| flushSync: no double-run after flush           | "should not double-run effects after flushSync"                   | renderer.test.tsx |
| flushSync: multi-root flush                    | "should flush multiple roots"                                     | renderer.test.tsx |
| flushSync: returns void                        | "should return void, not Promise"                                 | renderer.test.tsx |

## Vue-Native API Coverage

| Behavior                                 | Test Name                                                         | File              |
| ---------------------------------------- | ----------------------------------------------------------------- | ----------------- |
| useObjectRef: direct object access       | "should provide direct object access"                             | renderer.test.tsx |
| useObjectRef: reconstruction handling    | "should handle reconstruction"                                    | renderer.test.tsx |
| useObjectRef: mounted state tracking     | "should track mounted state"                                      | renderer.test.tsx |
| Canvas: overlay slot renders DOM sibling | "should render overlay slot in DOM sibling of canvas"             | renderer.test.tsx |
| Canvas: no overlay div when slot absent  | "should not render overlay div when slot is absent"               | renderer.test.tsx |
| Canvas: error slot with retry            | "should render error slot with error and retry props"             | renderer.test.tsx |
| Canvas: default error display            | "should show default error display when no error slot provided"   | renderer.test.tsx |
| watchInvalidate: invalidates on change   | "should invalidate on reactive source change"                     | renderer.test.tsx |
| useAfterRender: callback + cleanup       | "useAfterRender should call callback after render and cleanup"    | renderer.test.tsx |
| useNextFrame: resolves after frame       | "useNextFrame should resolve after a rendered frame"              | renderer.test.tsx |
| useRenderCommit: waits for flush + frame | "useRenderCommit should wait for Vue flush and scene application" | renderer.test.tsx |
