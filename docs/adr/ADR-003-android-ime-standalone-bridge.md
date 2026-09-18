# ADR-003: The Android IME hosts its own standalone New-Architecture ReactHost

## Status
Accepted (revised — see "What we tried first" below)

## Context
React Native's current app template (as of RN 0.87, used by `example/`) bootstraps
the app's Activity UI through `ReactHost`/`DefaultReactHost` — the bridgeless,
Fabric-based runtime (`MainApplication.kt` exposes `reactHost`, not
`reactNativeHost`; `ReactApplication.reactNativeHost` is deprecated and throws
by default).

### What we tried first (and why it doesn't work)
The project plan's original Android sketch uses the classic bridge
(`ReactInstanceManager` + `ReactRootView.startReactApplication`), and
`ReactInstanceManagerBuilder.setRequireActivity(false)` looks purpose-built for
exactly this non-Activity case. We implemented it, built it successfully, and
it crashed on-device on first boot:

```
java.lang.UnsupportedOperationException: ReactInstanceManager.createReactContext is unsupported.
  at com.facebook.react.ReactInstanceManager.<init>(ReactInstanceManager.java:292)
```

Reading the RN source directly: this is not a bug, it's deliberate. The
constructor unconditionally throws, with the comment "Legacy architecture of
React Native is deprecated and can't be initialized anymore." We bisected
released tags and confirmed RN 0.81.0 still has a working constructor; 0.82.0
onward always throws. There is no build flag that restores it — the classic
bridge is dead code kept only for source compatibility.

### The validated replacement
Reading `com.facebook.react.runtime.ReactSurfaceView`/`ReactSurfaceImpl`
(RN 0.87.1 source) directly shows neither class references `Activity`
anywhere — `ReactSurfaceView` extends `ReactRootView` and is constructed with
just a `Context`. `ReactHost.createSurface(context, moduleName, initialProps)`
returns a `ReactSurface` whose `.view` is a plain `ViewGroup`. All
`ReactHost` lifecycle methods (`onHostResume`, `onHostPause`, `onHostDestroy`)
take a nullable `Activity?`, mirroring the classic bridge's own nullable-
Activity support. This is a real, if `@UnstableReactNativeAPI`-annotated,
supported path — not a hack.

## Decision
`CustomKeyboardService` builds and owns its own `ReactHost` — a direct
`ReactHostImpl` construction (`DefaultReactHostDelegate` +
`DefaultTurboModuleManagerDelegate.Builder` + `DefaultComponentsRegistry`),
**not** the `DefaultReactHost.getDefaultReactHost(...)` helper, because that
helper caches into a process-wide singleton (`private var reactHost: ReactHost?`
scoped to the `DefaultReactHost` Kotlin object) shared by *any* caller in the
process. Using it from the service would race with `MainApplication`'s own
`reactHost` for that same slot — whichever runs first wins, silently. Building
`ReactHostImpl` directly keeps the service's `ReactHost` completely
independent of the app's Activity-hosted one: no shared package list, no
shared instance, no load-order coupling. The two share only process-level
native library loading (SoLoader).

## Consequences
- `packages/android`'s `KeyboardBridgeModule` stays a plain
  `ReactContextBaseJavaModule`/`ReactPackage` — no Codegen/TurboModule spec
  needed, since `DefaultTurboModuleManagerDelegate` includes the interop layer
  that bridges legacy-style modules into the new architecture.
- The classes used here (`ReactHostImpl`, `ReactSurfaceImpl`,
  `DefaultReactHostDelegate`, `DefaultComponentsRegistry`) are marked
  `@UnstableReactNativeAPI`/`@FrameworkAPI` by Meta — they compile and work
  today (verified on-device, see below) but are more likely to change across
  RN versions than stable public API. Pin the RN version when upgrading and
  re-verify this file.
- `packages/android/build.gradle` depends on `com.facebook.react:react-android`
  directly and is wired into `example/android` via an explicit
  `settings.gradle` project include (`:customkeyboard-android`), not RN
  autolinking — it is a first-party in-repo module, not an npm dependency of
  `example`.
- Verified end-to-end on an Android emulator (API level per `Resizable_Experimental`
  AVD): IME installs, appears in the system IME picker, can be enabled/selected
  via `adb shell ime enable/set`, and `onCreateInputView()` returns a live
  Fabric-rendered surface without crashing.
