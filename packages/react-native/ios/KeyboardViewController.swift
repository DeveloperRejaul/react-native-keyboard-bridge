import JavaScriptCore
import UIKit

/// iOS Custom Keyboard Extension entry point. Runs the *same* hand-written
/// `example/src/keyboard/KeyboardApp.tsx` Android's live `ReactHost` renders — compiled
/// (`packages/core`'s `bundleKeyboardApp`) into plain JS and executed live inside an embedded
/// `JSContext` via `JSKeyboardRuntime`, rendered natively by `DynamicViewRenderer`. See
/// docs/adr/ADR-005 — this supersedes the earlier build-time-JSON-schema approach (ADR-001/
/// ADR-004), which could only express static structure, never `.map()`/state/conditionals.
final class KeyboardViewController: UIInputViewController, UIInputViewAudioFeedback {
    private var runtime: JSKeyboardRuntime?
    private var renderedView: UIView?
    private var nextKeyboardButton: UIButton?

    /// Required by `UIInputViewAudioFeedback` for `UIDevice.playInputClick()` to actually make a
    /// sound — Apple's own custom-keyboard guidance conforms the input view controller itself to
    /// this protocol, exactly as here (no custom `UIInputView` subclass needed).
    var enableInputClicksWhenVisible: Bool { true }

    /// EXPERIMENTAL toggle for the full-RN (Hermes/JSI/Fabric) spike — see
    /// `example/ios/CustomKeyboardExtension/FullRNKeyboardBootstrap.swift` and docs/adr/ADR-007
    /// once conclusions are in. Temporary: this reference only compiles in this repo's own
    /// example (that file isn't shipped in the npm package's ios/ folder) — must be reverted or
    /// reconciled with a real decision before this file is considered done.
    private var fullRNBootstrap: FullRNKeyboardBootstrap?
    private static let useExperimentalFullRN = false

    override func viewDidLoad() {
        super.viewDidLoad()
        setUpKeyboardHeight()
        setUpNextKeyboardButtonIfNeeded()
        if Self.useExperimentalFullRN {
            loadFullRNExperiment()
        } else {
            loadRuntime()
        }
    }

    /// A `UIInputViewController`'s `view` has no inherent height — nothing in UIKit tells it how
    /// tall a custom keyboard should be, unlike a normal screen filling its window. Without this,
    /// every constraint pinning a rendered subtree to `view`'s edges (both this file's real path
    /// and the ADR-007 experiment) still resolves to a valid *width* but a height of exactly 0 —
    /// found via the ADR-007 spike's diagnostic logging, which is what surfaced this. 216pt
    /// matches Apple's own system-keyboard-template default and this project's earlier schema
    /// renderer's assumed height (see the removed `KeyLayoutSchema.swift`, ADR-004).
    private func setUpKeyboardHeight() {
        let heightConstraint = view.heightAnchor.constraint(equalToConstant: 216)
        heightConstraint.priority = .required
        heightConstraint.isActive = true
    }

