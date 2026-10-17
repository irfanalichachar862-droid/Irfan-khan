import React, { useState, useEffect, useRef } from 'react';
import {
  AlarmClock,
  Check,
  ChevronRight,
  Download,
  ListChecks,
  MoreVertical,
  Music,
  Palette,
  Plus,
  QrCode,
  Shield,
  ShieldAlert,
  Trash2,
  User,
  X,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlarmChain,
  AlarmItem,
  RegisteredTag,
  calculateNextTriggerTime,
  formatTime12Hour,
  formatTimeUntilAlarm,
} from './utils/antiCheatRules';
import { TaskHistoryEntry, TaskItem } from './utils/taskManagerRules';
import { AVAILABLE_TONES } from './utils/audioSynthesizer';
import { AlarmEditorModal } from './components/AlarmEditorModal';
import { TagManagerModal } from './components/TagManagerModal';
import { ChainManagerModal } from './components/ChainManagerModal';
import { LockoutRingingModal } from './components/LockoutRingingModal';
import { SystemGuardsModal } from './components/SystemGuardsModal';
import { ThemeCustomizerModal } from './components/ThemeCustomizerModal';
import { OwnerAndApkTab } from './components/OwnerAndApkTab';
import { TaskManagerTab } from './components/TaskManagerTab';
import { ScanWakeLogo } from './components/ScanWakeLogo';
import {
  downloadTagAsPng,
  downloadTagAsSvg,
  generateBarcodeSvg,
  generateQrSvg,
} from './utils/qrGenerator';
import {
  AppTheme,
  THEME_PRESETS,
  applyThemeToDocument,
} from './utils/themePresets';

const INITIAL_TAGS: RegisteredTag[] = [
  {
    id: 'tag_bath_01',
    name: 'Bathroom Toothpaste',
    location: 'Master Bathroom Shelf',
    codeValue: 'BATH-TOOTHPASTE-8821',
    codeFormat: 'QR_CODE',
    codeHash: 'sw_49a8f10255b1e9c2',
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'tag_kitchen_02',
    name: 'Kitchen Coffee Canister',
    location: 'Kitchen Counter Bar',
    codeValue: '7622210449283',
    codeFormat: 'EAN_13',
    codeHash: 'sw_1a98bc3388fa9012',
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'tag_balcony_03',
    name: 'Balcony Plant Stand',
    location: 'East Balcony (Morning Sun)',
    codeValue: 'BALCONY-PLANT-091',
    codeFormat: 'CODE_128',
    codeHash: 'sw_39bcde88f00124ca',
    createdAt: Date.now() - 43200000,
  },
];

const INITIAL_ALARMS: AlarmItem[] = [
  {
    id: 'alarm_1',
    hour: 6,
    minute: 30,
    label: 'Physical Wake-Up',
    daysOfWeek: [1, 2, 3, 4, 5],
    isEnabled: true,
    targetTagId: 'tag_bath_01',
    toneId: 'loud_siren',
    snoozeMinutes: 0,
    isStrictLockout: true,
  },
  {
    id: 'alarm_2',
    hour: 19,
    minute: 15,
    label: 'Evening Study Lock',
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    isEnabled: true,
    targetTagId: 'tag_kitchen_02',
    toneId: 'high_tech_pulse',
    snoozeMinutes: 0,
    isStrictLockout: true,
  },
];

const INITIAL_CHAINS: AlarmChain[] = [
  {
    id: 'chain_iron_morning',
    name: 'Iron Morning 3-Room Chain',
    initialAlarmHour: 6,
    initialAlarmMinute: 30,
    isActive: true,
    currentStepIndex: 0,
    steps: [
      {
        id: 'step_1',
        stepIndex: 0,
        label: 'Step 1: Bathroom Toothpaste',
        targetTagId: 'tag_bath_01',
        delayMinutesAfterPrev: 0,
      },
      {
        id: 'step_2',
        stepIndex: 1,
        label: 'Step 2: Kitchen Coffee Canister',
        targetTagId: 'tag_kitchen_02',
        delayMinutesAfterPrev: 8,
      },
      {
        id: 'step_3',
        stepIndex: 2,
        label: 'Step 3: Balcony Sunrise Sunlight',
        targetTagId: 'tag_balcony_03',
        delayMinutesAfterPrev: 12,
      },
    ],
  },
];

