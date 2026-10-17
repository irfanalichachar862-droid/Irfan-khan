package com.scanwake.app.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.util.Log
import com.scanwake.app.data.database.ScanWakeDatabase
import com.scanwake.app.data.repository.AlarmRepository
import com.scanwake.app.service.AlarmRingingService
import com.scanwake.app.ui.screens.LockoutRingingActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class AlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val alarmId = intent.getLongExtra(EXTRA_ALARM_ID, -1L)
        val chainId = intent.getLongExtra(EXTRA_CHAIN_ID, -1L)
        val stepIndex = intent.getIntExtra(EXTRA_STEP_INDEX, 0)
        val label = intent.getStringExtra(EXTRA_LABEL) ?: intent.getStringExtra(EXTRA_STEP_LABEL) ?: "Wake Up"
        val tagId = intent.getLongExtra(EXTRA_TAG_ID, -1L)
        val tagHash = intent.getStringExtra(EXTRA_TAG_HASH) ?: ""
        val isStrict = intent.getBooleanExtra(EXTRA_IS_STRICT, true)

        Log.d(TAG, "Alarm triggered: id=$alarmId, label=$label, tagId=$tagId, chainId=$chainId")

        // Acquire WakeLock so device doesn't sleep while launching service and activity
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        val wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
            "scanwake:alarm_receiver_lock"
        )
        wakeLock.acquire(30000L) // 30 seconds max safety

        // 1. Start High-Priority Foreground Service (Plays Alarm Audio & Haptics)
        val serviceIntent = Intent(context, AlarmRingingService::class.java).apply {
            action = AlarmRingingService.ACTION_START_ALARM
            putExtra(EXTRA_ALARM_ID, alarmId)
            putExtra(EXTRA_LABEL, label)
            putExtra(EXTRA_TAG_ID, tagId)
            putExtra(EXTRA_TAG_HASH, tagHash)
            putExtra(EXTRA_IS_STRICT, isStrict)
            putExtra(EXTRA_CHAIN_ID, chainId)
            putExtra(EXTRA_STEP_INDEX, stepIndex)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent)
        } else {
            context.startService(serviceIntent)
        }

        // 2. Launch Full-Screen Anti-Cheat Lockout Activity
        val activityIntent = Intent(context, LockoutRingingActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            putExtra(EXTRA_ALARM_ID, alarmId)
            putExtra(EXTRA_LABEL, label)
            putExtra(EXTRA_TAG_ID, tagId)
            putExtra(EXTRA_TAG_HASH, tagHash)
            putExtra(EXTRA_IS_STRICT, isStrict)
            putExtra(EXTRA_CHAIN_ID, chainId)
            putExtra(EXTRA_STEP_INDEX, stepIndex)
        }
        context.startActivity(activityIntent)
    }

    companion object {
        const val TAG = "AlarmReceiver"
        const val ACTION_TRIGGER_ALARM = "com.scanwake.app.ACTION_TRIGGER_ALARM"
        const val EXTRA_ALARM_ID = "extra_alarm_id"
        const val EXTRA_CHAIN_ID = "extra_chain_id"
        const val EXTRA_STEP_INDEX = "extra_step_index"
        const val EXTRA_LABEL = "extra_label"
        const val EXTRA_STEP_LABEL = "extra_step_label"
        const val EXTRA_TAG_ID = "extra_tag_id"
        const val EXTRA_TAG_HASH = "extra_tag_hash"
        const val EXTRA_IS_STRICT = "extra_is_strict"
    }
}

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == "android.intent.action.QUICKBOOT_POWERON"
        ) {
            Log.d("BootReceiver", "Device rebooted. Rescheduling all enabled ScanWake alarms...")
            val repo = AlarmRepository(context)
            val db = ScanWakeDatabase.getDatabase(context)

            CoroutineScope(Dispatchers.IO).launch {
                val enabledAlarms = db.alarmDao().getEnabledAlarms()
                for (alarm in enabledAlarms) {
                    repo.scheduleAlarmSystem(alarm)
                }
                Log.d("BootReceiver", "Rescheduled ${enabledAlarms.size} alarms successfully.")
            }
        }
    }
}
