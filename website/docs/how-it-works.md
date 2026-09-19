---
sidebar_position: 5
---

# How it works

| | Android | iOS |
|---|---|---|
| Runtime | Real React Native (New Architecture, `ReactHost`) hosted inside the IME process | Real React Native (New Architecture, `RCTReactNativeFactory`) hosted inside the extension process |
| Your component | Runs live, unmodified | Runs live, unmodified |
| Rendering | Fabric, same as any RN screen | Fabric, same as any RN screen |
| Text editing | `InputConnection`, via a native bridge module (`KeyboardBridgeModule.kt`) | `UITextDocumentProxy`, via a native bridge module (`KeyboardBridgeModule.swift`) |

Not every bridge function has an equivalent on both platforms — iOS's keyboard extension API
surface is smaller than Android's. See the [bridge function parity table](./api/bridge-functions)
for exactly which functions are fully supported, approximated, or Android-only (calling an
Android-only function on iOS is a safe no-op, never a crash).

## Status

Verified on real tooling, not just compiled:

- **Core gesture/prediction engine**: Jest (`yarn test`).
- **Android**: boots as live React Native (New Architecture `ReactHost`) and commits real text
  through `InputConnection`, verified on an emulator; the IME's manifest entry and native-module
  registration verified to merge in automatically via a clean Gradle build with zero manual wiring
  in the consuming app.
- **iOS**: the Custom Keyboard Extension builds and boots real React Native (Hermes + JSI +
  Fabric) — verified with a real Simulator run: the JS runtime thread reaches a normal idle steady
  state (checked via `lldb`), the hand-written component renders on screen, and typed keys commit
  real text through `textDocumentProxy` (screenshots + log inspection).
- **The one-command `setup-ios`/`build-keyboard` CLI** verified against a real consumer app,
  driven exactly the way an external project would use it.

### Known gaps

- No XCTest coverage yet for iOS's `RNKeyboardBootstrap`/`KeyboardBridgeModule` themselves.
- No real-device memory verification for iOS yet — Simulator doesn't enforce Apple's actual
  extension memory ceiling, so this is the one open risk from moving iOS to full React Native.
  Test on a real device before shipping to production.
