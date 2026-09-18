import { bundleKeyboardApp } from './miniReactBundle';

const REFERENCE_SOURCE = `
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { commitText, deleteSurroundingText } from 'react-native-custom-keyboard';

const ROWS = [
  ['q', 'w', 'e'],
  ['a', 's', 'd'],
];

export default function KeyboardApp(): React.JSX.Element {
  const [shift, setShift] = useState(false);

  function pressLetter(letter: string): void {
    commitText(shift ? letter.toUpperCase() : letter);
    if (shift) setShift(false);
  }

  return (
    <View style={styles.container}>
      {ROWS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((letter) => (
            <TouchableOpacity key={letter} style={[styles.key, shift && styles.keyActive]} onPress={() => pressLetter(letter)}>
              <Text style={styles.keyLabel}>{shift ? letter.toUpperCase() : letter}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
      <TouchableOpacity style={styles.key} onPress={() => deleteSurroundingText(1, 0)}>
        <Text>del</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#012c82' },
  row: { flexDirection: 'row' },
  key: { flex: 1, height: 42 },
  keyActive: { backgroundColor: '#a9b4c0' },
  keyLabel: { fontSize: 16 },
});
`;

describe('bundleKeyboardApp', () => {
  it('compiles the hand-written reference component into runnable JS with no react-native imports left', () => {
    const outcome = bundleKeyboardApp(REFERENCE_SOURCE);
    expect(outcome.success).toBe(true);
    if (!outcome.success) return;
    expect(outcome.code).not.toMatch(/require\(/);
    expect(outcome.code).not.toMatch(/from ['"]react/);
    expect(outcome.code).toContain('__mount(KeyboardApp)');
    expect(outcome.code).toContain('__h(');
  });

  it('strips TypeScript types and JSX pragma-compiles to __h calls', () => {
    const outcome = bundleKeyboardApp(REFERENCE_SOURCE);
    expect(outcome.success).toBe(true);
    if (!outcome.success) return;
    expect(outcome.code).not.toContain('React.JSX.Element');
    expect(outcome.code).toContain('__h(View,');
    expect(outcome.code).toContain('__h(TouchableOpacity,');
    expect(outcome.code).toContain('__h(Text,');
  });

  it('is actually executable: running the bundle against a fake mini-runtime renders the expected tree', () => {
    const outcome = bundleKeyboardApp(REFERENCE_SOURCE);
    expect(outcome.success).toBe(true);
    if (!outcome.success) return;

    const rendered: unknown[] = [];
    const hookStates: unknown[] = [];
    let hookIndex = 0;

    function useState(initial: unknown): [unknown, (next: unknown) => void] {
      const index = hookIndex++;
      if (hookStates.length <= index) hookStates.push(initial);
      return [
        hookStates[index],
        (next: unknown) => {
          hookStates[index] = typeof next === 'function' ? (next as (p: unknown) => unknown)(hookStates[index]) : next;
        },
      ];
    }

    function flatten(children: unknown[]): unknown[] {
      const out: unknown[] = [];
      for (const child of children) {
        if (child === null || child === undefined || child === true || child === false) continue;
        if (Array.isArray(child)) out.push(...flatten(child));
        else out.push(child);
      }
      return out;
    }

    function __h(type: string, props: Record<string, unknown> | null, ...children: unknown[]) {
      return { type, props: props || {}, children: flatten(children) };
    }

    let mounted: (() => unknown) | undefined;
    function __mount(componentFn: () => unknown) {
      mounted = componentFn;
      hookIndex = 0;
      rendered.push(mounted());
    }

    const View = 'View';
    const Text = 'Text';
    const TouchableOpacity = 'TouchableOpacity';
    const StyleSheet = { create: (s: unknown) => s };
    const commitText = jest.fn();
    const deleteSurroundingText = jest.fn();

    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const run = new Function(
      'useState',
      'View',
      'Text',
      'TouchableOpacity',
      'StyleSheet',
      'commitText',
      'deleteSurroundingText',
      '__h',
      '__mount',
      outcome.code,
    );
    run(useState, View, Text, TouchableOpacity, StyleSheet, commitText, deleteSurroundingText, __h, __mount);

    expect(rendered).toHaveLength(1);
    const tree = rendered[0] as { type: string; children: unknown[] };
    expect(tree.type).toBe('View');
    // 2 rows + 1 standalone delete button
    expect(tree.children).toHaveLength(3);
  });

  it('rejects an import from an unsupported source', () => {
    const outcome = bundleKeyboardApp(`
      import { something } from 'some-other-library';
      export default function KeyboardApp() { return something(); }
    `);
    expect(outcome.success).toBe(false);
    if (outcome.success) return;
    expect(outcome.errors[0].message).toMatch(/Unsupported import/);
  });

  it('rejects a file with no default export', () => {
    const outcome = bundleKeyboardApp(`
      export function NotDefault() { return null; }
    `);
    expect(outcome.success).toBe(false);
  });
});
