package com.scanwake.app.data.repository

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.scanwake.app.data.database.ScanWakeDatabase
import com.scanwake.app.data.model.AlarmChainEntity
import com.scanwake.app.data.model.AlarmEntity
import com.scanwake.app.data.model.ChainStepEntity
import com.scanwake.app.data.model.RegisteredTagEntity
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
        if (saved.isEnabled) {
            scheduleAlarmSystem(saved)
        } else {
            cancelAlarmSystem(saved)
        }
        return id
    }

    suspend fun toggleAlarm(alarm: AlarmEntity, enabled: Boolean) {
        alarmDao.setAlarmEnabled(alarm.id, enabled)
        val updated = alarm.copy(isEnabled = enabled)
        if (enabled) {
            scheduleAlarmSystem(updated)
        } else {
            cancelAlarmSystem(updated)
        }
    }

    suspend fun deleteAlarm(alarm: AlarmEntity) {
        cancelAlarmSystem(alarm)
        alarmDao.deleteAlarm(alarm)
    }

    suspend fun getAlarm(id: Long): AlarmEntity? = alarmDao.getAlarmById(id)

    suspend fun registerTag(name: String, location: String, rawCode: String, format: String): Long {
        val hash = hashTagValue(rawCode)
        val tag = RegisteredTagEntity(
            name = name,
            locationDescription = location,
            rawCodeValue = rawCode,
            codeHash = hash,
            codeFormat = format
        )
        return tagDao.insertTag(tag)
    }

    suspend fun deleteTag(tag: RegisteredTagEntity) {
        tagDao.deleteTag(tag)
    }

    suspend fun getTag(id: Long): RegisteredTagEntity? = tagDao.getTagById(id)

    suspend fun getTagByHash(hash: String): RegisteredTagEntity? = tagDao.getTagByHash(hash)

    suspend fun createChain(name: String, steps: List<ChainStepEntity>): Long {
        val chain = AlarmChainEntity(
            name = name,
            isActive = false,
            currentStepIndex = 0,
            totalSteps = steps.size
        )
        val chainId = chainDao.insertChain(chain)
        val preparedSteps = steps.map { it.copy(chainId = chainId) }
        stepDao.insertSteps(preparedSteps)
        return chainId
    }

    suspend fun advanceChain(chainId: Long, currentStepIndex: Int): ChainStepEntity? {
        val steps = stepDao.getStepsForChain(chainId)
        val nextIndex = currentStepIndex + 1
        if (nextIndex < steps.size) {
            chainDao.updateChainProgress(chainId, nextIndex, isActive = true)
            val nextStep = steps[nextIndex]
            scheduleChainStep(nextStep)
            return nextStep
        } else {
            // Chain finished!
            chainDao.updateChainProgress(chainId, 0, isActive = false)
            return null
        }
    }

    private fun scheduleChainStep(step: ChainStepEntity) {
        val triggerAtMillis = System.currentTimeMillis() + (step.delayMinutesAfterPrev * 60 * 1000L)
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = AlarmReceiver.ACTION_TRIGGER_ALARM
            putExtra(AlarmReceiver.EXTRA_ALARM_ID, -step.id) // Negative ID for chain step
            putExtra(AlarmReceiver.EXTRA_CHAIN_ID, step.chainId)
            putExtra(AlarmReceiver.EXTRA_STEP_INDEX, step.stepOrder)
            putExtra(AlarmReceiver.EXTRA_STEP_LABEL, step.stepLabel)
            putExtra(AlarmReceiver.EXTRA_TAG_ID, step.targetTagId)
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            (10000 + step.id).toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        setExactAlarm(triggerAtMillis, pendingIntent)
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

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            alarm.id.toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        setExactAlarm(triggerTime, pendingIntent)
        Log.d("AlarmRepository", "Scheduled alarm ${alarm.id} at $triggerTime")
    }

    private fun setExactAlarm(triggerTime: Long, pendingIntent: PendingIntent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (alarmManager.canScheduleExactAlarms()) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                )
            } else {
                alarmManager.setAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                )
            }
        } else {
            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                triggerTime,
                pendingIntent
            )
        }
    }

    fun cancelAlarmSystem(alarm: AlarmEntity) {
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = AlarmReceiver.ACTION_TRIGGER_ALARM
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            alarm.id.toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        alarmManager.cancel(pendingIntent)
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
                // One-time alarm
                if (target.before(now)) {
                    target.add(Calendar.DAY_OF_YEAR, 1)
                }
                return target.timeInMillis
            }

            // Repeating alarm across days bitmask
            val todayDayOfWeek = now.get(Calendar.DAY_OF_WEEK) - 1 // 0=Sunday
            if (((daysBitmask and (1 shl todayDayOfWeek)) != 0) && target.after(now)) {
                return target.timeInMillis
            }

            for (i in 1..7) {
                val candidateDay = (todayDayOfWeek + i) % 7
                if ((daysBitmask and (1 shl candidateDay)) != 0) {
                    target.add(Calendar.DAY_OF_YEAR, i)
                    return target.timeInMillis
                }
            }

            target.add(Calendar.DAY_OF_YEAR, 1)
            return target.timeInMillis
        }
    }
}
