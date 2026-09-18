# ADR-004: iOS schema interpreter implementation details

## Status
**Superseded by [ADR-005](ADR-005-ios-mini-js-runtime.md).** `SchemaRenderer`/
`KeyLayoutSchema` and the bundled JSON schemas this ADR describes were
removed; iOS now runs a compiled *component*, not a compiled static schema.
Kept for history — the Xcode-project-scripting and memory-footprint
reasoning below still applies to ADR-005's UIKit renderer.

## Context
ADR-001 established that iOS renders a build-time-compiled JSON schema natively
instead of embedding a live JS runtime. This ADR records the concrete Phase 5
implementation and confirms the approach builds and passes tests on real
tooling (Xcode 26, iOS 26 simulator), not just in theory.

## Decisions

**UIKit, not SwiftUI, for the interpreter.** `SchemaRenderer` builds a plain
`UIStackView`/`UIButton` tree. SwiftUI hosted via `UIHostingController` inside
a keyboard extension is also viable, but UIKit has a smaller, more
predictable memory footprint under Apple's tight extension memory ceiling —
directly serving ADR-001's core constraint. Revisit only if a maintainer
wants SwiftUI's declarative styling badly enough to accept the tradeoff.

**Schema decoding via `Codable` structs mirroring the TS types exactly.**
`SchemaKey`/`SchemaRow`/`KeyLayoutSchema` in `packages/ios/Sources/KeyLayoutSchema.swift`
field-for-field match `Key`/`KeyRow`/`KeyLayout` in `packages/core/src/layouts/types.ts`.
`states` decodes as `[String: [SchemaRow]]` (Swift has no direct equivalent of
a TS type with one required + two optional named keys); `rows(forState:)`
mirrors `getRowsForState`'s fallback-to-default behavior.

**The Xcode project is edited via a script (`packages/ios/setup_xcode_targets.rb`),
not by hand.** `project.pbxproj` is a generated, mergeable-in-theory-but-fragile-
in-practice file; a small idempotent Ruby script using the `xcodeproj` gem
(the same library CocoaPods itself uses) is more reliable and reviewable than
hand-editing it, and can be re-run if the project needs to be regenerated.
The script adds two targets:
- `CustomKeyboardExtension` (`com.apple.product-type.app-extension`), embedded
  into the host app via a Copy Files build phase targeting `PlugIns`.
- `CustomKeyboardExtensionTests` (`com.apple.product-type.bundle.unit-test`),
  a standalone unit test bundle (no `TEST_HOST`) that compiles the same
  pure-logic source files directly rather than `@testable import`-ing the
  extension — app extensions as XCTest hosts are fragile/uncommon; this
  sidesteps that entirely for schema-decoding and rendering logic, which has
  no `UIInputViewController` lifecycle dependency.

**`RequestsOpenAccess` is `false`** in the extension's Info.plist — matches
AGENTS.md's privacy rule (no network access from inside the keyboard without
explicit, separate opt-in); this project doesn't need clipboard/full-access
APIs today.

**Bundled schema JSON is generated directly from `packages/core`'s
`enQwertyLayout`/`bnLayout` objects** (`node -e "...JSON.stringify(enQwertyLayout)..."`
into `packages/ios/Resources/*.json`), not by running the Phase 4 JSX->JSON
compiler. There is a real gap here: the compiler (`compileKeyboardSource`)
expects literal per-key JSX (`<TouchableOpacity onPress={() => onKeyPress(...)}>`),
but the actual reference layouts are still authored as data
(`enQwertyLayout`/`bnLayout` in `packages/core/src/layouts/*.ts`), not as
that literal JSX form — the same gap noted for Android's `KeyboardApp.tsx`.
Closing this (rewriting the reference layouts as compiler-compatible JSX, or
building a small script that runs the compiler and writes its output into
`packages/ios/Resources/`) is Phase 6 ("unify example app") work, not done
here.

## Consequences
- Verified end-to-end on iOS 26 / Xcode 26: `xcodebuild ... -scheme
  CustomKeyboardExtension ... build` succeeds, embeds the `.appex` into the
  host app, and passes `ValidateEmbeddedBinary`. `xcodebuild ... -scheme
  CustomKeyboardExtensionTests ... test` passes all 7 tests (schema decoding,
  state fallback, view-tree shape, tap dispatch).
- Per AGENTS.md, no UI automation was attempted for enabling the keyboard in
  Settings and typing through it live in the simulator — that's explicitly
  called out there as unreliable to automate. Build + unit-test verification
  is the complete, intended test surface for this phase.
- `example/ios` now requires CocoaPods (`bundle exec pod install`) to have
  been run before opening `CustomKeyboardExample.xcworkspace` — always use
  the `.xcworkspace`, not the `.xcodeproj`, from here on.
