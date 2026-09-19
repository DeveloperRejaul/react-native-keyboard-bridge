---
sidebar_position: 3
---

# Developing with live reload

Editing your keyboard component doesn't require a rebundle-and-reinstall loop — DEBUG builds
connect to Metro like any other RN screen.

```bash
# From your app, start Metro first:
npx react-native start
```

## Android

Also run `adb reverse tcp:8081 tcp:8081` (automatic if you use `react-native run-android`), and
install a **debug** build. Nothing else to configure — the native module already asks
`ReactHostImpl` for dev support, which checks for Metro on its own and applies real Fast Refresh
on save.

## iOS

Also start Metro, then, one time only:

1. Set `RequestsOpenAccess` to `true` in the extension's `Info.plist`
   (`NSExtension > NSExtensionAttributes`).
2. Enable "Allow Full Access" for the keyboard in Settings.

An extension has no network access without both — this is why they're off by default. **Flip
`RequestsOpenAccess` back to `false` before a release build**; it's a real permission prompt end
users would otherwise see for no reason.

Release/production builds on both platforms always use a committed bundle — none of this affects
what ships.
