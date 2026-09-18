import JavaScriptCore
import UIKit

/// Flattened style data read from a JS `style` prop — either a single plain object or an array
/// of them (with `false`/`null`/`undefined` entries, from things like `shift && styles.active`,
/// simply skipped — same semantics real RN's style-array flattening uses). Only the subset of
/// flexbox/box-model properties `example/src/keyboard/KeyboardApp.tsx` actually uses is
/// implemented (see docs/adr/ADR-005) — this is deliberately not a general layout engine.
struct FlatStyle {
    var backgroundColor: UIColor?
    var textColor: UIColor?
    var borderRadius: CGFloat = 0
    var fontSize: CGFloat = 16
    var isRow = false
    var flexGrow: CGFloat = 1
    var height: CGFloat?
    var marginHorizontal: CGFloat = 0
    var marginVertical: CGFloat = 0
    var paddingVertical: CGFloat = 0

    init() {}

    init(jsValue: JSValue?) {
        guard let jsValue, !jsValue.isUndefined, !jsValue.isNull else { return }
        if jsValue.isArray {
            let length = Int(jsValue.forProperty("length").toInt32())
            for i in 0..<length {
                apply(jsValue.atIndex(i))
            }
        } else {
            apply(jsValue)
        }
    }

    private mutating func apply(_ value: JSValue?) {
        // Skips `false`/`null`/`undefined` array entries (e.g. `shift && styles.keyActive`
        // when `shift` is false) — only real style objects have anything to merge in.
        guard let value, value.isObject, let dict = value.toDictionary() as? [String: Any] else { return }
        if let hex = dict["backgroundColor"] as? String, let color = UIColor(hex: hex) { backgroundColor = color }
        if let hex = dict["color"] as? String, let color = UIColor(hex: hex) { textColor = color }
        if let n = dict["borderRadius"] as? NSNumber { borderRadius = CGFloat(n.doubleValue) }
        if let n = dict["fontSize"] as? NSNumber { fontSize = CGFloat(n.doubleValue) }
        if let direction = dict["flexDirection"] as? String { isRow = direction == "row" }
        if let n = dict["flex"] as? NSNumber { flexGrow = CGFloat(n.doubleValue) }
        if let n = dict["height"] as? NSNumber { height = CGFloat(n.doubleValue) }
        if let n = dict["marginHorizontal"] as? NSNumber { marginHorizontal = CGFloat(n.doubleValue) }
        if let n = dict["marginVertical"] as? NSNumber { marginVertical = CGFloat(n.doubleValue) }
        if let n = dict["paddingVertical"] as? NSNumber { paddingVertical = CGFloat(n.doubleValue) }
    }
}

/// Renders the plain `{ type, props, children }` element tree `mini-react-runtime.js`'s `__h`
/// produces (see `JSKeyboardRuntime`) into real `UIView`s — the native half of the mini
/// runtime's "reconciler". Deliberately rebuilds the whole subtree on every render rather than
/// diffing (see docs/adr/ADR-005): a keyboard's tree is a few dozen nodes, so this is simple and
/// fast enough, and it exactly matches how the library's earlier schema-based renderer already
/// behaved on every state change.
enum DynamicViewRenderer {
    struct Rendered {
        let view: UIView
        let style: FlatStyle
    }

    static func render(_ node: JSValue) -> Rendered {
        let type = node.forProperty("type").toString() ?? "View"
        let props = node.forProperty("props")
        let style = FlatStyle(jsValue: props?.forProperty("style"))
        let children = childArray(node.forProperty("children"))

        switch type {
        case "Text":
            let label = UILabel()
            label.text = textContent(children)
            label.textColor = style.textColor ?? .label
            label.font = .systemFont(ofSize: style.fontSize)
            label.textAlignment = .center
            return Rendered(view: label, style: style)

        case "TouchableOpacity":
            let onPress = props?.forProperty("onPress")
            let (label, labelStyle) = firstTextContent(children)
            let button = TouchableOpacityButton(
                label: label,
                backgroundColor: style.backgroundColor ?? .secondarySystemBackground,
                textColor: labelStyle.textColor ?? .label,
                cornerRadius: style.borderRadius,
                fontSize: labelStyle.fontSize,
                onPress: {
                    guard let onPress, onPress.isUndefined == false, onPress.isNull == false else { return }
                    onPress.call(withArguments: [])
                }
            )
            if let height = style.height {
                button.heightAnchor.constraint(equalToConstant: height).isActive = true
            }
            return Rendered(view: button, style: style)

        default: // "View"
            let container = UIView()
            let renderedChildren = children.map { render($0) }
            if style.isRow {
                layOutRow(renderedChildren, in: container)
            } else {
                layOutColumn(renderedChildren, in: container, paddingVertical: style.paddingVertical)
            }
            return Rendered(view: container, style: style)
        }
    }

