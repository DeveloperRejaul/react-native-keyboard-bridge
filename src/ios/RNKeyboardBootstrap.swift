import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

/// Boots real React Native — Hermes + JSI + Fabric, the same New Architecture stack Android's
/// `CustomKeyboardService` hosts — inside the keyboard extension process. See docs/adr/ADR-008,
/// which replaced ADR-005's JavaScriptCore mini-runtime after this was proven to work (ADR-007's
/// spike): both platforms now render the *same* live `KeyboardApp.tsx`, no build-time compiler
/// needed, matching Android's live-render approach exactly instead of a separate iOS-only path.
///
/// Mirrors `CustomKeyboardExample/AppDelegate.swift`'s bootstrap, but deliberately avoids ever
/// creating a `UIWindow` — `RCTReactNativeFactory.startReactNative(withModuleName:in:launchOptions:)`
/// requires one, which doesn't exist in an app extension's process. `RCTRootViewFactory` (exposed
/// via `factory.rootViewFactory`) has a lower-level `view(withModuleName:)` that returns a plain
/// `UIView` directly — the same shape of primitive Android's `ReactHostImpl.createSurface(...)`
/// gives `CustomKeyboardService.kt` (see this package's `android/`).
final class RNKeyboardBootstrap {
    private let delegate: KeyboardReactNativeDelegate
    private let factory: RCTReactNativeFactory

    init() {
        let delegate = KeyboardReactNativeDelegate()
        let factory = RCTReactNativeFactory(delegate: delegate)
        delegate.dependencyProvider = RCTAppDependencyProvider()
        self.delegate = delegate
        self.factory = factory
    }

    /// Requests the "KeyboardApp" surface from the same JS bundle the host app's own AppRegistry
    /// registers it in (see example/index.js) — same one-bundle-many-components pattern Android
    /// already uses (`assets://index.android.bundle`, component name "KeyboardApp").
    func makeKeyboardView() -> UIView {
        factory.rootViewFactory.view(withModuleName: "KeyboardApp")
    }
}

final class KeyboardReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
    override func sourceURL(for bridge: RCTBridge) -> URL? {
        self.bundleURL()
    }

    /// DEBUG builds connect straight to Metro (real Fast Refresh, same dev loop as any RN app) —
    /// RELEASE always uses the committed `main.jsbundle`, matching Android's release behavior. See
    /// docs/adr/ADR-009: this requires "Allow Full Access" granted for the keyboard (extensions have
    /// no network access without it) and `NSExtensionAttributes > RequestsOpenAccess` set to `true`
    /// in the extension's Info.plist while developing — flip both back off before shipping. If Metro
    /// isn't running, this fails the same way any debug RN app does when the packager is down.
    override func bundleURL() -> URL? {
        #if DEBUG
        RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
        #else
        Bundle(for: KeyboardReactNativeDelegate.self).url(forResource: "main", withExtension: "jsbundle")
        #endif
    }
}