    private func loadFullRNExperiment() {
        NSLog("[CustomKeyboard] EXPERIMENTAL: bootstrapping full RN (Hermes/JSI/Fabric)")
        let bootstrap = FullRNKeyboardBootstrap()
        fullRNBootstrap = bootstrap
        let rendered = bootstrap.makeKeyboardView()
        view.addSubview(rendered)
        rendered.translatesAutoresizingMaskIntoConstraints = false
        let topInset: CGFloat = nextKeyboardButton != nil ? 34 : 4
        NSLayoutConstraint.activate([
            rendered.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 4),
            rendered.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -4),
            rendered.topAnchor.constraint(equalTo: view.topAnchor, constant: topInset),
            rendered.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -4),
        ])
        renderedView = rendered
        if let nextKeyboardButton {
            view.bringSubviewToFront(nextKeyboardButton)
        }
    }

    private func loadRuntime() {
        let bundle = Bundle(for: Self.self)
        guard
            let preludeURL = bundle.url(forResource: "mini-react-runtime", withExtension: "js"),
            let prelude = try? String(contentsOf: preludeURL, encoding: .utf8),
            let appBundleURL = bundle.url(forResource: "KeyboardApp.compiled", withExtension: "js"),
            let appBundle = try? String(contentsOf: appBundleURL, encoding: .utf8)
        else {
            NSLog("[CustomKeyboard] Missing mini-react-runtime.js or KeyboardApp.compiled.js resource.")
            return
        }

        runtime = JSKeyboardRuntime(
            preludeSource: prelude,
            appBundleSource: appBundle,
            onRender: { [weak self] tree in self?.applyRenderedTree(tree) },
            onCommitText: { [weak self] text in self?.textDocumentProxy.insertText(text) },
            onDeleteSurroundingText: { [weak self] before, after in
                guard let proxy = self?.textDocumentProxy else { return }
                for _ in 0..<max(before, 0) { proxy.deleteBackward() }
                if after > 0 {
                    // UITextDocumentProxy has no after-cursor delete; not used by the reference
                    // KeyboardApp (always calls deleteSurroundingText(_, 0)).
                    NSLog("[CustomKeyboard] deleteSurroundingText after-cursor deletion isn't supported on iOS.")
                }
            },
            onGetTextBeforeCursor: { [weak self] length in
                let text = self?.textDocumentProxy.documentContextBeforeInput ?? ""
                return String(text.suffix(max(length, 0)))
            },
            onGetTextAfterCursor: { [weak self] length in
                let text = self?.textDocumentProxy.documentContextAfterInput ?? ""
                return String(text.prefix(max(length, 0)))
            },
            onGetSelectedText: { [weak self] in
                self?.textDocumentProxy.selectedText ?? ""
            },
            onSwitchInputMethod: { [weak self] in
                self?.advanceToNextInputMode()
            },
            onPerformHapticFeedback: {
                // No-ops unless the user has granted this extension "Allow Full Access" —
                // an Apple-imposed restriction on keyboard extensions, not a bug here.
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
            },
            onPlayClickSound: {
                UIDevice.current.playInputClick()
            },
            onGetCursorCapsMode: { [weak self] reqModes in
                self?.computeCursorCapsMode(reqModes: reqModes) ?? 0
            }
        )
    }

    /// Heuristic approximation of Android's `TextUtils.getCapsMode`, using only what
    /// `UITextDocumentProxy` exposes (`documentContextBeforeInput`) — see `getCursorCapsMode`'s
    /// doc comment in `mini-react-runtime.js` for the exact rules and their rationale.
    private func computeCursorCapsMode(reqModes: Int) -> Int {
        let charactersFlag = 1 << 0
        let wordsFlag = 1 << 1
        let sentencesFlag = 1 << 2

        let before = textDocumentProxy.documentContextBeforeInput ?? ""
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

    private func applyRenderedTree(_ tree: JSValue) {
        renderedView?.removeFromSuperview()
        let rendered = DynamicViewRenderer.render(tree).view
        view.addSubview(rendered)
        rendered.translatesAutoresizingMaskIntoConstraints = false
        // Reserves a top strip for the next-keyboard globe button when present, so it doesn't
        // overlap the component's own first row of keys.
        let topInset: CGFloat = nextKeyboardButton != nil ? 34 : 4
        NSLayoutConstraint.activate([
            rendered.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 4),
            rendered.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -4),
            rendered.topAnchor.constraint(equalTo: view.topAnchor, constant: topInset),
            rendered.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -4),
        ])
        renderedView = rendered
        if let nextKeyboardButton {
            view.bringSubviewToFront(nextKeyboardButton)
        }
    }

    /// The system's own "switch to a different installed keyboard" affordance — tapping cycles
    /// to the next enabled keyboard, long-pressing shows the full picker menu; both behaviors
    /// come for free from `handleInputModeList(from:with:)` (Apple's own custom-keyboard
    /// template wires it exactly this way). `needsInputModeSwitchKey` is false when this is the
    /// only enabled keyboard, so nothing is added in that case — there's nothing to switch to.
    /// This is the iOS-side equivalent of Android's globe key; unlike Android, it can only be
    /// triggered from inside the keyboard extension itself, never from the containing app (see
    /// `KeyboardSettingsModule.swift`).
    private func setUpNextKeyboardButtonIfNeeded() {
        guard needsInputModeSwitchKey else { return }
        let button = UIButton(type: .system)
        button.setTitle("🌐", for: [])
        button.titleLabel?.font = .systemFont(ofSize: 20)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.addTarget(self, action: #selector(handleInputModeList(from:with:)), for: .allTouchEvents)
        view.addSubview(button)
        NSLayoutConstraint.activate([
            button.topAnchor.constraint(equalTo: view.topAnchor, constant: 2),
            button.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 8),
            button.widthAnchor.constraint(equalToConstant: 32),
            button.heightAnchor.constraint(equalToConstant: 28),
        ])
        nextKeyboardButton = button
    }
}