    private static func childArray(_ value: JSValue?) -> [JSValue] {
        guard let value, !value.isUndefined, !value.isNull else { return [] }
        let length = Int(value.forProperty("length").toInt32())
        return (0..<length).map { value.atIndex($0) }
    }

    private static func textContent(_ children: [JSValue]) -> String {
        children.map { $0.toString() ?? "" }.joined()
    }

    /// A `TouchableOpacity`'s label comes from its (expected single) `Text` child — mirroring
    /// how `example/src/keyboard/KeyboardApp.tsx` always nests exactly one `<Text>` inside each
    /// `<TouchableOpacity>`.
    private static func firstTextContent(_ children: [JSValue]) -> (String, FlatStyle) {
        for child in children where child.forProperty("type").toString() == "Text" {
            let style = FlatStyle(jsValue: child.forProperty("props")?.forProperty("style"))
            return (textContent(childArray(child.forProperty("children"))), style)
        }
        return ("", FlatStyle())
    }

    /// Lays out `flexDirection: 'row'` children with widths proportional to each one's own
    /// `flex` share, and gaps from each one's own `marginHorizontal` (mirrors real flexbox: a
    /// child's margin applies on both its own sides, so the gap between two siblings is the sum
    /// of the trailing child's left margin and the leading child's right margin).
    private static func layOutRow(_ children: [Rendered], in container: UIView) {
        guard !children.isEmpty else { return }
        let totalWeight = children.reduce(CGFloat(0)) { $0 + max($1.style.flexGrow, 0.0001) }
        let totalMarginSpace = children.reduce(CGFloat(0)) { $0 + $1.style.marginHorizontal * 2 }

        var previous: Rendered?
        for child in children {
            let view = child.view
            container.addSubview(view)
            view.translatesAutoresizingMaskIntoConstraints = false
            let share = max(child.style.flexGrow, 0.0001) / totalWeight
            NSLayoutConstraint.activate([
                view.topAnchor.constraint(equalTo: container.topAnchor, constant: child.style.marginVertical),
                view.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -child.style.marginVertical),
                view.widthAnchor.constraint(
                    equalTo: container.widthAnchor,
                    multiplier: share,
                    constant: -totalMarginSpace * share
                ),
            ])
            if let previous {
                view.leadingAnchor.constraint(
                    equalTo: previous.view.trailingAnchor,
                    constant: previous.style.marginHorizontal + child.style.marginHorizontal
                ).isActive = true
            } else {
                view.leadingAnchor.constraint(
                    equalTo: container.leadingAnchor, constant: child.style.marginHorizontal
                ).isActive = true
            }
            previous = child
        }
        // No trailing constraint on the last child — its width share + the leading-constraint
        // chain already fully determine the layout (see the schema renderer this replaced).
    }

    /// Stacks default-direction (column) children vertically. Each row's own height falls out
    /// of pinning its children's top/bottom to it (see `layOutRow`) rather than being set here —
    /// there is nothing left to compute at this level besides the container's own
    /// `paddingVertical` inset.
    private static func layOutColumn(_ children: [Rendered], in container: UIView, paddingVertical: CGFloat) {
        guard !children.isEmpty else { return }
        var previous: UIView?
        for child in children {
            let view = child.view
            container.addSubview(view)
            view.translatesAutoresizingMaskIntoConstraints = false
            NSLayoutConstraint.activate([
                view.leadingAnchor.constraint(equalTo: container.leadingAnchor),
                view.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            ])
            if let previous {
                view.topAnchor.constraint(equalTo: previous.bottomAnchor).isActive = true
            } else {
                view.topAnchor.constraint(equalTo: container.topAnchor, constant: paddingVertical).isActive = true
            }
            previous = view
        }
        if let previous {
            previous.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -paddingVertical).isActive = true
        }
    }
}
