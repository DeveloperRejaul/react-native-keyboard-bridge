import Foundation
import UIKit

/// Runs in the host app's own process (see `KeyboardSettingsModule.m`'s `RCT_EXTERN_MODULE`
/// wiring into the app target) — unlike the rest of `packages/ios/Sources`, which only runs
/// inside the keyboard extension's own process. Exposes what iOS actually allows a containing
/// app to do about its own keyboard extension, which is much less than Android allows (see
/// docs/api.md's "Native modules > iOS" section):
///
/// - Enabling the keyboard: iOS has no API to enable an extension programmatically, or even to
///   deep-link straight to Settings > General > Keyboard > Keyboards — only to this app's own
///   Settings page, from which the user still navigates the rest of the way themselves.
/// - Switching keyboards: there is no host-app-facing equivalent of Android's
///   `showInputMethodPicker()` at all. Switching only happens from *inside* the keyboard
///   extension itself, via the system's globe key (see `KeyboardViewController`'s
///   `handleInputModeList(from:with:)` button).
/// - Checking enabled/selected state: iOS exposes no public API for a containing app to query
///   either, so `isKeyboardEnabled`/`isKeyboardSelected` (Android-only) are simply absent here —
///   the shared JS wrapper already resolves a safe default when this native module doesn't
///   implement them.
@objc(KeyboardSettings)
final class KeyboardSettingsModule: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { false }

  /// Opens this app's own Settings page — the closest iOS allows a containing app to get to
  /// enabling its keyboard extension. The user still has to tap through to General > Keyboard >
  /// Keyboards > Add New Keyboard themselves.
  @objc(openInputMethodSettings)
  func openInputMethodSettings() {
    DispatchQueue.main.async {
      guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
      UIApplication.shared.open(url)
    }
  }
}
