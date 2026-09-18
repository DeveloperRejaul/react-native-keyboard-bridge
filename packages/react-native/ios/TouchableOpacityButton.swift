import UIKit

/// A rendered `TouchableOpacity` node — pure view, no business logic (see AGENTS.md Swift
/// conventions). Fades on press/release the same way RN's own `TouchableOpacity` does (default
/// `activeOpacity` 0.2), so key presses have the same tactile feedback as Android's live-RN
/// rendering.
final class TouchableOpacityButton: UIButton {
    private let onPress: () -> Void
    private let pressedAlpha: CGFloat
    private let fadeDuration: TimeInterval

    init(
        label: String,
        backgroundColor: UIColor,
        textColor: UIColor,
        cornerRadius: CGFloat,
        fontSize: CGFloat,
        pressedAlpha: CGFloat = 0.2,
        fadeDuration: TimeInterval = 0.1,
        onPress: @escaping () -> Void
    ) {
        self.onPress = onPress
        self.pressedAlpha = pressedAlpha
        self.fadeDuration = fadeDuration
        super.init(frame: .zero)
        setTitle(label, for: .normal)
        setTitleColor(textColor, for: .normal)
        titleLabel?.font = .systemFont(ofSize: fontSize)
        self.backgroundColor = backgroundColor
        layer.cornerRadius = cornerRadius

        addAction(UIAction { [weak self] _ in self?.onPress() }, for: .touchUpInside)
        addAction(UIAction { [weak self] _ in self?.setPressed(true) }, for: .touchDown)
        addAction(UIAction { [weak self] _ in self?.setPressed(true) }, for: .touchDragEnter)
        for event: UIControl.Event in [.touchUpInside, .touchUpOutside, .touchDragExit, .touchCancel] {
            addAction(UIAction { [weak self] _ in self?.setPressed(false) }, for: event)
        }
    }

    private func setPressed(_ pressed: Bool) {
        UIView.animate(withDuration: fadeDuration) {
            self.alpha = pressed ? self.pressedAlpha : 1.0
        }
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}
