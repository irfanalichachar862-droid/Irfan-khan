package com.scanwake.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.scanwake.app.service.AlarmRingingService
import com.scanwake.app.theme.CharcoalDark
import com.scanwake.app.theme.ScanWakeTheme
import com.scanwake.app.ui.screens.HomeScreen

class ScanWakeApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        setupNotificationChannels()
    }

    private fun setupNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                AlarmRingingService.CHANNEL_ID,
                getString(R.string.notification_channel_alarm_name),
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = getString(R.string.notification_channel_alarm_desc)
                enableLights(true)
                enableVibration(true)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ScanWakeTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = CharcoalDark
                ) {
                    HomeScreen()
                }
            }
        }
    }
}
