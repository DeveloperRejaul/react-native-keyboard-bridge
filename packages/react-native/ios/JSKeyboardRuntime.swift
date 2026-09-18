import JavaScriptCore

/// Hosts the embedded `JSContext` that runs the compiled `KeyboardApp` bundle (see
/// docs/adr/ADR-005). `JavaScriptCore` is a system framework — always present on iOS, no extra
/// binary size — evaluating a small hand-written runtime prelude plus one compiled component
/// bundle, nowhere near the full React Native/Hermes/Fabric stack ADR-001 originally ruled out.
///
/// Owns no rendering/text-editing logic itself (see AGENTS.md Swift conventions): it only wires
/// JS <-> native calls. `onRender` receives the freshly (re-)rendered element tree as a
/// `JSValue` every time the component mounts or a `useState` setter changes something — the
/// caller (`KeyboardViewController`) is responsible for turning that into UIKit views via
/// `DynamicViewRenderer`.
final class JSKeyboardRuntime {
    private let context: JSContext

    init?(
        preludeSource: String,
        appBundleSource: String,
        onRender: @escaping (JSValue) -> Void,
        onCommitText: @escaping (String) -> Void,
        onDeleteSurroundingText: @escaping (Int, Int) -> Void,
        onGetTextBeforeCursor: @escaping (Int) -> String,
        onGetTextAfterCursor: @escaping (Int) -> String,
        onGetSelectedText: @escaping () -> String,
        onSwitchInputMethod: @escaping () -> Void,
        onPerformHapticFeedback: @escaping () -> Void,
        onPlayClickSound: @escaping () -> Void,
        onGetCursorCapsMode: @escaping (Int) -> Int
    ) {
        guard let context = JSContext() else { return nil }
        self.context = context

        context.exceptionHandler = { _, exception in
            // A keyboard extension has no console — surface JS errors the same way a crash
            // would otherwise be silent.
            NSLog("[CustomKeyboard] JS error: %@", exception?.toString() ?? "unknown")
        }

        context.setObject(
            { (tree: JSValue) in onRender(tree) } as @convention(block) (JSValue) -> Void,
            forKeyedSubscript: "__nativeRender" as NSString
        )
        context.setObject(
            { (text: String) in onCommitText(text) } as @convention(block) (String) -> Void,
            forKeyedSubscript: "__nativeCommitText" as NSString
        )
        context.setObject(
            { (before: Int, after: Int) in onDeleteSurroundingText(before, after) } as @convention(block) (Int, Int) -> Void,
            forKeyedSubscript: "__nativeDeleteSurroundingText" as NSString
        )
        // -- Bridge-parity functions (see mini-react-runtime.js's header comment and
        // docs/api.md's parity table) — the subset of packages/react-native/src/bridge.ts's
        // functions that have a real UITextDocumentProxy/UIInputViewController equivalent. --
        context.setObject(
            { (length: Int) in onGetTextBeforeCursor(length) } as @convention(block) (Int) -> String,
            forKeyedSubscript: "__nativeGetTextBeforeCursor" as NSString
        )
        context.setObject(
            { (length: Int) in onGetTextAfterCursor(length) } as @convention(block) (Int) -> String,
            forKeyedSubscript: "__nativeGetTextAfterCursor" as NSString
        )
        context.setObject(
            { () in onGetSelectedText() } as @convention(block) () -> String,
            forKeyedSubscript: "__nativeGetSelectedText" as NSString
        )
        context.setObject(
            { () in onSwitchInputMethod() } as @convention(block) () -> Void,
            forKeyedSubscript: "__nativeSwitchInputMethod" as NSString
        )
        context.setObject(
            { () in onPerformHapticFeedback() } as @convention(block) () -> Void,
            forKeyedSubscript: "__nativePerformHapticFeedback" as NSString
        )
        context.setObject(
            { () in onPlayClickSound() } as @convention(block) () -> Void,
            forKeyedSubscript: "__nativePlayClickSound" as NSString
        )
        context.setObject(
            { (reqModes: Int) in onGetCursorCapsMode(reqModes) } as @convention(block) (Int) -> Int,
            forKeyedSubscript: "__nativeGetCursorCapsMode" as NSString
        )

        context.evaluateScript(preludeSource)
        context.evaluateScript(appBundleSource)
    }
}
