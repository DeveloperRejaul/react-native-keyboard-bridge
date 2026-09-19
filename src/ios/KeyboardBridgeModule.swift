import React
import UIKit

/// The iOS counterpart to `android/`'s `KeyboardBridgeModule.kt` — exposes
/// `textDocumentProxy`/`UIInputViewController` operations to JS as `NativeModules.KeyboardBridge`,
/// so `packages/react-native/src/bridge.ts`'s functions work for real here instead of being
/// no-ops (see ADR-008, which replaced the ADR-005 mini-runtime with full React Native). Runs
/// inside the keyboard extension's own process — reaches the active `KeyboardViewController` via
/// its `current` weak reference (a plain bridge module has no view of its own; `textDocumentProxy`
/// only exists on the actual `UIInputViewController` instance).
///
/// Legacy-style `RCTEventEmitter` subclass (not a TurboModule) — auto-registers via Objective-C
/// runtime class scanning the moment it's linked into a target, unlike Android's explicit
/// `ReactPackage` list. `RCTEventEmitter` (not plain `NSObject`) so `NativeEventEmitter`'s
/// `addListener`/`removeListeners` calls from `onEditorInfoChange`/`onSelectionChange` don't warn,
/// even though this module doesn't emit any events yet (`supportedEvents` is empty — see below).
@objc(KeyboardBridge)
final class KeyboardBridgeModule: RCTEventEmitter {
    override static func requiresMainQueueSetup() -> Bool { true }

    override func supportedEvents() -> [String]! {
        // onEditorInfoChange/onSelectionChange (bridge.ts) have no iOS-side emitter yet — see
        // docs/api.md's parity table. Declared empty (not omitted) so RCTEventEmitter doesn't
        // warn about undeclared events if that's ever wired up incompletely.
        []
    }

    private var proxy: UITextDocumentProxy? { KeyboardViewController.current?.textDocumentProxy }

    // -- Text editing (Android + iOS — see docs/api.md's bridge-function parity table) --------

    @objc func commitText(_ text: String) {
        proxy?.insertText(text)
    }

    @objc func deleteSurroundingText(_ before: NSNumber, after: NSNumber) {
        guard let proxy else { return }
        for _ in 0..<max(before.intValue, 0) { proxy.deleteBackward() }
        if after.intValue > 0 {
            NSLog("[CustomKeyboard] deleteSurroundingText after-cursor deletion isn't supported on iOS.")
        }
    }

    @objc func getTextBeforeCursor(_ length: NSNumber, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        let text = proxy?.documentContextBeforeInput ?? ""
        resolve(String(text.suffix(max(length.intValue, 0))))
    }

    @objc func getTextAfterCursor(_ length: NSNumber, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        let text = proxy?.documentContextAfterInput ?? ""
        resolve(String(text.prefix(max(length.intValue, 0))))
    }

    @objc func getSelectedText(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        resolve(proxy?.selectedText ?? "")
    }

    @objc func getCursorCapsMode(_ reqModes: NSNumber, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        resolve(computeCursorCapsMode(reqModes: reqModes.intValue))
    }

    /// Heuristic approximation of Android's `TextUtils.getCapsMode`, using only what
    /// `UITextDocumentProxy` exposes (`documentContextBeforeInput`) — see `getCursorCapsMode`'s
    /// doc comment in the (removed) mini-runtime's prelude for the exact rules and their
    /// rationale; unchanged carrying it over to this native module.
    private func computeCursorCapsMode(reqModes: Int) -> Int {
        let charactersFlag = 1 << 0
        let wordsFlag = 1 << 1
        let sentencesFlag = 1 << 2

        let before = proxy?.documentContextBeforeInput ?? ""
        var result = 0

        if reqModes & charactersFlag != 0 {
            result |= charactersFlag
        }
        if reqModes & wordsFlag != 0, before.isEmpty || before.hasSuffix(" ") || before.hasSuffix("\n") {
            result |= wordsFlag
        }
        if reqModes & sentencesFlag != 0 {
            let trimmed = before.reversed().drop(while: { $0 == " " || $0 == "\t" || $0 == "\n" })
            let atSentenceStart = before.isEmpty || trimmed.first.map { ".!?".contains($0) } ?? true
            if atSentenceStart {
                result |= sentencesFlag
            }
        }
        return result
    }

    // -- IME switching (Android + iOS) ---------------------------------------------------------

    @objc func switchToPreviousInputMethod() {
        KeyboardViewController.current?.advanceToNextInputMode()
    }

    @objc func switchToNextInputMethod() {
        KeyboardViewController.current?.advanceToNextInputMode()
    }

    // -- Feedback (Android + iOS) ---------------------------------------------------------------

    @objc func performHapticFeedback() {
        // No-ops unless the user has granted this extension "Allow Full Access" — an
        // Apple-imposed restriction on keyboard extensions, not a bug here.
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    @objc func playClickSound(_ effect: String) {
        UIDevice.current.playInputClick()
    }

    // -- Android only: no iOS UITextDocumentProxy/UIInputViewController equivalent exists for any
    // of these (see docs/api.md's bridge-function parity table for why, function by function).
    // Safe no-ops/resolved defaults — matching bridge.ts's own convention when its native module
    // isn't available at all — not omitted, so a shared KeyboardApp.tsx never hits a bare
    // "native module method does not exist" error. ------------------------------------------

    @objc func setSelection(_ start: NSNumber, end: NSNumber) {}

    @objc func getExtractedText(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        resolve(nil)
    }

    @objc func sendKeyEvent(_ keyCode: NSNumber) {}

    @objc func performEditorAction(_ actionCode: NSNumber) {}

    @objc func setComposingText(_ text: String, newCursorPosition: NSNumber) {}

    @objc func setComposingRegion(_ start: NSNumber, end: NSNumber) {}

    @objc func finishComposingText() {}

    @objc func beginBatchEdit() {}

    @objc func endBatchEdit() {}

    @objc func hideKeyboard() {}

    @objc func getCurrentEditorInfo(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        resolve(nil)
    }
}
