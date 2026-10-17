package com.scanwake.app.data.dao

import androidx.room.*
import com.scanwake.app.data.model.AlarmChainEntity
import com.scanwake.app.data.model.AlarmEntity
import com.scanwake.app.data.model.ChainStepEntity
import com.scanwake.app.data.model.RegisteredTagEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface AlarmDao {
    @Query("SELECT * FROM alarms ORDER BY hour ASC, minute ASC")
    fun getAllAlarms(): Flow<List<AlarmEntity>>

    @Query("SELECT * FROM alarms WHERE isEnabled = 1")
    suspend fun getEnabledAlarms(): List<AlarmEntity>

    @Query("SELECT * FROM alarms WHERE id = :id LIMIT 1")
    suspend fun getAlarmById(id: Long): AlarmEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAlarm(alarm: AlarmEntity): Long

    @Update
    suspend fun updateAlarm(alarm: AlarmEntity)

    @Delete
    suspend fun deleteAlarm(alarm: AlarmEntity)

    @Query("UPDATE alarms SET isEnabled = :enabled WHERE id = :id")
    suspend fun setAlarmEnabled(id: Long, enabled: Boolean)
}

@Dao
interface RegisteredTagDao {
    @Query("SELECT * FROM registered_tags ORDER BY createdAt DESC")
    fun getAllTags(): Flow<List<RegisteredTagEntity>>

    @Query("SELECT * FROM registered_tags WHERE id = :id LIMIT 1")
    suspend fun getTagById(id: Long): RegisteredTagEntity?

    @Query("SELECT * FROM registered_tags WHERE codeHash = :hash LIMIT 1")
    suspend fun getTagByHash(hash: String): RegisteredTagEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTag(tag: RegisteredTagEntity): Long

    @Delete
    suspend fun deleteTag(tag: RegisteredTagEntity)
}

@Dao
interface AlarmChainDao {
    @Query("SELECT * FROM alarm_chains")
    fun getAllChains(): Flow<List<AlarmChainEntity>>

    @Query("SELECT * FROM alarm_chains WHERE id = :id LIMIT 1")
    suspend fun getChainById(id: Long): AlarmChainEntity?

    @Query("SELECT * FROM alarm_chains WHERE isActive = 1 LIMIT 1")
    suspend fun getActiveChain(): AlarmChainEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertChain(chain: AlarmChainEntity): Long

    @Update
    suspend fun updateChain(chain: AlarmChainEntity)

    @Delete
    suspend fun deleteChain(chain: AlarmChainEntity)

    @Query("UPDATE alarm_chains SET currentStepIndex = :stepIndex, isActive = :isActive WHERE id = :chainId")
    suspend fun updateChainProgress(chainId: Long, stepIndex: Int, isActive: Boolean)
}

@Dao
interface ChainStepDao {
    @Query("SELECT * FROM chain_steps WHERE chainId = :chainId ORDER BY stepOrder ASC")
    suspend fun getStepsForChain(chainId: Long): List<ChainStepEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSteps(steps: List<ChainStepEntity>)

    @Query("DELETE FROM chain_steps WHERE chainId = :chainId")
    suspend fun deleteStepsForChain(chainId: Long)
}
