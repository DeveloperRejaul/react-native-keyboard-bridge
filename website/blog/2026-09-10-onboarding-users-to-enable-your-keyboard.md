---
slug: onboarding-users-to-enable-your-keyboard
title: "How to Prompt Users to Enable a Custom Keyboard in React Native"
description: "Design an onboarding screen that guides users to enable and switch to your custom React Native keyboard on Android and iOS, including a full three-state example."
keywords: [enable custom keyboard android, ios keyboard settings, react native keyboard onboarding, showInputMethodPicker, openInputMethodSettings]
authors: [rejaul]
tags: [ux, react-native, keyboard]
---

Shipping a keyboard is only half the job — a user still has to find Settings, enable it, and
select it before it ever appears. Neither Android nor iOS lets an app skip that flow, so the best
you can do is make it as short as possible from your own app's screen.

{/* truncate */}

## The four settings functions

```ts showLineNumbers
function openInputMethodSettings(): void;
function showInputMethodPicker(): void;
function isKeyboardEnabled(): Promise<boolean>;
function isKeyboardSelected(): Promise<boolean>;
```

These run from the *host app's own* screen — an onboarding step in `App.tsx`, typically — never
from inside the keyboard itself. Enabling or switching a keyboard is something only the app the
user already has open in the foreground can prompt them to do.

## Android: a real three-state flow

```tsx showLineNumbers
function EnableKeyboardScreen() {
  const [enabled, setEnabled] = useState(false);
  const [selected, setSelected] = useState(false);

  useEffect(() => {
    isKeyboardEnabled().then(setEnabled);
    isKeyboardSelected().then(setSelected);
  }, []);

  if (selected) return <Text>You're all set — this keyboard is active.</Text>;
  if (enabled) {
    return <Button title="Switch to this keyboard" onPress={showInputMethodPicker} />;
  }
  return <Button title="Enable keyboard" onPress={openInputMethodSettings} />;
}
```

`openInputMethodSettings` opens system Settings' keyboard-management screen directly on Android —
the user toggles your keyboard on and returns to your app. `showInputMethodPicker` then opens the
system's own keyboard-switcher sheet so they can make it active without leaving the app at all.

## iOS: a shorter deep link, then manual navigation

`openInputMethodSettings` still works on iOS, but Apple exposes no deeper deep link than *this
app's own Settings page* — there's no API to jump straight to General > Keyboard > Keyboards. The
user still navigates the last step themselves. `showInputMethodPicker`, `isKeyboardEnabled`, and
`isKeyboardSelected` have no iOS equivalent at all (no API lets a containing app query or drive
keyboard-picker state), so they resolve a safe default (`false`/no-op) instead of throwing —
meaning the same `EnableKeyboardScreen` component above degrades gracefully to just the "Enable
keyboard" button on iOS, with a caption explaining the one extra manual step.

## Design around the asymmetry, don't hide it

The honest version of this screen tells iOS users explicitly: "tap Enable, then go to General >
Keyboard > Keyboards > [Your App] and turn on Allow Full Access if prompted." Trying to make the
two platforms look identical here usually means one of them silently doesn't work — better to
show each platform's real, shortest path.

## Try it yourself

This is a real, working library, not a proof-of-concept — install it and build your own keyboard:

```bash
yarn add react-native-keyboard-bridge
```

- 📖 [Full documentation & tutorial](https://developerrejaul.github.io/react-native-keyboard-bridge/docs/)
- ⭐ [Source on GitHub](https://github.com/DeveloperRejaul/react-native-keyboard-bridge)
- 📦 [Package on npm](https://www.npmjs.com/package/react-native-keyboard-bridge)

