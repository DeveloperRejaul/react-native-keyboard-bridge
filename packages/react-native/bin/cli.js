#!/usr/bin/env node
'use strict';

// Single entry point so a consumer only ever needs `yarn add react-native-custom-keyboard` plus
// this CLI — no separate packages to install for Android/iOS native setup or the iOS compiler.
// Android needs no CLI step at all: `android/` autolinks (see react-native.config.js) and its own
// AndroidManifest.xml/res merge into the host app automatically (see docs/api.md). iOS can't be
// fully zero-step — Apple requires a distinct App Extension target in the host app's Xcode
// project, which no CocoaPod/npm install can fabricate — so `setup-ios` automates creating it.

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const [, , command, ...rest] = process.argv;

function usage() {
  console.log(`Usage: react-native-custom-keyboard <command> [args]

Commands:
  setup-ios [iosDir]
      Creates (or refreshes) the CustomKeyboardExtension App Extension target in your app's
      Xcode project, wired to this package's Swift sources. Idempotent by recreation — safe to
      run again after updating this package. Requires Ruby + the \`xcodeproj\` gem
      (\`gem install xcodeproj\`, or use the one bundled with your CocoaPods install).
      Default iosDir: ./ios (relative to the current directory).

  build-keyboard <entry.tsx> <outFile.js>
      Compiles a hand-written keyboard component (the same file your Android build renders live)
      into the plain JS bundle iOS's embedded JSContext runs. Re-run whenever that component
      changes; the output is meant to be committed alongside your iOS extension's other files.
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
  process.exit(result.status ?? 1);
} else if (command === 'build-keyboard') {
  const [entry, outFile] = rest;
  if (!entry || !outFile) {
    console.error('Usage: react-native-custom-keyboard build-keyboard <entry.tsx> <outFile.js>');
    process.exit(1);
  }
  // Deep-imported on purpose, not from this package's main barrel — see src/index.ts's comment
  // on why `bundleKeyboardApp` (and its @babel/core dependency) must never be reachable from
  // there, which RN application code imports (breaks Metro bundling — see docs/adr/ADR-005).
  const { bundleKeyboardApp } = require('../dist/compiler/miniReactBundle');
  const entryPath = path.resolve(process.cwd(), entry);
  const source = fs.readFileSync(entryPath, 'utf8');
  const outcome = bundleKeyboardApp(source, entryPath);
  if (!outcome.success) {
    console.error('Failed to compile keyboard component:');
    for (const error of outcome.errors) console.error('  ' + error.message);
    process.exit(1);
  }
  fs.writeFileSync(path.resolve(process.cwd(), outFile), outcome.code, 'utf8');
  console.log(`Wrote ${outFile}`);
} else {
  console.error(`Unknown command: ${command}`);
  usage();
  process.exit(1);
}
