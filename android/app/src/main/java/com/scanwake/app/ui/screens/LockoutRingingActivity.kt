package com.scanwake.app.ui.screens

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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
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

class LockoutRingingActivity : ComponentActivity() {

    private lateinit var repository: AlarmRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        repository = AlarmRepository(this)

        // Enforce anti-cheat screen awake & unlock flags
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
        // Stop the foreground ringing service and sound
        val stopIntent = Intent(this, AlarmRingingService::class.java).apply {
            action = AlarmRingingService.ACTION_STOP_ALARM
        }
        startService(stopIntent)

        // Advance sequential chain if active
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
        // If user presses Home or Overview, anti-cheat immediately bounces Lockout back to front
        val bringBackIntent = Intent(this, LockoutRingingActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
        }
        startActivity(bringBackIntent)
    }
}

@Composable
fun LockoutScreenContent(
    alarmLabel: String,
    targetTagId: Long,
    expectedHash: String,
    chainId: Long,
    stepIndex: Int,
    onDismissSuccess: () -> Unit
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    var targetTag by remember { mutableStateOf<RegisteredTagEntity?>(null) }
    var scanErrorMessage by remember { mutableStateOf<String?>(null) }
    var backAttemptPenaltyCount by remember { mutableIntStateOf(0) }

    // Intercept back gesture completely
    BackHandler(enabled = true) {
        backAttemptPenaltyCount++
        scanErrorMessage = "Back button blocked! Scan physical QR to dismiss alarm."
    }

    // Load target tag details from Room
    LaunchedEffect(targetTagId) {
        if (targetTagId > 0) {
            withContext(Dispatchers.IO) {
                val db = ScanWakeDatabase.getDatabase(context)
                targetTag = db.registeredTagDao().getTagById(targetTagId)
            }
        }
    }

    Scaffold(
        containerColor = CharcoalDark
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Top Lockout Header
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(top = 16.dp)
            ) {
                Surface(
                    color = AlertRed.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(24.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, AlertRed.copy(alpha = 0.5f))
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Lock,
                            contentDescription = null,
                            tint = AlertRed,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "ANTI-CHEAT LOCKOUT ENGAGED",
                            color = AlertRed,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            letterSpacing = 1.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = alarmLabel,
                    color = TextWhite,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Black
                )

                Text(
                    text = if (targetTag != null) {
                        "Target: ${targetTag?.name} (${targetTag?.locationDescription})"
                    } else {
                        "Target: Scan Registered QR Code"
                    },
                    color = NeonCyan,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(top = 4.dp)
                )

                if (chainId != -1L) {
                    Text(
                        text = "Chain Step #${stepIndex + 1} (Sequential Wake-Up)",
                        color = MintAccent,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }
            }

            // Central Camera Scanner Viewport
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(340.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .border(2.dp, NeonCyan, RoundedCornerShape(20.dp)),
                contentAlignment = Alignment.Center
            ) {
                CameraBarcodeScanner(
                    modifier = Modifier.fillMaxSize(),
                    onBarcodeDetected = { scannedRaw, _ ->
                        val computedHash = AlarmRepository.hashTagValue(scannedRaw)
                        val isMatched = if (targetTag != null) {
                            computedHash.equals(targetTag?.codeHash, ignoreCase = true) ||
                                    scannedRaw.trim() == targetTag?.rawCodeValue?.trim()
                        } else {
                            computedHash.equals(expectedHash, ignoreCase = true)
                        }

                        if (isMatched) {
                            onDismissSuccess()
                        } else {
                            scanErrorMessage = "Barcode mismatch! Scan target: ${targetTag?.name ?: "Required QR"}"
                        }
                    }
                )
            }

            // Bottom Alert & Instructions
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(bottom = 16.dp)
            ) {
                AnimatedVisibility(
                    visible = scanErrorMessage != null,
                    enter = fadeIn(),
                    exit = fadeOut()
                ) {
                    Surface(
                        color = AlertRed.copy(alpha = 0.2f),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.padding(bottom = 12.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Warning, contentDescription = null, tint = AlertRed)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = scanErrorMessage ?: "",
                                color = TextWhite,
                                fontSize = 13.sp,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }

                Text(
                    text = "Walk to your registered tag and hold code in reticle.\nVolume down & app switching are locked.",
                    color = TextMuted,
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center,
                    lineHeight = 18.sp
                )
            }
        }
    }
}
