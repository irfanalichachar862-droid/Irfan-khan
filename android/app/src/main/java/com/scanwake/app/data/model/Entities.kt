package com.scanwake.app.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "alarms")
data class AlarmEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val hour: Int,
    val minute: Int,
    val label: String,
    val daysOfWeekBitmask: Int = 0, // Bit 0=Sun, 1=Mon, ..., 6=Sat
    val isEnabled: Boolean = true,
    val toneUri: String = "default_siren",
    val snoozeMinutes: Int = 0, // 0 = snooze disabled
    val targetTagId: Long? = null,
    val targetTagHash: String? = null,
    val chainId: Long? = null,
    val chainOrder: Int = 0,
    val isStrictLockout: Boolean = true
)

@Entity(tableName = "registered_tags")
data class RegisteredTagEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String,
    val locationDescription: String,
    val rawCodeValue: String,
    val codeHash: String,
    val codeFormat: String = "QR_CODE", // QR_CODE, EAN_13, CODE_128, etc.
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "alarm_chains")
data class AlarmChainEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String,
    val initialAlarmId: Long? = null,
    val isActive: Boolean = false,
    val currentStepIndex: Int = 0,
    val totalSteps: Int = 1
)

@Entity(tableName = "chain_steps")
data class ChainStepEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val chainId: Long,
    val stepOrder: Int,
    val stepLabel: String,
    val targetTagId: Long,
    val delayMinutesAfterPrev: Int = 10
)
