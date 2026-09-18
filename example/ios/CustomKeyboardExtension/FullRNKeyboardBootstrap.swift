import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

/// EXPERIMENTAL — full React Native (Hermes + JSI + Fabric) inside the keyboard extension,
/// requested explicitly by the maintainer despite ADR-001/ADR-005's rejection of this approach
/// (see docs/adr/ADR-007 once conclusions are in). NOT the production path — `KeyboardViewController`
/// still defaults to the JavaScriptCore mini-runtime; this is wired in separately to compare.
///
/// Mirrors `CustomKeyboardExample/AppDelegate.swift`'s bootstrap, but deliberately avoids ever
/// creating a `UIWindow` — `RCTReactNativeFactory.startReactNative(withModuleName:in:launchOptions:)`
/// requires one, which doesn't exist in an app extension's process. `RCTRootViewFactory` (exposed
/// via `factory.rootViewFactory`) has a lower-level `view(withModuleName:)` that returns a plain
/// `UIView` directly — the same shape of primitive Android's `ReactHostImpl.createSurface(...)`
/// gives `CustomKeyboardService.kt` (see packages/react-native/android's CustomKeyboardService.kt).
final class FullRNKeyboardBootstrap {
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

    /// Deliberately release-style (a committed `main.jsbundle`, no Metro dev-server URL) even in
    /// DEBUG builds — fetching from `localhost:8081` would also require the user to grant this
    /// keyboard extension "Allow Full Access" (extensions have no network access without it),
    /// which can't be automated in this sandboxed environment. Using a bundled file sidesteps
    /// that entirely, isolating this experiment to one question: can Fabric/Hermes mount inside
    /// an extension's process at all.
    override func bundleURL() -> URL? {
        Bundle(for: KeyboardReactNativeDelegate.self).url(forResource: "main", withExtension: "jsbundle")
    }
}
