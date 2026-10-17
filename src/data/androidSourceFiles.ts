export interface AndroidFileRecord {
  path: string;
  category: 'Config' | 'Manifest' | 'Theme' | 'Data' | 'Service' | 'UI' | 'Docs';
  content: string;
}

export const ANDROID_SOURCE_FILES: AndroidFileRecord[] = [
  {
    path: 'android/app/src/main/java/com/scanwake/app/ui/screens/LockoutRingingActivity.kt',
    category: 'UI',
    content: `package com.scanwake.app.ui.screens

import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.lifecycleScope
import com.scanwake.app.data.database.ScanWakeDatabase
import com.scanwake.app.data.model.RegisteredTagEntity
import com.scanwake.app.data.repository.AlarmRepository
import com.scanwake.app.receiver.AlarmReceiver
import com.scanwake.app.service.AlarmRingingService
import com.scanwake.app.theme.*
import com.scanwake.app.ui.components.CameraBarcodeScanner
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Strict Anti-Cheat Full-Screen Ringing Screen
 * Invokes setShowWhenLocked(true), setTurnScreenOn(true), intercepts back gestures,
 * and maintains continuous foreground lock until designated barcode is scanned.
 */
class LockoutRingingActivity : ComponentActivity() {

    private lateinit var repository: AlarmRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        repository = AlarmRepository(this)

        setupLockoutWindowFlags()

        val alarmId = intent.getLongExtra(AlarmReceiver.EXTRA_ALARM_ID, -1L)
        val chainId = intent.getLongExtra(AlarmReceiver.EXTRA_CHAIN_ID, -1L)
        val stepIndex = intent.getIntExtra(AlarmReceiver.EXTRA_STEP_INDEX, 0)
        val label = intent.getStringExtra(AlarmReceiver.EXTRA_LABEL) ?: "Morning Wake"
        val tagId = intent.getLongExtra(AlarmReceiver.EXTRA_TAG_ID, -1L)
        val tagHash = intent.getStringExtra(AlarmReceiver.EXTRA_TAG_HASH) ?: ""

        setContent {
            ScanWakeTheme {
                LockoutScreenContent(
                    alarmLabel = label,
                    targetTagId = tagId,
                    expectedHash = tagHash,
                    chainId = chainId,
                    stepIndex = stepIndex,
                    onDismissSuccess = {
                        dismissAlarm(chainId, stepIndex)
                    }
                )
            }
        }
    }

    private fun setupLockoutWindowFlags() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
            keyguardManager.requestDismissKeyguard(this, null)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    private fun dismissAlarm(chainId: Long, stepIndex: Int) {
        val stopIntent = Intent(this, AlarmRingingService::class.java).apply {
            action = AlarmRingingService.ACTION_STOP_ALARM
        }
        startService(stopIntent)

        if (chainId != -1L) {
            lifecycleScope.launch(Dispatchers.IO) {
                repository.advanceChain(chainId, stepIndex)
            }
        }

        Toast.makeText(this, "Wake-up Verified! Good morning!", Toast.LENGTH_LONG).show()
        finish()
    }

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        // Anti-cheat bounce back to front on Home or Overview
        val bringBackIntent = Intent(this, LockoutRingingActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
        }
        startActivity(bringBackIntent)
    }
}
`,
  },
  {
    path: 'android/app/src/main/java/com/scanwake/app/service/AlarmRingingService.kt',
    category: 'Service',
    content: `package com.scanwake.app.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.database.ContentObserver
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.*
import android.provider.Settings
import android.util.Log
import androidx.core.app.NotificationCompat
import com.scanwake.app.receiver.AlarmReceiver
import com.scanwake.app.ui.screens.LockoutRingingActivity

/**
 * High-Priority Foreground Service (FOREGROUND_SERVICE_MEDIA_PLAYBACK)
 * Plays looped audio via USAGE_ALARM and enforces anti-cheat volume guard.
 */
class AlarmRingingService : Service() {

    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var audioManager: AudioManager? = null
    private var volumeObserver: ContentObserver? = null

    private var isStrictLockout = true
    private var currentAlarmId: Long = -1

    override fun onCreate() {
        super.onCreate()
        audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        createNotificationChannel()

        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
            "scanwake:alarm_service_wakelock"
        )
        wakeLock?.acquire(10 * 60 * 1000L)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent == null) return START_NOT_STICKY

        when (intent.action) {
            ACTION_START_ALARM -> {
                currentAlarmId = intent.getLongExtra(AlarmReceiver.EXTRA_ALARM_ID, -1)
                val label = intent.getStringExtra(AlarmReceiver.EXTRA_LABEL) ?: "ScanWake Alarm"
                isStrictLockout = intent.getBooleanExtra(AlarmReceiver.EXTRA_IS_STRICT, true)

                startForeground(NOTIFICATION_ID, buildAlarmNotification(label))
                startAlarmSoundAndHaptics()
                if (isStrictLockout) {
                    enforceVolumeLockout()
                }
            }
            ACTION_STOP_ALARM -> {
                stopAlarmAndSelf()
            }
        }
        return START_STICKY
    }

    private fun startAlarmSoundAndHaptics() {
        try {
            val alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)

            mediaPlayer = MediaPlayer().apply {
                setDataSource(applicationContext, alertUri)
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setFlags(AudioAttributes.FLAG_AUDIBILITY_ENFORCED)
                        .build()
                )
                isLooping = true
                prepare()
                start()
            }

            audioManager?.let { am ->
                val maxVol = am.getStreamMaxVolume(AudioManager.STREAM_ALARM)
                am.setStreamVolume(AudioManager.STREAM_ALARM, maxVol, 0)
            }

            vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            val pattern = longArrayOf(0, 800, 400, 800, 400, 1200, 500)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(pattern, 0)
            }
        } catch (e: Exception) {
            Log.e("AlarmRingingService", "Error starting playback", e)
        }
    }

    private fun enforceVolumeLockout() {
        volumeObserver = object : ContentObserver(Handler(Looper.getMainLooper())) {
            override fun onChange(selfChange: Boolean) {
                super.onChange(selfChange)
                audioManager?.let { am ->
                    val maxVol = am.getStreamMaxVolume(AudioManager.STREAM_ALARM)
                    val currentVol = am.getStreamVolume(AudioManager.STREAM_ALARM)
                    if (currentVol < maxVol) {
                        Log.w("AlarmRingingService", "Volume lowered! Enforcing max volume lockout.")
                        am.setStreamVolume(AudioManager.STREAM_ALARM, maxVol, 0)
                    }
                }
            }
        }
        contentResolver.registerContentObserver(
            Settings.System.CONTENT_URI,
            true,
            volumeObserver as ContentObserver
        )
    }

    private fun buildAlarmNotification(label: String): Notification {
        val fullScreenIntent = Intent(this, LockoutRingingActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pIntent = PendingIntent.getActivity(
            this,
            0,
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("ScanWake: $label")
            .setContentText("Strict Lockout active: Scan designated QR code to dismiss")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(pIntent, true)
            .setOngoing(true)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "ScanWake Alarm Service",
                NotificationManager.IMPORTANCE_HIGH
            )
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }
    }

    private fun stopAlarmAndSelf() {
        volumeObserver?.let { contentResolver.unregisterContentObserver(it) }
        volumeObserver = null
        mediaPlayer?.stop()
        mediaPlayer?.release()
        mediaPlayer = null
        vibrator?.cancel()
        vibrator = null
        if (wakeLock?.isHeld == true) wakeLock?.release()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        stopAlarmAndSelf()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        const val CHANNEL_ID = "scanwake_alarm_ringing_channel"
        const val NOTIFICATION_ID = 40401
        const val ACTION_START_ALARM = "com.scanwake.app.ACTION_START_ALARM"
        const val ACTION_STOP_ALARM = "com.scanwake.app.ACTION_STOP_ALARM"
    }
}
`,
  },
  {
    path: 'android/app/src/main/java/com/scanwake/app/ui/components/CameraBarcodeScanner.kt',
    category: 'UI',
    content: `package com.scanwake.app.ui.components

import android.view.ViewGroup
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import com.scanwake.app.theme.NeonCyan
import java.util.concurrent.Executors

@Composable
fun CameraBarcodeScanner(
    modifier: Modifier = Modifier,
    onBarcodeDetected: (barcodeValue: String, format: String) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }
    val barcodeScanner = remember { BarcodeScanning.getClient() }

    DisposableEffect(Unit) {
        onDispose {
            cameraExecutor.shutdown()
            barcodeScanner.close()
        }
    }

    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
                val previewView = PreviewView(ctx).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    scaleType = PreviewView.ScaleType.FILL_CENTER
                }

                val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                cameraProviderFuture.addListener({
                    val cameraProvider = cameraProviderFuture.get()
                    val preview = Preview.Builder().build().also {
                        it.setSurfaceProvider(previewView.surfaceProvider)
                    }

                    val imageAnalysis = ImageAnalysis.Builder()
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .build()

                    imageAnalysis.setAnalyzer(cameraExecutor) { imageProxy ->
                        processImageProxy(imageProxy, barcodeScanner, onBarcodeDetected)
                    }

                    cameraProvider.unbindAll()
                    cameraProvider.bindToLifecycle(
                        lifecycleOwner,
                        CameraSelector.DEFAULT_BACK_CAMERA,
                        preview,
                        imageAnalysis
                    )
                }, ContextCompat.getMainExecutor(ctx))

                previewView
            }
        )

        Box(
            modifier = Modifier
                .size(260.dp)
                .border(2.dp, NeonCyan.copy(alpha = 0.8f), RoundedCornerShape(16.dp))
        )
    }
}

@androidx.annotation.OptIn(androidx.camera.core.ExperimentalGetImage::class)
private fun processImageProxy(
    imageProxy: ImageProxy,
    barcodeScanner: com.google.mlkit.vision.barcode.BarcodeScanner,
    onSuccess: (String, String) -> Unit
) {
    val mediaImage = imageProxy.image
    if (mediaImage != null) {
        val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
        barcodeScanner.process(image)
            .addOnSuccessListener { barcodes ->
                for (barcode in barcodes) {
                    val raw = barcode.rawValue
                    if (!raw.isNullOrBlank()) {
                        val formatStr = when (barcode.format) {
                            Barcode.FORMAT_QR_CODE -> "QR_CODE"
                            Barcode.FORMAT_EAN_13 -> "EAN_13"
                            Barcode.FORMAT_CODE_128 -> "CODE_128"
                            else -> "BARCODE"
                        }
                        onSuccess(raw, formatStr)
                        break
                    }
                }
            }
            .addOnCompleteListener { imageProxy.close() }
    } else {
        imageProxy.close()
    }
}
`,
  },
  {
    path: 'android/app/src/main/java/com/scanwake/app/data/repository/AlarmRepository.kt',
    category: 'Data',
    content: `package com.scanwake.app.data.repository

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.scanwake.app.data.database.ScanWakeDatabase
import com.scanwake.app.data.model.*
import com.scanwake.app.receiver.AlarmReceiver
import kotlinx.coroutines.flow.Flow
import java.security.MessageDigest
import java.util.Calendar

class AlarmRepository(private val context: Context) {
    private val db = ScanWakeDatabase.getDatabase(context)
    private val alarmDao = db.alarmDao()
    private val tagDao = db.registeredTagDao()
    private val chainDao = db.alarmChainDao()
    private val stepDao = db.chainStepDao()
    private val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    val allAlarms: Flow<List<AlarmEntity>> = alarmDao.getAllAlarms()
    val allTags: Flow<List<RegisteredTagEntity>> = tagDao.getAllTags()
    val allChains: Flow<List<AlarmChainEntity>> = chainDao.getAllChains()

    suspend fun saveAlarm(alarm: AlarmEntity): Long {
        val id = alarmDao.insertAlarm(alarm)
        val saved = alarm.copy(id = id)
        if (saved.isEnabled) scheduleAlarmSystem(saved) else cancelAlarmSystem(saved)
        return id
    }

    suspend fun toggleAlarm(alarm: AlarmEntity, enabled: Boolean) {
        alarmDao.setAlarmEnabled(alarm.id, enabled)
        val updated = alarm.copy(isEnabled = enabled)
        if (enabled) scheduleAlarmSystem(updated) else cancelAlarmSystem(updated)
    }

    suspend fun advanceChain(chainId: Long, currentStepIndex: Int): ChainStepEntity? {
        val steps = stepDao.getStepsForChain(chainId)
        val nextIndex = currentStepIndex + 1
        return if (nextIndex < steps.size) {
            chainDao.updateChainProgress(chainId, nextIndex, isActive = true)
            val nextStep = steps[nextIndex]
            scheduleChainStep(nextStep)
            nextStep
        } else {
            chainDao.updateChainProgress(chainId, 0, isActive = false)
            null
        }
    }

    private fun scheduleChainStep(step: ChainStepEntity) {
        val triggerAtMillis = System.currentTimeMillis() + (step.delayMinutesAfterPrev * 60 * 1000L)
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = AlarmReceiver.ACTION_TRIGGER_ALARM
            putExtra(AlarmReceiver.EXTRA_ALARM_ID, -step.id)
            putExtra(AlarmReceiver.EXTRA_CHAIN_ID, step.chainId)
            putExtra(AlarmReceiver.EXTRA_STEP_INDEX, step.stepOrder)
            putExtra(AlarmReceiver.EXTRA_TAG_ID, step.targetTagId)
        }
        val pi = PendingIntent.getBroadcast(
            context,
            (10000 + step.id).toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi)
    }

    fun scheduleAlarmSystem(alarm: AlarmEntity) {
        val triggerTime = computeNextTriggerMillis(alarm.hour, alarm.minute, alarm.daysOfWeekBitmask)
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = AlarmReceiver.ACTION_TRIGGER_ALARM
            putExtra(AlarmReceiver.EXTRA_ALARM_ID, alarm.id)
            putExtra(AlarmReceiver.EXTRA_LABEL, alarm.label)
            putExtra(AlarmReceiver.EXTRA_TAG_ID, alarm.targetTagId ?: -1L)
            putExtra(AlarmReceiver.EXTRA_TAG_HASH, alarm.targetTagHash ?: "")
            putExtra(AlarmReceiver.EXTRA_IS_STRICT, alarm.isStrictLockout)
        }
        val pi = PendingIntent.getBroadcast(
            context,
            alarm.id.toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pi)
    }

    fun cancelAlarmSystem(alarm: AlarmEntity) {
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = AlarmReceiver.ACTION_TRIGGER_ALARM
        }
        val pi = PendingIntent.getBroadcast(
            context,
            alarm.id.toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        alarmManager.cancel(pi)
    }

    companion object {
        fun hashTagValue(input: String): String {
            val md = MessageDigest.getInstance("SHA-256")
            val bytes = md.digest(input.trim().toByteArray(Charsets.UTF_8))
            return bytes.joinToString("") { "%02x".format(it) }
        }

        fun computeNextTriggerMillis(hour: Int, minute: Int, daysBitmask: Int): Long {
            val now = Calendar.getInstance()
            val target = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, hour)
                set(Calendar.MINUTE, minute)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }
            if (daysBitmask == 0) {
                if (target.before(now)) target.add(Calendar.DAY_OF_YEAR, 1)
                return target.timeInMillis
            }
            val todayDayOfWeek = now.get(Calendar.DAY_OF_WEEK) - 1
            if (((daysBitmask and (1 shl todayDayOfWeek)) != 0) && target.after(now)) {
                return target.timeInMillis
            }
            for (i in 1..7) {
                val candidate = (todayDayOfWeek + i) % 7
                if ((daysBitmask and (1 shl candidate)) != 0) {
                    target.add(Calendar.DAY_OF_YEAR, i)
                    return target.timeInMillis
                }
            }
            target.add(Calendar.DAY_OF_YEAR, 1)
            return target.timeInMillis
        }
    }
}
`,
  },
  {
    path: 'android/app/src/main/AndroidManifest.xml',
    category: 'Manifest',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.USE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />

    <application
        android:name=".ScanWakeApplication"
        android:allowBackup="true"
        android:label="@string/app_name"
        android:theme="@style/Theme.ScanWake">

        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <activity
            android:name=".ui.screens.LockoutRingingActivity"
            android:exported="false"
            android:launchMode="singleInstance"
            android:showWhenLocked="true"
            android:turnScreenOn="true"
            android:excludeFromRecents="true"
            android:theme="@style/Theme.ScanWake.Lockout" />

        <service
            android:name=".service.AlarmRingingService"
            android:exported="false"
            android:foregroundServiceType="mediaPlayback" />

        <receiver
            android:name=".receiver.AlarmReceiver"
            android:exported="false">
            <intent-filter>
                <action android:name="com.scanwake.app.ACTION_TRIGGER_ALARM" />
            </intent-filter>
        </receiver>

        <receiver
            android:name=".receiver.BootReceiver"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
            </intent-filter>
        </receiver>
    </application>
</manifest>`,
  },
  {
    path: 'android/app/build.gradle.kts',
    category: 'Config',
    content: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.devtools.ksp")
}

android {
    namespace = "com.scanwake.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.scanwake.app"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
    }

    buildFeatures {
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.14"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-compose:1.9.0")
    implementation(platform("androidx.compose:compose-bom:2024.06.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")

    // Room DB
    val roomVersion = "2.6.1"
    implementation("androidx.room:room-runtime:$roomVersion")
    implementation("androidx.room:room-ktx:$roomVersion")
    ksp("androidx.room:room-compiler:$roomVersion")

    // CameraX + ML Kit Barcode
    val cameraxVersion = "1.3.4"
    implementation("androidx.camera:camera-core:$cameraxVersion")
    implementation("androidx.camera:camera-camera2:$cameraxVersion")
    implementation("androidx.camera:camera-lifecycle:$cameraxVersion")
    implementation("androidx.camera:camera-view:$cameraxVersion")
    implementation("com.google.mlkit:barcode-scanning:17.2.0")
}`,
  },
  {
    path: 'android/app/src/main/res/values/colors.xml',
    category: 'Theme',
    content: `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- ScanWake Official Dark Tech Palette -->
    <color name="primary_neon_cyan">#4ADEDE</color>
    <color name="secondary_teal">#64CCC5</color>
    <color name="secondary_mint">#7DE2D1</color>
    <color name="bg_charcoal">#0B0E11</color>
    <color name="surface_slate">#1C232B</color>
    <color name="text_white">#FFFFFF</color>
    <color name="text_muted">#8C9BA8</color>
    <color name="error_alert">#FF5C5C</color>
</resources>`,
  },
  {
    path: 'android/README.md',
    category: 'Docs',
    content: `# ScanWake — Android Anti-Cheat Alarm
Modern Kotlin, Jetpack Compose, Room DB, CameraX, and ML Kit Barcode Analyzer.

## Build Instructions (CLI)
\`\`\`bash
cd android
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
\`\`\`
`,
  },
];
