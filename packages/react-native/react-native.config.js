// Lets a consumer app's own autolinking (`PackageList(this).packages`) automatically instantiate
// `KeyboardSettingsPackage` on the app's own ReactHost — see docs/api.md's "Native modules >
// Android" section. `KeyboardBridgePackage` is deliberately NOT autolinked this way: it must only
// ever run inside `CustomKeyboardService`'s own standalone ReactHost (the IME process), which
// `CustomKeyboardService.kt` already constructs itself — autolinking it onto the host app's
// ReactHost too would be wrong (there's no keyboard InputConnection context there). Autolinking
// only supports one auto-instantiated package per dependency, which is why this one config
// entry — not a Kotlin file a consumer edits — is what makes Android need zero manual native
// wiring beyond the AndroidManifest.xml `<service>` entry (which merges in automatically from
// this package's own android/src/main/AndroidManifest.xml) and each app's own keyboard branding
// (res/xml/method.xml, res/values/strings.xml's `keyboard_service_label` — see AGENTS.md).
module.exports = {
  dependency: {
    platforms: {
      android: {
        packageImportPath: 'import com.reactnativecustomkeyboard.KeyboardSettingsPackage;',
        packageInstance: 'new KeyboardSettingsPackage()',
      },
    },
  },
};
