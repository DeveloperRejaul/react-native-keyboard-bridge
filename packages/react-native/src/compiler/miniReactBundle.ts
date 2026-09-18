import * as babel from '@babel/core';

/**
 * Compiles a hand-written keyboard component (the *same* file
 * `example/src/keyboard/KeyboardApp.tsx` uses on Android — plain `View`/`Text`/
 * `TouchableOpacity`, `.map()`, `useState`, conditional rendering, style arrays) into a single
 * JS string that runs inside iOS's embedded `JSContext` (see docs/adr/ADR-005). This replaces
 * the old build-time-compiled-to-JSON approach (`compileKeyboardSource`, ADR-001/ADR-004): those
 * only extracted static structure and never executed real logic, so `.map()`/conditionals/state
 * couldn't work at all. This compiler instead transforms the *whole component* into runnable JS.
 *
 * Only three imports are recognized — everything the mini-runtime prelude
 * (this package's `ios/Resources/mini-react-runtime.js`) provides as globals:
 * - `"react"` -> `useState`
 * - `"react-native"` -> `View`, `Text`, `TouchableOpacity`, `StyleSheet`
 * - `"react-native-custom-keyboard"` -> most of `packages/react-native/src/bridge.ts`'s
 *   functions; the ones with no `UITextDocumentProxy` equivalent are still defined (as safe
 *   no-ops, matching the Android bridge's own convention) rather than left undefined — see the
 *   prelude's own header comment and docs/api.md's bridge-function parity table
 * Any other import is a compile error, not a silent best-effort guess — same principle as
 * `compileKeyboardSource`.
 */

const ALLOWED_IMPORT_SOURCES = new Set(['react', 'react-native', 'react-native-custom-keyboard']);

export interface BundleError {
  message: string;
}

export type BundleOutcome = { success: true; code: string } | { success: false; errors: BundleError[] };

/** Removes/validates imports and rewrites `export default` into a plain declaration, recording
 * the local name so the caller can append a `__mount(name)` call. */
function stripImportsAndDefaultExport(): babel.PluginObj {
  return {
    visitor: {
      ImportDeclaration(path) {
        const source = path.node.source.value;
        if (!ALLOWED_IMPORT_SOURCES.has(source)) {
          throw path.buildCodeFrameError(
            `Unsupported import from "${source}" — the iOS mini-runtime only provides "react" ` +
              `(useState), "react-native" (View/Text/TouchableOpacity/StyleSheet), and ` +
              `"react-native-custom-keyboard" (commitText/deleteSurroundingText/…) as built-in globals.`,
          );
        }
        path.remove();
      },
      ExportDefaultDeclaration(path, state) {
        const declaration = path.node.declaration;
        if (babel.types.isFunctionDeclaration(declaration) && declaration.id) {
          const name = declaration.id.name;
          path.replaceWith(declaration);
          (state.file.metadata as { defaultExportName?: string }).defaultExportName = name;
          return;
        }
        if (!babel.types.isExpression(declaration)) {
          throw path.buildCodeFrameError(
            'Default export must be a function/arrow component or a function declaration.',
          );
        }
        const id = path.scope.generateUidIdentifier('KeyboardAppComponent');
        path.replaceWith(babel.types.variableDeclaration('const', [babel.types.variableDeclarator(id, declaration)]));
        (state.file.metadata as { defaultExportName?: string }).defaultExportName = id.name;
      },
    },
  };
}

/** Compiles `source` (a `.tsx` file's contents) to a JS string ready for
 * `JSContext.evaluateScript` — see `JSKeyboardRuntime.swift`. */
export function bundleKeyboardApp(source: string, filename = 'KeyboardApp.tsx'): BundleOutcome {
  try {
    const result = babel.transformSync(source, {
      filename,
      babelrc: false,
      configFile: false,
      presets: [[require.resolve('@babel/preset-typescript'), { isTSX: true, allExtensions: true }]],
      plugins: [
        [require.resolve('@babel/plugin-transform-react-jsx'), { pragma: '__h', pragmaFrag: '"Fragment"' }],
        stripImportsAndDefaultExport,
      ],
    });
    if (!result || !result.code) {
      return { success: false, errors: [{ message: 'Babel produced no output.' }] };
    }
    const defaultExportName = (result.metadata as { defaultExportName?: string }).defaultExportName;
    if (!defaultExportName) {
      return { success: false, errors: [{ message: 'File has no default export.' }] };
    }
    const code = `(function () {\n${result.code}\n__mount(${defaultExportName});\n})();`;
    return { success: true, code };
  } catch (error) {
    return { success: false, errors: [{ message: error instanceof Error ? error.message : String(error) }] };
  }
}
