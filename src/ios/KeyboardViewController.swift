import UIKit

/// iOS Custom Keyboard Extension entry point. Runs the *same* hand-written
/// `example/src/keyboard/KeyboardApp.tsx` Android's live `ReactHost` renders — real React Native
/// (Hermes + JSI + Fabric, via `RNKeyboardBootstrap`), the same New Architecture stack Android
/// uses, not a build-time-compiled subset. See docs/adr/ADR-008 (supersedes ADR-005's
/// JavaScriptCore mini-runtime, itself supersedes ADR-001/ADR-004's static schema approach).
final class KeyboardViewController: UIInputViewController, UIInputViewAudioFeedback {
    /// Lets `KeyboardBridgeModule` (a plain React Native native module, with no view of its own)
    /// reach `textDocumentProxy` — only the active `UIInputViewController` instance has one.
    static weak var current: KeyboardViewController?

    private var bootstrap: RNKeyboardBootstrap?
    private var renderedView: UIView?
    private var nextKeyboardButton: UIButton?

    /// Required by `UIInputViewAudioFeedback` for `UIDevice.playInputClick()` to actually make a
    /// sound — Apple's own custom-keyboard guidance conforms the input view controller itself to
    /// this protocol, exactly as here (no custom `UIInputView` subclass needed).
    var enableInputClicksWhenVisible: Bool { true }

    override func viewDidLoad() {
        super.viewDidLoad()
        Self.current = self
        setUpKeyboardHeight()
        setUpNextKeyboardButtonIfNeeded()
        loadKeyboardApp()
    }

    /// A `UIInputViewController`'s `view` has no inherent height — nothing in UIKit tells it how
    /// tall a custom keyboard should be, unlike a normal screen filling its window. Without this,
    /// the rendered subtree's four-edge-pinned constraints still resolve to a valid *width* but a
    /// height of exactly 0 (found via the ADR-007 spike's diagnostic logging — a real bug that
    /// predates this file's ADR-008 rewrite, see ADR-005's "Consequences"). 216pt matches Apple's
    /// own system-keyboard-template default.
    private func setUpKeyboardHeight() {
        let heightConstraint = view.heightAnchor.constraint(equalToConstant: 216)
        heightConstraint.priority = .required
        heightConstraint.isActive = true
    }

    private func loadKeyboardApp() {
        let bootstrap = RNKeyboardBootstrap()
        self.bootstrap = bootstrap
        let rendered = bootstrap.makeKeyboardView()
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
