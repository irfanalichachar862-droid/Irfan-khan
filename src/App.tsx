import React, { useState, useEffect } from 'react';
import {
  AlarmClock,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Code2,
  Download,
  ExternalLink,
  Info,
  Layers,
  Maximize2,
  Minimize2,
  Play,
  Plus,
  QrCode,
  Shield,
  ShieldAlert,
  Smartphone,
  Trash2,
  Volume2,
  Workflow,
  Zap,
} from 'lucide-react';
import {
  AlarmChain,
  AlarmItem,
  RegisteredTag,
  advanceChainStep,
  calculateNextTriggerTime,
  formatTimeUntilAlarm,
} from './utils/antiCheatRules';
import { AlarmEditorModal } from './components/AlarmEditorModal';
import { TagManagerModal } from './components/TagManagerModal';
import { ChainManagerModal } from './components/ChainManagerModal';
import { LockoutRingingModal } from './components/LockoutRingingModal';
import { AndroidCodeStudioModal } from './components/AndroidCodeStudioModal';
import { SystemGuardsModal } from './components/SystemGuardsModal';
import { generateBarcodeSvg, generateQrSvg } from './utils/qrGenerator';

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
    hour: 7,
    minute: 15,
    label: 'Kitchen Caffeine Boost',
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
    isActive: false,
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

  const [activeTab, setActiveTab] = useState<'alarms' | 'tags' | 'chains'>('alarms');
  const [phoneFrameMode, setPhoneFrameMode] = useState<boolean>(false);

  // Modal Dialog States
  const [editingAlarm, setEditingAlarm] = useState<AlarmItem | null>(null);
  const [showAlarmEditor, setShowAlarmEditor] = useState<boolean>(false);
  const [showTagManager, setShowTagManager] = useState<boolean>(false);
  const [showChainManager, setShowChainManager] = useState<boolean>(false);
  const [showCodeStudio, setShowCodeStudio] = useState<boolean>(false);
  const [showGuardsModal, setShowGuardsModal] = useState<boolean>(false);

  // Active Ringing Alarm State
  const [ringingAlarm, setRingingAlarm] = useState<{
    alarm: AlarmItem;
    chainInfo?: { chainId: string; chainName: string; stepIndex: number; totalSteps: number };
  } | null>(null);

  // Current real-time clock
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  // Alarm management
  const handleSaveAlarm = (data: Omit<AlarmItem, 'id'> & { id?: string }) => {
    if (data.id) {
      setAlarms(alarms.map((a) => (a.id === data.id ? ({ ...data, id: data.id } as AlarmItem) : a)));
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
    setAlarms(
      alarms.map((a) => (a.id === id ? { ...a, isEnabled: !a.isEnabled } : a))
    );
  };

  const handleDeleteAlarm = (id: string) => {
    setAlarms(alarms.filter((a) => a.id !== id));
  };

  const handleTriggerAlarm = (alarm: AlarmItem) => {
    setRingingAlarm({
      alarm,
    });
  };

  const handleSimulateChain = (chain: AlarmChain) => {
    setShowChainManager(false);
    const step0 = chain.steps[0];
    const syntheticAlarm: AlarmItem = {
      id: `chain_${chain.id}_step_0`,
      hour: currentTime.getHours(),
      minute: currentTime.getMinutes(),
      label: step0.label,
      daysOfWeek: [],
      isEnabled: true,
      targetTagId: step0.targetTagId,
      toneId: 'loud_siren',
      snoozeMinutes: 0,
      isStrictLockout: true,
      chainId: chain.id,
      chainStepIndex: 0,
    };

    setRingingAlarm({
      alarm: syntheticAlarm,
      chainInfo: {
        chainId: chain.id,
        chainName: chain.name,
        stepIndex: 0,
        totalSteps: chain.steps.length,
      },
    });
  };

  const handleDismissRinging = () => {
    if (ringingAlarm?.chainInfo) {
      const chain = chains.find((c) => c.id === ringingAlarm.chainInfo?.chainId);
      if (chain) {
        const nextOrder = ringingAlarm.chainInfo.stepIndex + 1;
        if (nextOrder < chain.steps.length) {
          const nextStep = chain.steps[nextOrder];
          // Schedule next step trigger
          alert(
            `Chain Step ${ringingAlarm.chainInfo.stepIndex + 1} verified!\nTimer started: Alarm for "${nextStep.label}" will ring in ${nextStep.delayMinutesAfterPrev} minutes.`
          );
        }
      }
    }
    setRingingAlarm(null);
  };

  const targetTagForRinging = ringingAlarm
    ? tags.find((t) => t.id === ringingAlarm.alarm.targetTagId)
    : undefined;

  return (
    <div className="min-h-screen bg-[#0B0E11] text-white font-sans flex flex-col selection:bg-[#4ADEDE] selection:text-[#0B0E11]">
      {/* Top Application Bar */}
      <header className="border-b border-gray-800/80 bg-[#0B0E11]/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4ADEDE] to-[#64CCC5] flex items-center justify-center text-[#0B0E11] shadow-[0_0_15px_rgba(74,222,222,0.4)]">
              <QrCode className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-lg tracking-wider text-white">ScanWake</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#4ADEDE]/10 text-[#4ADEDE] border border-[#4ADEDE]/30 font-semibold uppercase tracking-wider hidden sm:inline">
                  Android Architecture
                </span>
              </div>
              <p className="text-[11px] text-[#8C9BA8] hidden sm:block">
                Anti-Cheat Physical QR Wake-Up & Lockout Guard
              </p>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Real-time Clock */}
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#1C232B] border border-gray-800 text-xs font-mono text-[#7DE2D1]">
              <span className="w-2 h-2 rounded-full bg-[#4ADEDE] animate-ping" />
              <span>
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            {/* Quick Test Ring Now Button */}
            {alarms.length > 0 && (
              <button
                onClick={() => handleTriggerAlarm(alarms[0])}
                className="py-1.5 px-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 text-xs font-bold transition flex items-center space-x-1.5 shadow-[0_0_10px_rgba(255,92,92,0.2)]"
                title="Immediately trigger full-screen anti-cheat lockout"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden sm:inline">Test Ring Now</span>
              </button>
            )}

            {/* System Guards Inspector */}
            <button
              onClick={() => setShowGuardsModal(true)}
              className="p-2 sm:py-1.5 sm:px-3 rounded-xl bg-[#1C232B] hover:bg-[#26303B] text-gray-300 hover:text-white border border-gray-800 text-xs font-semibold transition flex items-center space-x-1.5"
              title="Android System Guards & Permissions"
            >
              <Shield className="w-4 h-4 text-[#4ADEDE]" />
              <span className="hidden md:inline">Guards (6)</span>
            </button>

            {/* Android Source Code & ZIP Exporter */}
            <button
              onClick={() => setShowCodeStudio(true)}
              className="py-1.5 px-3 rounded-xl bg-[#4ADEDE] hover:bg-[#64CCC5] text-[#0B0E11] text-xs font-bold transition flex items-center space-x-1.5 shadow-[0_0_15px_rgba(74,222,222,0.3)]"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Android Code</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6">
        {/* Navigation Tabs (Material 3 style) */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-6">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('alarms')}
              className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center space-x-2 ${
                activeTab === 'alarms'
                  ? 'bg-[#4ADEDE] text-[#0B0E11] shadow-[0_0_15px_rgba(74,222,222,0.3)]'
                  : 'text-gray-400 hover:text-white hover:bg-[#1C232B]'
              }`}
            >
              <AlarmClock className="w-4 h-4" />
              <span>Alarms ({alarms.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('tags')}
              className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center space-x-2 ${
                activeTab === 'tags'
                  ? 'bg-[#4ADEDE] text-[#0B0E11] shadow-[0_0_15px_rgba(74,222,222,0.3)]'
                  : 'text-gray-400 hover:text-white hover:bg-[#1C232B]'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>QR Tags ({tags.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('chains')}
              className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center space-x-2 ${
                activeTab === 'chains'
                  ? 'bg-[#4ADEDE] text-[#0B0E11] shadow-[0_0_15px_rgba(74,222,222,0.3)]'
                  : 'text-gray-400 hover:text-white hover:bg-[#1C232B]'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Chains ({chains.length})</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {activeTab === 'alarms' && (
              <button
                onClick={() => {
                  setEditingAlarm(null);
                  setShowAlarmEditor(true);
                }}
                className="py-2 px-3.5 bg-[#64CCC5] hover:bg-[#7DE2D1] text-[#0B0E11] text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-[0_0_12px_rgba(100,204,197,0.3)]"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>New Alarm</span>
              </button>
            )}

            {activeTab === 'tags' && (
              <button
                onClick={() => setShowTagManager(true)}
                className="py-2 px-3.5 bg-[#64CCC5] hover:bg-[#7DE2D1] text-[#0B0E11] text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-[0_0_12px_rgba(100,204,197,0.3)]"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Register Tag</span>
              </button>
            )}

            {activeTab === 'chains' && (
              <button
                onClick={() => setShowChainManager(true)}
                className="py-2 px-3.5 bg-[#64CCC5] hover:bg-[#7DE2D1] text-[#0B0E11] text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-[0_0_12px_rgba(100,204,197,0.3)]"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Build Chain</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: ALARMS LIST VIEW */}
        {activeTab === 'alarms' && (
          <div className="space-y-4">
            {alarms.length === 0 ? (
              <div className="p-12 text-center bg-[#1C232B] rounded-2xl border border-gray-800">
                <AlarmClock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-gray-300">No Alarms Configured</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  Create an anti-cheat alarm that requires scanning a physical barcode in another room.
                </p>
                <button
                  onClick={() => setShowAlarmEditor(true)}
                  className="mt-4 py-2 px-4 bg-[#4ADEDE] text-[#0B0E11] rounded-xl text-xs font-bold"
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
                const formattedTime = `${alarm.hour.toString().padStart(2, '0')}:${alarm.minute
                  .toString()
                  .padStart(2, '0')}`;

                return (
                  <div
                    key={alarm.id}
                    className={`p-5 rounded-2xl bg-[#1C232B] border transition-all ${
                      alarm.isEnabled
                        ? 'border-[#4ADEDE]/40 shadow-[0_0_20px_rgba(74,222,222,0.06)]'
                        : 'border-gray-800/80 opacity-70'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left: Time & Information */}
                      <div className="space-y-1.5">
                        <div className="flex items-baseline space-x-3">
                          <span
                            className={`text-4xl sm:text-5xl font-black tracking-tight ${
                              alarm.isEnabled ? 'text-white' : 'text-gray-500'
                            }`}
                          >
                            {formattedTime}
                          </span>
                          <span className="text-xs font-mono text-[#4ADEDE]">
                            {alarm.isEnabled ? `Rings ${timeRemaining}` : 'Disabled'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-semibold text-gray-200">{alarm.label}</span>
                          {alarm.isStrictLockout && (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 text-[10px] font-bold uppercase tracking-wider">
                              <ShieldAlert className="w-2.5 h-2.5" />
                              <span>Strict Lockout</span>
                            </span>
                          )}
                        </div>

                        {/* Physical Tag Requirement Badge */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {boundTag ? (
                            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#0B0E11] border border-[#7DE2D1]/30 text-[#7DE2D1] text-xs">
                              <QrCode className="w-3.5 h-3.5 text-[#4ADEDE]" />
                              <span className="font-medium">
                                Target: {boundTag.name} ({boundTag.location})
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-[#0B0E11] text-gray-400 text-xs">
                              <QrCode className="w-3.5 h-3.5" />
                              <span>Any Registered Tag</span>
                            </div>
                          )}

                          {/* Days Pills */}
                          <div className="flex items-center space-x-1">
                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
                              const dayIndex = idx === 6 ? 0 : idx + 1;
                              const isDayActive = alarm.daysOfWeek.includes(dayIndex);
                              return (
                                <span
                                  key={idx}
                                  className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center ${
                                    isDayActive
                                      ? 'bg-[#4ADEDE]/20 text-[#4ADEDE] border border-[#4ADEDE]/40'
                                      : 'bg-gray-800 text-gray-500'
                                  }`}
                                >
                                  {day}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Right: Toggle Switch & Actions */}
                      <div className="flex items-center space-x-3 self-end sm:self-center">
                        <button
                          onClick={() => handleTriggerAlarm(alarm)}
                          className="py-1.5 px-3 bg-[#0B0E11] hover:bg-[#26303B] border border-[#4ADEDE]/40 text-[#4ADEDE] rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
                          title="Simulate ringing lockout screen immediately"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Test Ring</span>
                        </button>

                        <button
                          onClick={() => {
                            setEditingAlarm(alarm);
                            setShowAlarmEditor(true);
                          }}
                          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
                          title="Edit Alarm"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDeleteAlarm(alarm.id)}
                          className="p-2 text-gray-500 hover:text-red-400 rounded-lg hover:bg-gray-800 transition"
                          title="Delete Alarm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        {/* Android-style Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleAlarm(alarm.id)}
                          className={`w-12 h-7 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                            alarm.isEnabled ? 'bg-[#4ADEDE]' : 'bg-gray-700'
                          }`}
                        >
                          <div
                            className={`bg-[#0B0E11] w-5 h-5 rounded-full shadow-md transform transition-transform ${
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

        {/* TAB 2: REGISTERED PHYSICAL QR TAGS */}
        {activeTab === 'tags' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Registered Physical Barcodes</h3>
                <p className="text-xs text-gray-400">
                  Everyday items around your house with barcodes required to silence alarms.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="p-4 rounded-2xl bg-[#1C232B] border border-gray-800 hover:border-[#4ADEDE]/50 transition flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="p-2.5 rounded-xl bg-[#0B0E11] text-[#4ADEDE] border border-gray-800">
                        <QrCode className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#0B0E11] text-[#7DE2D1] font-mono border border-gray-800">
                        {tag.codeFormat}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-white">{tag.name}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">{tag.location}</p>
                    </div>

                    <div className="p-2 rounded-lg bg-[#0B0E11] font-mono text-[11px] text-gray-400 break-all">
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
                          __html: generateBarcodeSvg(tag.codeValue, tag.codeFormat, 180, 60),
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: SEQUENTIAL WAKE-UP CHAINS */}
        {activeTab === 'chains' && (
          <div className="space-y-6">
            <div className="mb-4">
              <h3 className="text-base font-bold text-white">Sequential Wake-Up Chains (Anti-Relapse)</h3>
              <p className="text-xs text-gray-400">
                Link multiple physical locations across your home. Once Alarm 1 is dismissed in the bathroom,
                ScanWake automatically sets a countdown timer for Alarm 2 in the kitchen.
              </p>
            </div>

            {chains.map((chain) => (
              <div
                key={chain.id}
                className="p-5 rounded-2xl bg-[#1C232B] border border-gray-800 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-[#64CCC5]/10 text-[#64CCC5] rounded-xl border border-[#64CCC5]/30">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-white">{chain.name}</h4>
                      <span className="text-xs text-gray-400">
                        {chain.steps.length} Linked Sequential Locations
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSimulateChain(chain)}
                    className="py-1.5 px-3 bg-[#64CCC5] hover:bg-[#7DE2D1] text-[#0B0E11] text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-[0_0_12px_rgba(100,204,197,0.3)]"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Test Chain Sequence</span>
                  </button>
                </div>

                {/* Timeline flow */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {chain.steps.map((step, idx) => {
                    const tag = tags.find((t) => t.id === step.targetTagId);
                    return (
                      <div
                        key={step.id}
                        className="p-3.5 rounded-xl bg-[#0B0E11] border border-gray-800 flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="w-6 h-6 rounded-full bg-[#4ADEDE]/20 text-[#4ADEDE] text-xs font-bold flex items-center justify-center border border-[#4ADEDE]/40">
                            {idx + 1}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {idx === 0 ? 'Starts Chain' : `+${step.delayMinutesAfterPrev}m delay`}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-white truncate">{step.label}</div>
                        <div className="text-[11px] text-[#7DE2D1] truncate mt-0.5">
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
      </main>

      {/* Footer Info */}
      <footer className="border-t border-gray-800/80 bg-[#0B0E11] py-4 px-6 text-center text-xs text-gray-500">
        <p>
          ScanWake — Android Architecture (Kotlin 1.9 • Jetpack Compose • Room DB • CameraX • ML Kit Offline Scanning)
        </p>
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
          onSimulateChain={handleSimulateChain}
          onClose={() => setShowChainManager(false)}
        />
      )}

      {showCodeStudio && <AndroidCodeStudioModal onClose={() => setShowCodeStudio(false)} />}

      {showGuardsModal && <SystemGuardsModal onClose={() => setShowGuardsModal(false)} />}

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
