#!/usr/bin/env node
'use strict';

// Single entry point so a consumer only ever needs `yarn add react-native-keyboard-bridge` plus
// this CLI — no separate packages to install for Android/iOS native setup. Android needs no CLI
// step at all: `android/` autolinks (see react-native.config.js) and its own
// AndroidManifest.xml/res merge into the host app automatically (see docs/api.md). iOS can't be
// fully zero-step — Apple requires a distinct App Extension target in the host app's Xcode
// project, which no CocoaPod/npm install can fabricate — so `setup-ios` automates creating it,
// and `build-keyboard` bundles the JS it runs (see docs/adr/ADR-008: both platforms run the same
// real React Native now, so this just wraps the standard `react-native bundle` CLI — no custom
// compiler of our own).

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const [, , command, ...rest] = process.argv;

function usage() {
  console.log(`Usage: react-native-keyboard-bridge <command> [args]

Commands:
  setup-ios [iosDir]
      Creates (or refreshes) the CustomKeyboardExtension App Extension target in your app's
      Xcode project, wired to this package's Swift sources. Idempotent by recreation — safe to
      run again after updating this package. Requires Ruby + the \`xcodeproj\` gem
      (\`gem install xcodeproj\`, or use the one bundled with your CocoaPods install). Also
      requires react-native's own Podfile to add the extension target as a second
      \`use_react_native!\` block — \`setup-ios\` checks for this and prints the exact snippet to
      add if it's missing, rather than editing your Podfile itself.
      Default iosDir: ./ios (relative to the current directory).

  build-keyboard [outFile] [--entry-file <file>] [--dev]
      Wraps \`react-native bundle\` to produce the JS bundle the iOS extension's embedded React
      Native instance loads (both platforms run the same hand-written KeyboardApp from one
      bundle — see example/index.js registering both "KeyboardApp" and your app's own component
      name). Re-run whenever your JS changes; the output is meant to be committed alongside your
      iOS extension's other files.
      Default outFile: ios/CustomKeyboardExtension/main.jsbundle
      Default --entry-file: index.js
      --dev is off by default (matches how this was verified working — a Metro dev-server URL
      would need the user to grant this extension "Allow Full Access" just to develop with it).
`);
}

if (!command || command === '--help' || command === '-h') {
  usage();
  process.exit(command && command !== '--help' && command !== '-h' ? 1 : 0);
}

if (command === 'setup-ios') {
  const iosDir = path.resolve(process.cwd(), rest[0] || 'ios');
  const scriptPath = path.join(__dirname, '..', 'ios', 'setup_xcode_targets.rb');
  // A project that already runs `bundle exec pod install` (the normal RN iOS setup) has the
  // `xcodeproj` gem available through its own Gemfile — prefer that over plain `ruby`, which
  // likely lacks it, rather than asking the consumer to separately `gem install` anything.
  const hasGemfile = fs.existsSync(path.join(iosDir, 'Gemfile')) || fs.existsSync(path.join(process.cwd(), 'Gemfile'));
  const [cmd, args] = hasGemfile
    ? ['bundle', ['exec', 'ruby', scriptPath, iosDir]]
    : ['ruby', [scriptPath, iosDir]];
  const result = spawnSync(cmd, args, { stdio: 'inherit', cwd: hasGemfile ? iosDir : undefined });
  if (result.error) {
    console.error(`Failed to run Ruby (${result.error.message}). Install Ruby + the xcodeproj gem: gem install xcodeproj`);
    process.exit(1);
  }
  if (result.status === 0) {
    const podfilePath = path.join(iosDir, 'Podfile');
    if (fs.existsSync(podfilePath) && !fs.readFileSync(podfilePath, 'utf8').includes('CustomKeyboardExtension')) {
      console.log(`
NOTE: your Podfile has no 'CustomKeyboardExtension' target block yet. React Native (Hermes/
Fabric) needs its pods added there too, alongside your app target. Add something like this to
${podfilePath}, then re-run 'bundle exec pod install' from ${iosDir}:

target 'CustomKeyboardExtension' do
  config = use_native_modules!
  use_react_native!(
    :path => config[:reactNativePath],
    :app_path => "#{Pod::Config.instance.installation_root}/.."
  )
end
`);
    }
  }
  process.exit(result.status ?? 1);
} else if (command === 'build-keyboard') {
  const positional = rest.filter((arg) => !arg.startsWith('--'));
  const outFile = path.resolve(process.cwd(), positional[0] || 'ios/CustomKeyboardExtension/main.jsbundle');
  const entryFlagIndex = rest.indexOf('--entry-file');
  const entryFile = entryFlagIndex !== -1 ? rest[entryFlagIndex + 1] : 'index.js';
  const dev = rest.includes('--dev');

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const result = spawnSync(
    'npx',
    [
      'react-native',
      'bundle',
      '--entry-file', entryFile,
      '--platform', 'ios',
      '--dev', String(dev),
      '--bundle-output', outFile,
      '--assets-dest', path.dirname(outFile),
    ],
    { stdio: 'inherit' },
  );
  if (result.error) {
    console.error(`Failed to run react-native bundle (${result.error.message}).`);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
} else {
  console.error(`Unknown command: ${command}`);
  usage();
  process.exit(1);
}
