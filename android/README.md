# ScanWake — Production Android Anti-Cheat Wake-Up Alarm

ScanWake is an anti-cheat wake-up alarm system built with modern Android architecture (**Kotlin**, **Jetpack Compose Material 3**, **Room DB**, **CameraX**, **Google ML Kit Barcode Scanning**, **AlarmManager**, and **Foreground Services**). It enforces wakefulness by requiring users to physically scan barcodes/QR codes located around their home to dismiss alarms.

---

## Architecture Overview

```
android/app/src/main/java/com/scanwake/app/
├── ScanWakeApplication.kt            # Notification channels & app initialization
├── MainActivity.kt                   # Single-Activity entry point hosting Compose UI
├── theme/
│   ├── Color.kt                      # Official ScanWake Neon Cyan (#4ADEDE) dark palette
│   └── Theme.kt                      # Material 3 Dark Tech theme setup
├── data/
│   ├── model/
│   │   └── Entities.kt               # Room Entities: Alarm, RegisteredTag, AlarmChain, ChainStep
│   ├── dao/
│   │   └── Daos.kt                   # Room DAOs with Coroutine Flows
│   ├── database/
│   │   └── ScanWakeDatabase.kt       # RoomDatabase singleton
│   └── repository/
│       └── AlarmRepository.kt        # AlarmManager scheduling & SHA-256 hash validation
├── receiver/
│   └── Receivers.kt                  # AlarmReceiver (WAKE_LOCK) & BootReceiver (BOOT_COMPLETED)
├── service/
│   └── AlarmRingingService.kt        # High-priority Foreground Service (Audio & Volume Guard)
└── ui/
    ├── components/
    │   └── CameraBarcodeScanner.kt   # CameraX + ML Kit Barcode Analyzer in Compose
    ├── screens/
    │   ├── HomeScreen.kt             # Material 3 Alarms, Tags, and Chains dashboard
    │   └── LockoutRingingActivity.kt # Anti-cheat full-screen lockout window
    └── viewmodel/
        └── ViewModels.kt             # MVVM StateFlow ViewModels
```

---

## Anti-Cheat Specifications

1. **"Do Not Leave Alarm" Full-Screen Lockout**:
   - `setShowWhenLocked(true)` and `setTurnScreenOn(true)` bring the phone out of lock state.
   - `WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON` prevents display sleep.
   - `OnBackPressedDispatcher` intercepts and cancels back gestures.
   - `onUserLeaveHint()` reorders the activity back to the front if home/overview is pressed.

2. **Volume Guard**:
   - `AlarmRingingService` plays via `AudioAttributes.USAGE_ALARM` with `FLAG_AUDIBILITY_ENFORCED`.
   - Continuous `ContentObserver` on `Settings.System.CONTENT_URI` checks `STREAM_ALARM` and automatically resets volume to 100% if the user attempts to lower it.

3. **Offline ML Kit Barcode Matching**:
   - CameraX `ImageAnalysis` passes frames to `BarcodeScanning.getClient()`.
   - Matches raw code or SHA-256 hash against the target tag registered in Room DB.

4. **Sequential Wake-Up Chains**:
   - Chains link multiple locations (e.g. Bathroom Toothpaste -> 10m -> Kitchen Coffee Canister).
   - Saved in persistent Room DB so phone reboot preserves active chain step.

---

## Building with Gradle CLI (VS Code / Cursor / Terminal)

Ensure **JDK 17** and **Android SDK 34** are installed (`ANDROID_HOME` or `local.properties`).

```bash
# Navigate to android root
cd android

# Grant execution rights to Gradle Wrapper (if using wrapper)
chmod +x gradlew

# Build Debug APK
./gradlew assembleDebug

# Output APK path:
# android/app/build/outputs/apk/debug/app-debug.apk

# Install directly to connected device / emulator via ADB:
adb install -r app/build/outputs/apk/debug/app-debug.apk
```