const INITIAL_TASKS: TaskItem[] = [
  {
    id: 'task_morning_01',
    title: 'Post-Wake Hydration & Mobility Routine',
    notes: 'Complete immediately after scanning Bathroom Toothpaste QR code.',
    category: 'Morning Routine',
    priority: 'high',
    status: 'in_progress',
    dueTime12h: '06:40 AM',
    dueDate: new Date().toISOString().split('T')[0],
    estimatedMinutes: 20,
    trackedSeconds: 420,
    isRecurringDaily: true,
    linkedTagId: 'tag_bath_01',
    subtasks: [
      { id: 'sub_1', title: 'Drink 500ml water with electrolytes', completed: true },
      { id: 'sub_2', title: '10-minute full-body stretch on balcony', completed: false },
      { id: 'sub_3', title: 'Review top 3 priorities for today', completed: false },
    ],
    createdAt: Date.now() - 3600000 * 5,
  },
  {
    id: 'task_study_02',
    title: 'Deep Focus Architecture & Coding Sprint',
    notes: 'Zero-distraction engineering session with live timer tracking.',
    category: 'Work & Study',
    priority: 'high',
    status: 'pending',
    dueTime12h: '09:30 AM',
    dueDate: new Date().toISOString().split('T')[0],
    estimatedMinutes: 60,
    trackedSeconds: 0,
    isRecurringDaily: false,
    linkedTagId: 'tag_kitchen_02',
    subtasks: [
      { id: 'sub_4', title: 'Complete core logic & unit test suite', completed: false },
      { id: 'sub_5', title: 'Review pull requests and documentation', completed: false },
    ],
    createdAt: Date.now() - 3600000 * 3,
  },
  {
    id: 'task_fitness_03',
    title: 'Evening Strength & Cardio Conditioning',
    notes: '45-minute progressive overload training session.',
    category: 'Health & Fitness',
    priority: 'medium',
    status: 'completed',
    dueTime12h: '06:00 PM',
    dueDate: new Date().toISOString().split('T')[0],
    estimatedMinutes: 45,
    trackedSeconds: 2640,
    isRecurringDaily: true,
    subtasks: [
      { id: 'sub_6', title: 'Warm-up & dynamic stretching (10m)', completed: true },
      { id: 'sub_7', title: 'Main strength training circuit (35m)', completed: true },
    ],
    createdAt: Date.now() - 3600000 * 12,
    completedAt: Date.now() - 3600000 * 2,
  },
];

const INITIAL_TASK_HISTORY: TaskHistoryEntry[] = [
  {
    id: 'hist_init_1',
    taskId: 'task_fitness_03',
    taskTitle: 'Evening Strength & Cardio Conditioning',
    category: 'Health & Fitness',
    priority: 'medium',
    action: 'completed',
    timestamp: Date.now() - 3600000 * 2,
    durationSeconds: 2640,
    details: 'Completed task (44m 00s tracked)',
  },
  {
    id: 'hist_init_2',
    taskId: 'task_morning_01',
    taskTitle: 'Post-Wake Hydration & Mobility Routine',
    category: 'Morning Routine',
    priority: 'high',
    action: 'started_tracking',
    timestamp: Date.now() - 3600000,
    durationSeconds: 420,
    details: 'Started live focus timer session after morning QR wake-up',
  },
  {
    id: 'hist_init_3',
    taskId: 'task_study_02',
    taskTitle: 'Deep Focus Architecture & Coding Sprint',
    category: 'Work & Study',
    priority: 'high',
    action: 'created',
    timestamp: Date.now() - 3600000 * 3,
    details: 'Created task (Work & Study · Due 09:30 AM)',
  },
];

type TabId = 'alarms' | 'tasks' | 'tags' | 'chains' | 'owner';

