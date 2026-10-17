package com.scanwake.app.data.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.scanwake.app.data.dao.AlarmChainDao
import com.scanwake.app.data.dao.AlarmDao
import com.scanwake.app.data.dao.ChainStepDao
import com.scanwake.app.data.dao.RegisteredTagDao
import com.scanwake.app.data.model.AlarmChainEntity
import com.scanwake.app.data.model.AlarmEntity
import com.scanwake.app.data.model.ChainStepEntity
import com.scanwake.app.data.model.RegisteredTagEntity

@Database(
    entities = [
        AlarmEntity::class,
        RegisteredTagEntity::class,
        AlarmChainEntity::class,
        ChainStepEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class ScanWakeDatabase : RoomDatabase() {
    abstract fun alarmDao(): AlarmDao
    abstract fun registeredTagDao(): RegisteredTagDao
    abstract fun alarmChainDao(): AlarmChainDao
    abstract fun chainStepDao(): ChainStepDao

    companion object {
        @Volatile
        private var INSTANCE: ScanWakeDatabase? = null

        fun getDatabase(context: Context): ScanWakeDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    ScanWakeDatabase::class.java,
                    "scanwake_database"
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
