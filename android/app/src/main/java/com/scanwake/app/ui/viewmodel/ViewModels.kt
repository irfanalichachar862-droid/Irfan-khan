package com.scanwake.app.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.scanwake.app.data.model.AlarmChainEntity
import com.scanwake.app.data.model.AlarmEntity
import com.scanwake.app.data.model.RegisteredTagEntity
import com.scanwake.app.data.repository.AlarmRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class AlarmViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = AlarmRepository(application)

    val alarms: StateFlow<List<AlarmEntity>> = repository.allAlarms
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val tags: StateFlow<List<RegisteredTagEntity>> = repository.allTags
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val chains: StateFlow<List<AlarmChainEntity>> = repository.allChains
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun saveAlarm(
        id: Long = 0,
        hour: Int,
        minute: Int,
        label: String,
        daysBitmask: Int,
        targetTagId: Long?,
        snoozeMinutes: Int,
        isStrict: Boolean
    ) {
        viewModelScope.launch {
            val tag = targetTagId?.let { repository.getTag(it) }
            val alarm = AlarmEntity(
                id = id,
                hour = hour,
                minute = minute,
                label = label.ifBlank { "Alarm" },
                daysOfWeekBitmask = daysBitmask,
                isEnabled = true,
                targetTagId = targetTagId,
                targetTagHash = tag?.codeHash,
                snoozeMinutes = snoozeMinutes,
                isStrictLockout = isStrict
            )
            repository.saveAlarm(alarm)
        }
    }

    fun toggleAlarm(alarm: AlarmEntity, enabled: Boolean) {
        viewModelScope.launch {
            repository.toggleAlarm(alarm, enabled)
        }
    }

    fun deleteAlarm(alarm: AlarmEntity) {
        viewModelScope.launch {
            repository.deleteAlarm(alarm)
        }
    }

    fun registerTag(name: String, location: String, rawCode: String, format: String) {
        viewModelScope.launch {
            repository.registerTag(name, location, rawCode, format)
        }
    }

    fun deleteTag(tag: RegisteredTagEntity) {
        viewModelScope.launch {
            repository.deleteTag(tag)
        }
    }
}
