# ADR-002: Android IME renders React Native live

## Status
Accepted

## Context
Android's `InputMethodService` does not impose the kind of hard memory
ceiling Apple places on iOS Custom Keyboard Extensions (see ADR-001).
Hosting a full RN runtime inside an IME process is a well-established
pattern and does not carry the same system-wide-crash risk.

## Decision
`CustomKeyboardService` (extends `InputMethodService`) mounts a
`ReactRootView` directly inside `onCreateInputView()` and runs the
developer's keyboard JSX as real, live React Native — the same JS bundle
used elsewhere, no build-time compilation step required.
`KeyboardBridgeModule` exposes `InputConnection` methods (`commitText`,
`deleteSurroundingText`, `setSelection`, `getTextBeforeCursor`) to JS as a
NativeModule.

## Consequences
- Android is the faster path to an end-to-end proof of concept and should be
  built before the iOS compiled-schema path (see AGENTS.md Section 2:
  "do not skip ahead to Phase 5 before Phase 2-3").
- Because Android renders live RN while iOS renders a compiled schema,
  `packages/core` must stay the single source of truth for layout, gesture,
  and prediction logic, with cross-platform golden tests to catch behavioral
  divergence early.
- This is not to be unified with iOS's approach ("just also compile Android
  to a schema") without a maintainer decision — the two platforms are
  allowed to diverge in rendering strategy by design.
