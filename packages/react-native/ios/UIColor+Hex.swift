import UIKit

extension UIColor {
    /// Parses a `"#rrggbb"` or `"#rgb"` hex string (as used by `KeyStyleOverride`/`KeyboardTheme`
    /// in packages/core). Returns `nil` for anything else, so callers can fall back to their own
    /// default rather than silently rendering black.
    convenience init?(hex: String) {
        var value = hex
        if value.hasPrefix("#") {
            value.removeFirst()
        }
        let expanded: String
        switch value.count {
        case 3:
            expanded = value.map { "\($0)\($0)" }.joined()
        case 6:
            expanded = value
        default:
            return nil
        }
        guard let rgb = UInt32(expanded, radix: 16) else { return nil }
        let r = CGFloat((rgb >> 16) & 0xFF) / 255
        let g = CGFloat((rgb >> 8) & 0xFF) / 255
        let b = CGFloat(rgb & 0xFF) / 255
        self.init(red: r, green: g, blue: b, alpha: 1)
    }
}
