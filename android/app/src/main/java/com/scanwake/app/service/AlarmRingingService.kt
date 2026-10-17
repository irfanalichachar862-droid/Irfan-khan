package com.scanwake.app.service

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
import com.scanwake.app.R
import com.scanwake.app.receiver.AlarmReceiver
import com.scanwake.app.ui.screens.LockoutRingingActivity

class AlarmRingingService : Service() {

    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var audioManager: AudioManager? = null
    private var volumeObserver: ContentObserver? = null

    private var isStrictLockout = true
    private var currentAlarmId: Long = -1
    private var currentTagId: Long = -1
    private var currentTagHash: String = ""
    private var currentLabel: String = "Alarm"

    override fun onCreate() {
        super.onCreate()
        audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        createNotificationChannel()

        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
            "scanwake:alarm_service_wakelock"
        )
        wakeLock?.acquire(10 * 60 * 1000L) // 10 minutes max fallback
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent == null) return START_NOT_STICKY

        when (intent.action) {
            ACTION_START_ALARM -> {
                currentAlarmId = intent.getLongExtra(AlarmReceiver.EXTRA_ALARM_ID, -1)
                currentLabel = intent.getStringExtra(AlarmReceiver.EXTRA_LABEL) ?: "ScanWake Alarm"
                currentTagId = intent.getLongExtra(AlarmReceiver.EXTRA_TAG_ID, -1)
                currentTagHash = intent.getStringExtra(AlarmReceiver.EXTRA_TAG_HASH) ?: ""
                isStrictLockout = intent.getBooleanExtra(AlarmReceiver.EXTRA_IS_STRICT, true)

                startForeground(NOTIFICATION_ID, buildAlarmNotification(currentLabel))
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
            // 1. Play Alarm Audio on AudioAttributes.USAGE_ALARM
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

            // Maximize alarm stream volume
            audioManager?.let { am ->
                val maxVol = am.getStreamMaxVolume(AudioManager.STREAM_ALARM)
                am.setStreamVolume(AudioManager.STREAM_ALARM, maxVol, 0)
            }

            // 2. Continuous Anti-Cheat Vibration Pattern
            vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vm = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                vm.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            }

            val pattern = longArrayOf(0, 800, 400, 800, 400, 1200, 500)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(pattern, 0)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error starting alarm sound/vibrate", e)
        }
    }

    /**
     * Anti-Cheat Volume Guard
     * Constantly resets volume to MAX if user attempts to lower it or mute
     */
    private fun enforceVolumeLockout() {
        volumeObserver = object : ContentObserver(Handler(Looper.getMainLooper())) {
            override fun onChange(selfChange: Boolean) {
                super.onChange(selfChange)
                audioManager?.let { am ->
                    val maxVol = am.getStreamMaxVolume(AudioManager.STREAM_ALARM)
                    val currentVol = am.getStreamVolume(AudioManager.STREAM_ALARM)
                    if (currentVol < maxVol) {
                        Log.w(TAG, "Anti-cheat: Volume decrease detected! Snapping back to MAX volume.")
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
            putExtra(AlarmReceiver.EXTRA_ALARM_ID, currentAlarmId)
            putExtra(AlarmReceiver.EXTRA_LABEL, label)
            putExtra(AlarmReceiver.EXTRA_TAG_ID, currentTagId)
            putExtra(AlarmReceiver.EXTRA_TAG_HASH, currentTagHash)
            putExtra(AlarmReceiver.EXTRA_IS_STRICT, isStrictLockout)
        }
        val fullScreenPendingIntent = PendingIntent.getActivity(
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
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setOngoing(true)
            .setAutoCancel(false)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "ScanWake Alarm Service",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Active high-priority ringing alarms"
                setSound(null, null) // Audio is handled manually via MediaPlayer with USAGE_ALARM
                enableVibration(false) // Handled by Vibrator
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }
    }

    private fun stopAlarmAndSelf() {
        try {
            volumeObserver?.let { contentResolver.unregisterContentObserver(it) }
            volumeObserver = null

            mediaPlayer?.stop()
            mediaPlayer?.release()
            mediaPlayer = null

            vibrator?.cancel()
            vibrator = null

            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
            wakeLock = null

            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping alarm service", e)
        }
    }

    override fun onDestroy() {
        stopAlarmAndSelf()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        const val TAG = "AlarmRingingService"
        const val CHANNEL_ID = "scanwake_alarm_ringing_channel"
        const val NOTIFICATION_ID = 40401
        const val ACTION_START_ALARM = "com.scanwake.app.ACTION_START_ALARM"
        const val ACTION_STOP_ALARM = "com.scanwake.app.ACTION_STOP_ALARM"
    }
}
