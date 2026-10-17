package com.scanwake.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.scanwake.app.data.model.AlarmEntity
import com.scanwake.app.theme.*
import com.scanwake.app.ui.viewmodel.AlarmViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    alarmViewModel: AlarmViewModel = viewModel()
) {
    val alarms by alarmViewModel.alarms.collectAsState()
    val tags by alarmViewModel.tags.collectAsState()
    var selectedTab by remember { mutableIntStateOf(0) }
    var showAddDialog by remember { mutableStateOf(false) }

    Scaffold(
        containerColor = CharcoalDark,
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = NeonCyan.copy(alpha = 0.15f),
                            modifier = Modifier.padding(end = 10.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.QrCodeScanner,
                                contentDescription = null,
                                tint = NeonCyan,
                                modifier = Modifier.padding(6.dp).size(20.dp)
                            )
                        }
                        Text(
                            text = "ScanWake",
                            fontWeight = FontWeight.Black,
                            letterSpacing = 1.sp,
                            color = TextWhite
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { /* System guard info */ }) {
                        Icon(Icons.Default.Security, contentDescription = "Guard Status", tint = SoftTeal)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = CharcoalDark
                )
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddDialog = true },
                containerColor = NeonCyan,
                contentColor = CharcoalDark,
                shape = CircleShape
            ) {
                Icon(Icons.Default.Add, contentDescription = "New Alarm", modifier = Modifier.size(28.dp))
            }
        },
        bottomBar = {
            NavigationBar(
                containerColor = SlateSurface,
                contentColor = TextWhite
            ) {
                NavigationBarItem(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    icon = { Icon(Icons.Default.Alarm, contentDescription = "Alarms") },
                    label = { Text("Alarms") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = CharcoalDark,
                        indicatorColor = NeonCyan,
                        selectedTextColor = NeonCyan,
                        unselectedIconColor = TextMuted,
                        unselectedTextColor = TextMuted
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    icon = { Icon(Icons.Default.QrCode, contentDescription = "QR Tags") },
                    label = { Text("QR Tags") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = CharcoalDark,
                        indicatorColor = NeonCyan,
                        selectedTextColor = NeonCyan,
                        unselectedIconColor = TextMuted,
                        unselectedTextColor = TextMuted
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 },
                    icon = { Icon(Icons.Default.LinearScale, contentDescription = "Chains") },
                    label = { Text("Chains") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = CharcoalDark,
                        indicatorColor = NeonCyan,
                        selectedTextColor = NeonCyan,
                        unselectedIconColor = TextMuted,
                        unselectedTextColor = TextMuted
                    )
                )
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
        ) {
            when (selectedTab) {
                0 -> AlarmListView(
                    alarms = alarms,
                    onToggle = { alarm, enabled -> alarmViewModel.toggleAlarm(alarm, enabled) },
                    onDelete = { alarm -> alarmViewModel.deleteAlarm(alarm) }
                )
                1 -> TagManagerView(
                    tags = tags,
                    onDeleteTag = { tag -> alarmViewModel.deleteTag(tag) }
                )
                2 -> ChainManagerView()
            }
        }
    }
}

@Composable
fun AlarmListView(
    alarms: List<AlarmEntity>,
    onToggle: (AlarmEntity, Boolean) -> Unit,
    onDelete: (AlarmEntity) -> Unit
) {
    if (alarms.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    Icons.Default.AlarmOff,
                    contentDescription = null,
                    tint = TextMuted,
                    modifier = Modifier.size(56.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "No anti-cheat alarms set",
                    color = TextMuted,
                    fontSize = 16.sp
                )
                Text(
                    text = "Tap + below to create a scan-verified alarm",
                    color = TextMuted.copy(alpha = 0.7f),
                    fontSize = 13.sp
                )
            }
        }
    } else {
        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.fillMaxSize().padding(top = 8.dp)
        ) {
            items(alarms, key = { it.id }) { alarm ->
                AlarmCard(alarm = alarm, onToggle = onToggle, onDelete = onDelete)
            }
        }
    }
}

@Composable
fun AlarmCard(
    alarm: AlarmEntity,
    onToggle: (AlarmEntity, Boolean) -> Unit,
    onDelete: (AlarmEntity) -> Unit
) {
    val formattedTime = "%02d:%02d".format(alarm.hour, alarm.minute)

    Card(
        colors = CardDefaults.cardColors(containerColor = SlateSurface),
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(
                    text = formattedTime,
                    fontSize = 36.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (alarm.isEnabled) TextWhite else TextMuted
                )
                Text(
                    text = alarm.label,
                    fontSize = 14.sp,
                    color = if (alarm.isEnabled) NeonCyan else TextMuted
                )
                Row(
                    modifier = Modifier.padding(top = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.QrCode,
                        contentDescription = null,
                        tint = MintAccent,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = if (alarm.targetTagId != null) "Linked QR Required" else "Any Registered QR",
                        fontSize = 12.sp,
                        color = TextMuted
                    )
                }
            }

            Switch(
                checked = alarm.isEnabled,
                onCheckedChange = { onToggle(alarm, it) },
                colors = SwitchDefaults.colors(
                    checkedThumbColor = CharcoalDark,
                    checkedTrackColor = NeonCyan,
                    uncheckedThumbColor = TextMuted,
                    uncheckedTrackColor = SlateSurfaceVariant
                )
            )
        }
    }
}

@Composable
fun TagManagerView(
    tags: List<com.scanwake.app.data.model.RegisteredTagEntity>,
    onDeleteTag: (com.scanwake.app.data.model.RegisteredTagEntity) -> Unit
) {
    Column(modifier = Modifier.fillMaxSize().padding(top = 8.dp)) {
        Text(
            text = "Registered Physical Tags",
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = TextWhite,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        Text(
            text = "Scan and place these barcodes around your home to force physical wakefulness.",
            fontSize = 13.sp,
            color = TextMuted,
            modifier = Modifier.padding(bottom = 16.dp)
        )
    }
}

@Composable
fun ChainManagerView() {
    Column(modifier = Modifier.fillMaxSize().padding(top = 8.dp)) {
        Text(
            text = "Sequential Wake-Up Chains",
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = TextWhite,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        Text(
            text = "Link multiple alarms consecutively across rooms to prevent falling back to sleep.",
            fontSize = 13.sp,
            color = TextMuted
        )
    }
}
