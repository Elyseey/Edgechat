# EdgeChat Capacitor Android

This is the Web UI based Android client. It lives beside the Kotlin + Compose client in `android/` and uses the separate application ID `com.aozorae.edgechat.web`.

The Vue UI remains the source of product behavior. A small Kotlin plugin provides Android file selection, local notifications, notification room opening, and external URL handling. The APK contains no fixed EdgeChat deployment: users enter their HTTPS server URL on the first sign-in screen.

## Build

Install JDK 21 and Android SDK 36 first.

```bash
npm ci
npm run build:capacitor
```

The Debug APK is written to `capacitor/android/app/build/outputs/apk/debug/app-debug.apk`.