export default function App() {
  const [alarms, setAlarms] = useState<AlarmItem[]>(() => {
    const saved = localStorage.getItem('scanwake_alarms');
    return saved ? JSON.parse(saved) : INITIAL_ALARMS;
  });

  const [tags, setTags] = useState<RegisteredTag[]>(() => {
    const saved = localStorage.getItem('scanwake_tags');
    return saved ? JSON.parse(saved) : INITIAL_TAGS;
  });

  const [chains, setChains] = useState<AlarmChain[]>(() => {
    const saved = localStorage.getItem('scanwake_chains');
    return saved ? JSON.parse(saved) : INITIAL_CHAINS;
  });

  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    const saved = localStorage.getItem('scanwake_tasks');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });

  const [taskHistory, setTaskHistory] = useState<TaskHistoryEntry[]>(() => {
    const saved = localStorage.getItem('scanwake_task_history');
    return saved ? JSON.parse(saved) : INITIAL_TASK_HISTORY;
  });

  const [currentTheme, setCurrentTheme] = useState<AppTheme>(() => {
    const saved = localStorage.getItem('scanwake_theme');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {}
    }
    return THEME_PRESETS[0];
  });

  const [activeTab, setActiveTab] = useState<TabId>('alarms');

  // 3-Dots Slidebar Navigation Drawer & Floating + Menu States
  const [isSlidebarOpen, setIsSlidebarOpen] = useState<boolean>(false);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState<boolean>(false);
  const [taskCreateTrigger, setTaskCreateTrigger] = useState<number>(0);

  // Modal Dialog States
  const [editingAlarm, setEditingAlarm] = useState<AlarmItem | null>(null);
  const [showAlarmEditor, setShowAlarmEditor] = useState<boolean>(false);
  const [showTagManager, setShowTagManager] = useState<boolean>(false);
  const [showChainManager, setShowChainManager] = useState<boolean>(false);
  const [showGuardsModal, setShowGuardsModal] = useState<boolean>(false);
  const [showThemeModal, setShowThemeModal] = useState<boolean>(false);

  // Active Ringing Alarm State
  const [ringingAlarm, setRingingAlarm] = useState<{
    alarm: AlarmItem;
    chainInfo?: { chainId: string; chainName: string; stepIndex: number; totalSteps: number };
  } | null>(null);

  const [chainToast, setChainToast] = useState<string | null>(null);
  const lastTriggeredKeyRef = useRef<string>('');

  // Current real-time clock & Automatic Scheduled Alarm Trigger Engine
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      const h = now.getHours();
      const m = now.getMinutes();
      const day = now.getDay();

      alarms.forEach((alarm) => {
        if (!alarm.isEnabled) return;
        const matchesDay =
          alarm.daysOfWeek.length === 0 || alarm.daysOfWeek.includes(day);
        if (matchesDay && alarm.hour === h && alarm.minute === m) {
          const triggerKey = `${alarm.id}_${now.toDateString()}_${h}_${m}`;
          if (lastTriggeredKeyRef.current !== triggerKey && !ringingAlarm) {
            lastTriggeredKeyRef.current = triggerKey;
            setRingingAlarm({ alarm });
          }
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [alarms, ringingAlarm]);

  // Apply theme CSS variables
  useEffect(() => {
    applyThemeToDocument(currentTheme);
    localStorage.setItem('scanwake_theme', JSON.stringify(currentTheme));
  }, [currentTheme]);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('scanwake_alarms', JSON.stringify(alarms));
  }, [alarms]);

  useEffect(() => {
    localStorage.setItem('scanwake_tags', JSON.stringify(tags));
  }, [tags]);

  useEffect(() => {
    localStorage.setItem('scanwake_chains', JSON.stringify(chains));
  }, [chains]);

  useEffect(() => {
    localStorage.setItem('scanwake_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('scanwake_task_history', JSON.stringify(taskHistory));
  }, [taskHistory]);

  // Alarm management
  const handleSaveAlarm = (data: Omit<AlarmItem, 'id'> & { id?: string }) => {
    if (data.id) {
      setAlarms(
        alarms.map((a) => (a.id === data.id ? ({ ...data, id: data.id } as AlarmItem) : a))
      );
    } else {
      const newAlarm: AlarmItem = {
        ...data,
        id: `alarm_${Date.now()}`,
      };
      setAlarms([...alarms, newAlarm]);
    }
    setShowAlarmEditor(false);
    setEditingAlarm(null);
  };

  const handleToggleAlarm = (id: string) => {
    setAlarms(alarms.map((a) => (a.id === id ? { ...a, isEnabled: !a.isEnabled } : a)));
  };

  const handleDeleteAlarm = (id: string) => {
    setAlarms(alarms.filter((a) => a.id !== id));
  };

  const handleToggleChain = (chainId: string) => {
    setChains(
      chains.map((c) => (c.id === chainId ? { ...c, isActive: !c.isActive } : c))
    );
  };

  const handleDismissRinging = () => {
    if (ringingAlarm?.chainInfo) {
      const chain = chains.find((c) => c.id === ringingAlarm.chainInfo?.chainId);
      if (chain) {
        const nextOrder = ringingAlarm.chainInfo.stepIndex + 1;
        if (nextOrder < chain.steps.length) {
          const nextStep = chain.steps[nextOrder];
          setChainToast(
            `Chain Step ${ringingAlarm.chainInfo.stepIndex + 1} verified! Next alarm "${
              nextStep.label
            }" scheduled in ${nextStep.delayMinutesAfterPrev}m.`
          );
          setTimeout(() => setChainToast(null), 6000);
        }
      }
    }
    setRingingAlarm(null);
  };

  const targetTagForRinging = ringingAlarm
    ? tags.find((t) => t.id === ringingAlarm.alarm.targetTagId)
    : undefined;

  const getToneDisplayName = (alarm: AlarmItem) => {
    if (alarm.toneId === 'custom_audio' && alarm.customToneName) {
      return `Custom: ${alarm.customToneName}`;
    }
    if (alarm.toneId === 'custom_synth') {
      return `Synth (${alarm.customToneFreq || 680} Hz)`;
    }
    const found = AVAILABLE_TONES.find((t) => t.id === alarm.toneId);
    return found ? found.name : 'Emergency Siren';
  };

  const navItems: {
    id: TabId;
    label: string;
    subtitle: string;
    count?: number;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'alarms',
      label: 'Alarms',
      subtitle: '12-hour AM/PM schedules & QR lockouts',
      count: alarms.length,
      icon: <AlarmClock className="w-4 h-4" />,
    },
    {
      id: 'tasks',
      label: 'Tasks & Tracker',
      subtitle: 'Create tasks, live focus timer & history log',
      count: tasks.length,
      icon: <ListChecks className="w-4 h-4" />,
    },
    {
      id: 'tags',
      label: 'QR Tags',
      subtitle: 'Registered room barcodes & printable QRs',
      count: tags.length,
      icon: <QrCode className="w-4 h-4" />,
    },
    {
      id: 'chains',
      label: 'Wake-Up Chains',
      subtitle: 'Multi-room sequential wake-up steps',
      count: chains.length,
      icon: <Zap className="w-4 h-4" />,
    },
    {
      id: 'owner',
      label: 'Irfan Khan',
      subtitle: 'Owner profile & Android APK export',
      icon: <User className="w-4 h-4" />,
    },
  ];

  const activeNavMeta = navItems.find((i) => i.id === activeTab) || navItems[0];

  const handleSelectTab = (tabId: TabId) => {
    setActiveTab(tabId);
    setIsSlidebarOpen(false);
    setIsFabMenuOpen(false);
  };

  return (
    <div
      style={{ backgroundColor: 'var(--sw-bg)' }}
      className="min-h-screen w-full max-w-full overflow-x-hidden text-white font-sans flex flex-col"
    >
      {/* Top Application Bar — Clean, Spacious, No APK Button on Top, 3-Dots Slidebar Toggle */}
      <header
        style={{ backgroundColor: 'color-mix(in srgb, var(--sw-bg) 92%, transparent)' }}
        className="border-b border-gray-800/80 backdrop-blur-md sticky top-0 z-30 px-3.5 sm:px-6 py-2.5"
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Brand Logo (Clock + Task + QR Code) + Current View Indicator */}
          <div className="flex items-center space-x-2.5 min-w-0">
            <ScanWakeLogo size={38} />
            <div className="truncate">
              <div className="flex items-center space-x-2">
                <span className="font-black text-base sm:text-lg tracking-wider text-white">
                  ScanWake
                </span>
                <span aria-hidden="true" className="text-gray-600">
                  ·
                </span>
                <span
                  style={{ color: 'var(--sw-primary)' }}
                  className="text-xs sm:text-sm font-bold truncate"
                >
                  {activeNavMeta.label}
                </span>
              </div>
              <p className="text-[11px] text-[#8C9BA8] hidden sm:block truncate">
                {activeNavMeta.subtitle}
              </p>
            </div>
          </div>

          {/* Right: 12h Clock + Themes + 3-Dots Slidebar Menu Button (No APK button on top) */}
          <div className="flex items-center space-x-2 shrink-0">
            <div
              style={{ backgroundColor: 'var(--sw-surface)', color: 'var(--sw-accent)' }}
              className="hidden sm:flex items-center px-3 py-1.5 rounded-xl border border-gray-800 text-xs font-mono tabular-nums"
            >
              <span>
                {currentTime.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true,
                })}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowThemeModal(true)}
              style={{
                backgroundColor: 'var(--sw-surface)',
                color: 'var(--sw-primary)',
              }}
              className="py-2 px-2.5 sm:px-3 rounded-xl border border-gray-800 hover:border-gray-700 text-xs font-bold flex items-center space-x-1.5"
              title="Customize Theme & Colors"
            >
              <Palette className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Themes</span>
            </button>

            {/* 3-Dots Toggle Slidebar Button */}
            <button
              type="button"
              aria-label="Open Navigation Menu"
              onClick={() => setIsSlidebarOpen(true)}
              style={{
                backgroundColor: 'var(--sw-primary)',
                color: 'var(--sw-bg)',
              }}
              className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold flex items-center space-x-1 shadow-sm"
              title="Open Navigation Slidebar"
            >
              <MoreVertical className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Menu</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3-Dots Slidebar Drawer Overlay */}
      <AnimatePresence>
        {isSlidebarOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setIsSlidebarOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            />

            {/* Slidebar Panel */}
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Navigation Slidebar"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              style={{
                backgroundColor: 'var(--sw-surface)',
                borderColor: 'color-mix(in srgb, var(--sw-primary) 30%, transparent)',
              }}
              className="relative z-10 w-80 max-w-[86vw] h-full border-l p-5 flex flex-col justify-between overflow-y-auto no-scrollbar shadow-2xl"
            >
              <div className="space-y-5">
                {/* Slidebar Top Header */}
                <div className="flex items-center justify-between pb-3.5 border-b border-gray-800">
                  <div className="flex items-center space-x-2.5">
                    <ScanWakeLogo size={36} />
                    <div>
                      <div className="text-sm font-black text-white">ScanWake Menu</div>
                      <div className="text-[11px] text-gray-400">
                        Select workspace section
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Close Navigation Menu"
                    onClick={() => setIsSlidebarOpen(false)}
                    style={{ backgroundColor: 'var(--sw-bg)' }}
                    className="p-2 rounded-xl border border-gray-800 text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* All 5 Navigation Tabs inside Slidebar */}
                <nav className="space-y-2" aria-label="Main Navigation Tabs">
                  <div className="text-[11px] font-semibold text-gray-400 px-1">
                    Workspace Tabs
                  </div>
                  {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectTab(item.id)}
                        style={
                          isActive
                            ? {
                                backgroundColor: 'var(--sw-primary)',
                                color: 'var(--sw-bg)',
                              }
                            : { backgroundColor: 'var(--sw-bg)' }
                        }
                        className={`w-full p-3 rounded-xl text-left flex items-center justify-between transition border ${
                          isActive
                            ? 'border-transparent shadow-md'
                            : 'border-gray-800/90 text-gray-200 hover:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div
                            style={
                              isActive
                                ? {
                                    backgroundColor: 'rgba(11,14,17,0.15)',
                                    color: 'var(--sw-bg)',
                                  }
                                : {
                                    backgroundColor: 'var(--sw-surface)',
                                    color: 'var(--sw-primary)',
                                  }
                            }
                            className="p-2 rounded-lg shrink-0"
                          >
                            {item.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-bold truncate">
                              {item.label}
                            </div>
                            <div
                              className={`text-[11px] truncate ${
                                isActive ? 'opacity-80' : 'text-gray-400'
                              }`}
                            >
                              {item.subtitle}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                          {typeof item.count === 'number' && (
                            <span
                              className={`text-xs font-mono font-bold tabular-nums ${
                                isActive ? '' : 'text-gray-400'
                              }`}
                            >
                              {item.count}
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 opacity-75" />
                        </div>
                      </button>
                    );
                  })}
                </nav>

                {/* Quick Tools & System Settings inside Slidebar */}
                <div className="pt-3 border-t border-gray-800 space-y-2">
                  <div className="text-[11px] font-semibold text-gray-400 px-1">
                    System &amp; Appearance
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSlidebarOpen(false);
                      setShowThemeModal(true);
                    }}
                    style={{ backgroundColor: 'var(--sw-bg)' }}
                    className="w-full p-3 rounded-xl border border-gray-800 hover:border-gray-700 text-left flex items-center justify-between text-xs font-bold text-gray-200"
                  >
                    <span className="flex items-center space-x-2.5">
                      <Palette className="w-4 h-4" style={{ color: 'var(--sw-primary)' }} />
                      <span>Theme &amp; Color Customizer</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSlidebarOpen(false);
                      setShowGuardsModal(true);
                    }}
                    style={{ backgroundColor: 'var(--sw-bg)' }}
                    className="w-full p-3 rounded-xl border border-gray-800 hover:border-gray-700 text-left flex items-center justify-between text-xs font-bold text-gray-200"
                  >
                    <span className="flex items-center space-x-2.5">
                      <Shield className="w-4 h-4" style={{ color: 'var(--sw-primary)' }} />
                      <span>Anti-Cheat System Guards</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Slidebar Owner Footer */}
              <div
                style={{ backgroundColor: 'var(--sw-bg)' }}
                className="mt-6 p-3.5 rounded-xl border border-gray-800 text-xs space-y-0.5"
              >
                <div className="font-bold text-white">Irfan Khan</div>
                <div className="font-mono text-[11px]" style={{ color: 'var(--sw-accent)' }}>
                  irfanalichachar862@gmail.com
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Chain Toast Banner */}
      {chainToast && (
        <div className="max-w-5xl mx-auto w-full px-3.5 sm:px-6 pt-3">
          <div
            style={{
              backgroundColor: 'var(--sw-surface)',
              borderColor: 'var(--sw-primary)',
            }}
            className="p-3 rounded-xl border text-xs font-semibold text-white flex items-center justify-between"
          >
            <span>{chainToast}</span>
            <button
              onClick={() => setChainToast(null)}
              className="text-gray-400 hover:text-white ml-2"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Content Container — Expanded Full Space (No Horizontal Tab Bar Clutter) */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-3.5 sm:px-6 py-4 sm:py-6 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            {/* TAB 1: ALARMS LIST VIEW (12-Hour with AM/PM) */}
            {activeTab === 'alarms' && (
              <div className="space-y-3.5">
                {alarms.length === 0 ? (
                  <div
                    style={{ backgroundColor: 'var(--sw-surface)' }}
                    className="p-10 text-center rounded-2xl border border-gray-800"
                  >
                    <AlarmClock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-gray-300">
                      No Alarms Configured
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                      Tap the floating + button to schedule an anti-cheat alarm that requires
                      scanning a physical barcode.
                    </p>
                    <button
                      onClick={() => setShowAlarmEditor(true)}
                      style={{ backgroundColor: 'var(--sw-primary)', color: 'var(--sw-bg)' }}
                      className="mt-4 py-2 px-4 rounded-xl text-xs font-bold"
                    >
                      Create First Alarm
                    </button>
                  </div>
                ) : (
                  alarms.map((alarm) => {
                    const boundTag = tags.find((t) => t.id === alarm.targetTagId);
                    const nextTriggerMs = calculateNextTriggerTime(
                      alarm.hour,
                      alarm.minute,
                      alarm.daysOfWeek
                    );
                    const timeRemaining = formatTimeUntilAlarm(nextTriggerMs);
                    const { timeText, period } = formatTime12Hour(alarm.hour, alarm.minute);

                    return (
                      <div
                        key={alarm.id}
                        style={{
                          backgroundColor: 'var(--sw-surface)',
                          borderColor: alarm.isEnabled
                            ? 'color-mix(in srgb, var(--sw-primary) 40%, transparent)'
                            : '#1f2937',
                        }}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                          alarm.isEnabled ? 'shadow-md' : 'opacity-70'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                          {/* Left: 12-Hour Time + AM/PM & Details */}
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-baseline flex-wrap gap-x-2.5 gap-y-1">
                              <div className="flex items-baseline space-x-1.5">
                                <span
                                  className={`text-3xl sm:text-5xl font-black tracking-tight tabular-nums ${
                                    alarm.isEnabled ? 'text-white' : 'text-gray-500'
                                  }`}
                                >
                                  {timeText}
                                </span>
                                <span
                                  style={{
                                    color: alarm.isEnabled ? 'var(--sw-primary)' : '#6b7280',
                                    backgroundColor: 'var(--sw-bg)',
                                  }}
                                  className="text-xs sm:text-sm font-black px-2 py-0.5 rounded-md border border-gray-800 uppercase"
                                >
                                  {period}
                                </span>
                              </div>
                              <span
                                style={{ color: 'var(--sw-accent)' }}
                                className="text-xs font-mono"
                              >
                                {alarm.isEnabled ? `Rings ${timeRemaining}` : 'Disabled'}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-300">
                              <span className="text-sm font-semibold text-white">
                                {alarm.label}
                              </span>
                              {alarm.isStrictLockout && (
                                <>
                                  <span aria-hidden="true" className="text-gray-600">
                                    ·
                                  </span>
                                  <span className="inline-flex items-center space-x-1 text-red-400 font-semibold">
                                    <ShieldAlert className="w-3 h-3" />
                                    <span>Strict Lockout</span>
                                  </span>
                                </>
                              )}
                              <span aria-hidden="true" className="text-gray-600">
                                ·
                              </span>
                              <span className="inline-flex items-center space-x-1 text-gray-300">
                                <Music
                                  className="w-3 h-3"
                                  style={{ color: 'var(--sw-primary)' }}
                                />
                                <span className="truncate max-w-[160px]">
                                  {getToneDisplayName(alarm)}
                                </span>
                              </span>
                            </div>

                            {/* Physical Tag Requirement + Days */}
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {boundTag ? (
                                <div
                                  style={{
                                    backgroundColor: 'var(--sw-bg)',
                                    color: 'var(--sw-accent)',
                                  }}
                                  className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border border-gray-800 text-xs max-w-full"
                                >
                                  <QrCode
                                    className="w-3.5 h-3.5 shrink-0"
                                    style={{ color: 'var(--sw-primary)' }}
                                  />
                                  <span className="font-medium truncate">
                                    Target: {boundTag.name} ({boundTag.location})
                                  </span>
                                </div>
                              ) : (
                                <div
                                  style={{ backgroundColor: 'var(--sw-bg)' }}
                                  className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-gray-400 text-xs"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                  <span>Any Registered Tag</span>
                                </div>
                              )}

                              {/* Days Selector Indicators */}
                              <div className="flex items-center space-x-1">
                                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
                                  const dayIndex = idx === 6 ? 0 : idx + 1;
                                  const isDayActive = alarm.daysOfWeek.includes(dayIndex);
                                  return (
                                    <span
                                      key={idx}
                                      style={
                                        isDayActive
                                          ? {
                                              backgroundColor:
                                                'color-mix(in srgb, var(--sw-primary) 20%, transparent)',
                                              color: 'var(--sw-primary)',
                                              borderColor:
                                                'color-mix(in srgb, var(--sw-primary) 45%, transparent)',
                                            }
                                          : undefined
                                      }
                                      className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center ${
                                        isDayActive
                                          ? 'border'
                                          : 'bg-gray-800/90 text-gray-500'
                                      }`}
                                    >
                                      {day}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Right: Edit, Delete & Toggle Switch */}
                          <div className="flex items-center justify-end space-x-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-800/60">
                            <button
                              onClick={() => {
                                setEditingAlarm(alarm);
                                setShowAlarmEditor(true);
                              }}
                              className="py-1.5 px-3 text-xs font-semibold text-gray-300 hover:text-white rounded-lg bg-[#0B0E11] border border-gray-800 hover:border-gray-600 transition"
                              title="Edit Alarm"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => handleDeleteAlarm(alarm.id)}
                              aria-label={`Delete alarm ${alarm.label}`}
                              className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-gray-800 transition"
                              title="Delete Alarm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            {/* Toggle */}
                            <button
                              type="button"
                              aria-label={`Toggle alarm ${alarm.label}`}
                              onClick={() => handleToggleAlarm(alarm.id)}
                              style={{
                                backgroundColor: alarm.isEnabled
                                  ? 'var(--sw-primary)'
                                  : '#374151',
                              }}
                              className="w-12 h-7 flex items-center rounded-full p-1 cursor-pointer transition-colors"
                            >
                              <div
                                style={{ backgroundColor: 'var(--sw-bg)' }}
                                className={`w-5 h-5 rounded-full shadow-md transform transition-transform ${
                                  alarm.isEnabled ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 2: TASKS MANAGER, LIVE TRACKER & TASK HISTORY */}
            {activeTab === 'tasks' && (
              <TaskManagerTab
                tasks={tasks}
                history={taskHistory}
                registeredTags={tags}
                onUpdateTasks={setTasks}
                onUpdateHistory={setTaskHistory}
                externalCreateTrigger={taskCreateTrigger}
              />
            )}

            {/* TAB 3: REGISTERED PHYSICAL QR TAGS (with Download PNG & SVG) */}
            {activeTab === 'tags' && (
              <div>
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Registered Physical Barcodes &amp; QR Codes
                    </h3>
                    <p className="text-xs text-gray-400">
                      Download and print these QR codes to place in your bathroom, kitchen, or
                      study.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTagManager(true)}
                    style={{ backgroundColor: 'var(--sw-secondary)', color: 'var(--sw-bg)' }}
                    className="py-2 px-3.5 rounded-xl text-xs font-bold shrink-0 flex items-center space-x-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Manage Tags</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tags.map((tag) => (
                    <div
                      key={tag.id}
                      style={{ backgroundColor: 'var(--sw-surface)' }}
                      className="p-4 rounded-2xl border border-gray-800 hover:border-[var(--sw-primary)] transition flex flex-col justify-between space-y-3.5"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div
                            style={{
                              backgroundColor: 'var(--sw-bg)',
                              color: 'var(--sw-primary)',
                            }}
                            className="p-2.5 rounded-xl border border-gray-800"
                          >
                            <QrCode className="w-5 h-5" />
                          </div>
                          <span
                            style={{ color: 'var(--sw-accent)' }}
                            className="text-xs font-mono"
                          >
                            {tag.codeFormat}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-sm text-white">{tag.name}</h4>
                          <p className="text-xs text-gray-400 mt-0.5">{tag.location}</p>
                        </div>

                        <div
                          style={{ backgroundColor: 'var(--sw-bg)' }}
                          className="p-2 rounded-lg font-mono text-[11px] text-gray-400 break-all"
                        >
                          Code: <span className="text-white">{tag.codeValue}</span>
                        </div>
                      </div>

                      {/* Scannable SVG Preview Thumbnail */}
                      <div className="bg-white p-2.5 rounded-xl flex items-center justify-center">
                        {tag.codeFormat === 'QR_CODE' ? (
                          <div
                            dangerouslySetInnerHTML={{
                              __html: generateQrSvg(tag.codeValue, 130),
                            }}
                          />
                        ) : (
                          <div
                            dangerouslySetInnerHTML={{
                              __html: generateBarcodeSvg(
                                tag.codeValue,
                                tag.codeFormat,
                                180,
                                60
                              ),
                            }}
                          />
                        )}
                      </div>

                      {/* Download QR Code Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => downloadTagAsPng(tag)}
                          style={{
                            backgroundColor: 'var(--sw-primary)',
                            color: 'var(--sw-bg)',
                          }}
                          className="py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 hover:opacity-90"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download PNG</span>
                        </button>
                        <button
                          onClick={() => downloadTagAsSvg(tag)}
                          style={{ backgroundColor: 'var(--sw-bg)' }}
                          className="py-2 px-3 rounded-xl border border-gray-700 hover:border-gray-500 text-xs font-semibold text-gray-200 transition flex items-center justify-center space-x-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>SVG</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: SEQUENTIAL WAKE-UP CHAINS */}
            {activeTab === 'chains' && (
              <div className="space-y-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Sequential Wake-Up Chains (Anti-Relapse)
                    </h3>
                    <p className="text-xs text-gray-400">
                      Link multiple physical locations across your home to prevent falling back to
                      sleep.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowChainManager(true)}
                    style={{ backgroundColor: 'var(--sw-secondary)', color: 'var(--sw-bg)' }}
                    className="py-2 px-3.5 rounded-xl text-xs font-bold shrink-0 flex items-center space-x-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Build Chain</span>
                  </button>
                </div>

                {chains.map((chain) => (
                  <div
                    key={chain.id}
                    style={{ backgroundColor: 'var(--sw-surface)' }}
                    className="p-4 sm:p-5 rounded-2xl border border-gray-800 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-2.5">
                        <div
                          style={{
                            backgroundColor:
                              'color-mix(in srgb, var(--sw-secondary) 15%, transparent)',
                            color: 'var(--sw-secondary)',
                            borderColor:
                              'color-mix(in srgb, var(--sw-secondary) 35%, transparent)',
                          }}
                          className="p-2 rounded-xl border shrink-0"
                        >
                          <Zap className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm sm:text-base text-white">
                            {chain.name}
                          </h4>
                          <span className="text-xs text-gray-400">
                            {chain.steps.length} Linked Sequential Locations
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleChain(chain.id)}
                        style={
                          chain.isActive
                            ? { backgroundColor: 'var(--sw-primary)', color: 'var(--sw-bg)' }
                            : { backgroundColor: 'var(--sw-bg)' }
                        }
                        className={`py-2 px-4 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 border ${
                          chain.isActive
                            ? 'border-transparent shadow-sm'
                            : 'border-gray-700 text-gray-300'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{chain.isActive ? 'Active Chain' : 'Enable Chain'}</span>
                      </button>
                    </div>

                    {/* Timeline flow */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      {chain.steps.map((step, idx) => {
                        const tag = tags.find((t) => t.id === step.targetTagId);
                        return (
                          <div
                            key={step.id}
                            style={{ backgroundColor: 'var(--sw-bg)' }}
                            className="p-3.5 rounded-xl border border-gray-800 flex flex-col justify-between"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span
                                style={{
                                  backgroundColor:
                                    'color-mix(in srgb, var(--sw-primary) 20%, transparent)',
                                  color: 'var(--sw-primary)',
                                  borderColor:
                                    'color-mix(in srgb, var(--sw-primary) 40%, transparent)',
                                }}
                                className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center border"
                              >
                                {idx + 1}
                              </span>
                              <span className="text-[10px] text-gray-400 font-mono">
                                {idx === 0
                                  ? 'Starts Chain'
                                  : `+${step.delayMinutesAfterPrev}m delay`}
                              </span>
                            </div>
                            <div className="text-xs font-bold text-white truncate">
                              {step.label}
                            </div>
                            <div
                              style={{ color: 'var(--sw-accent)' }}
                              className="text-[11px] truncate mt-0.5"
                            >
                              {tag ? `${tag.name}` : 'Registered Tag'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 5: OWNER PROFILE (IRFAN KHAN) & ANDROID MOBILE APK EXPORT */}
            {activeTab === 'owner' && (
              <OwnerAndApkTab
                alarms={alarms}
                tags={tags}
                chains={chains}
                tasks={tasks}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* FLOATING (+) PLUS ACTION BUTTON FOR NEW ALARM & NEW TASK WITH SEAMLESS ANIMATION */}
      <div className="fixed bottom-5 right-5 sm:bottom-7 sm:right-7 z-40 flex flex-col items-end">
        <AnimatePresence>
          {isFabMenuOpen && (
            <>
              {/* Subtle Click-Away Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => setIsFabMenuOpen(false)}
                className="fixed inset-0 bg-black/50 backdrop-blur-[2px] -z-10"
              />

              {/* Speed-Dial Action Items */}
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 14, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                className="mb-3 flex flex-col items-end space-y-2.5"
              >
                {/* Option 1: New Alarm */}
                <button
                  type="button"
                  onClick={() => {
                    setIsFabMenuOpen(false);
                    setEditingAlarm(null);
                    setShowAlarmEditor(true);
                  }}
                  style={{
                    backgroundColor: 'var(--sw-surface)',
                    borderColor: 'var(--sw-primary)',
                  }}
                  className="py-2.5 px-4 rounded-2xl border shadow-xl flex items-center space-x-2.5 text-xs sm:text-sm font-bold text-white hover:opacity-95"
                >
                  <span>New Alarm</span>
                  <div
                    style={{
                      backgroundColor: 'var(--sw-primary)',
                      color: 'var(--sw-bg)',
                    }}
                    className="w-7 h-7 rounded-xl flex items-center justify-center"
                  >
                    <AlarmClock className="w-4 h-4 stroke-[2.5]" />
                  </div>
                </button>

                {/* Option 2: New Task */}
                <button
                  type="button"
                  onClick={() => {
                    setIsFabMenuOpen(false);
                    setActiveTab('tasks');
                    setTaskCreateTrigger((prev) => prev + 1);
                  }}
                  style={{
                    backgroundColor: 'var(--sw-surface)',
                    borderColor: 'var(--sw-secondary)',
                  }}
                  className="py-2.5 px-4 rounded-2xl border shadow-xl flex items-center space-x-2.5 text-xs sm:text-sm font-bold text-white hover:opacity-95"
                >
                  <span>New Task</span>
                  <div
                    style={{
                      backgroundColor: 'var(--sw-secondary)',
                      color: 'var(--sw-bg)',
                    }}
                    className="w-7 h-7 rounded-xl flex items-center justify-center"
                  >
                    <ListChecks className="w-4 h-4 stroke-[2.5]" />
                  </div>
                </button>

                {/* Option 3: Register QR Tag */}
                <button
                  type="button"
                  onClick={() => {
                    setIsFabMenuOpen(false);
                    setShowTagManager(true);
                  }}
                  style={{
                    backgroundColor: 'var(--sw-surface)',
                  }}
                  className="py-2 px-3.5 rounded-2xl border border-gray-700 shadow-xl flex items-center space-x-2.5 text-xs font-bold text-gray-200 hover:text-white"
                >
                  <span>Register QR Tag</span>
                  <div
                    style={{
                      backgroundColor: 'var(--sw-bg)',
                      color: 'var(--sw-primary)',
                    }}
                    className="w-7 h-7 rounded-xl flex items-center justify-center border border-gray-800"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                  </div>
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Floating + Action Button */}
        <motion.button
          type="button"
          aria-label="Quick Create Alarm or Task"
          whileTap={{ scale: 0.88 }}
          onClick={() => setIsFabMenuOpen((prev) => !prev)}
          style={{
            background: `linear-gradient(135deg, var(--sw-primary), var(--sw-secondary))`,
            color: 'var(--sw-bg)',
          }}
          className="w-14 h-14 rounded-2xl flex items-center justify-center sw-fab-glow cursor-pointer"
          title="Create New Alarm or Task"
        >
          <motion.div
            animate={{ rotate: isFabMenuOpen ? 135 : 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 22 }}
          >
            <Plus className="w-7 h-7 stroke-[2.8]" />
          </motion.div>
        </motion.button>
      </div>

      {/* Clean Footer */}
      <footer
        style={{ backgroundColor: 'var(--sw-bg)' }}
        className="border-t border-gray-800/80 py-3.5 px-4 text-center text-xs text-gray-500 flex items-center justify-center gap-2"
      >
        <ScanWakeLogo size={22} />
        <p>ScanWake • Created for Irfan Khan (irfanalichachar862@gmail.com)</p>
      </footer>

      {/* Modals & Overlays */}
      {showAlarmEditor && (
        <AlarmEditorModal
          initialAlarm={editingAlarm}
          registeredTags={tags}
          onSave={handleSaveAlarm}
          onClose={() => {
            setShowAlarmEditor(false);
            setEditingAlarm(null);
          }}
        />
      )}

      {showTagManager && (
        <TagManagerModal
          tags={tags}
          onAddTag={(newTag) => setTags([...tags, newTag])}
          onDeleteTag={(tagId) => setTags(tags.filter((t) => t.id !== tagId))}
          onClose={() => setShowTagManager(false)}
        />
      )}

      {showChainManager && (
        <ChainManagerModal
          chains={chains}
          registeredTags={tags}
          onUpdateChains={(updated) => setChains(updated)}
          onClose={() => setShowChainManager(false)}
        />
      )}

      {showGuardsModal && <SystemGuardsModal onClose={() => setShowGuardsModal(false)} />}

      {showThemeModal && (
        <ThemeCustomizerModal
          currentTheme={currentTheme}
          onSelectTheme={setCurrentTheme}
          onClose={() => setShowThemeModal(false)}
        />
      )}

      {/* Ringing Full-Screen Lockout Modal */}
      {ringingAlarm && (
        <LockoutRingingModal
          alarm={ringingAlarm.alarm}
          targetTag={targetTagForRinging}
          chainInfo={ringingAlarm.chainInfo}
          onDismiss={handleDismissRinging}
        />
      )}
    </div>
  );
}
