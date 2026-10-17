import React, { useRef, useState } from 'react';
import {
  AlarmClock,
  Check,
  Music,
  Play,
  QrCode,
  ShieldAlert,
  Sliders,
  Square,
  Upload,
  X,
} from 'lucide-react';
import {
  AlarmItem,
  RegisteredTag,
  TimePeriod,
  to12Hour,
  to24Hour,
} from '../utils/antiCheatRules';
import {
  AVAILABLE_TONES,
  AlarmToneId,
  playAlarmSound,
  stopAlarmSound,
} from '../utils/audioSynthesizer';

interface AlarmEditorModalProps {
  initialAlarm?: AlarmItem | null;
  registeredTags: RegisteredTag[];
  onSave: (alarmData: Omit<AlarmItem, 'id'> & { id?: string }) => void;
  onClose: () => void;
}

const DAYS_SHORT = [
  { dayIndex: 1, label: 'M' },
  { dayIndex: 2, label: 'T' },
  { dayIndex: 3, label: 'W' },
  { dayIndex: 4, label: 'T' },
  { dayIndex: 5, label: 'F' },
  { dayIndex: 6, label: 'S' },
  { dayIndex: 0, label: 'S' },
];

export const AlarmEditorModal: React.FC<AlarmEditorModalProps> = ({
  initialAlarm,
  registeredTags,
  onSave,
  onClose,
}) => {
  const initial12 = to12Hour(initialAlarm ? initialAlarm.hour : 6);

  const [hour12, setHour12] = useState<number>(initial12.hour12);
  const [minute, setMinute] = useState<number>(initialAlarm ? initialAlarm.minute : 30);
  const [period, setPeriod] = useState<TimePeriod>(initial12.period);
  const [label, setLabel] = useState<string>(
    initialAlarm ? initialAlarm.label : 'Morning Wake'
  );
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
    initialAlarm ? initialAlarm.daysOfWeek : [1, 2, 3, 4, 5]
  );
  const [targetTagId, setTargetTagId] = useState<string>(
    initialAlarm ? initialAlarm.targetTagId : registeredTags[0]?.id || ''
  );
  const [toneId, setToneId] = useState<AlarmToneId>(
    (initialAlarm?.toneId as AlarmToneId) || 'loud_siren'
  );
  const [customToneName, setCustomToneName] = useState<string>(
    initialAlarm?.customToneName || ''
  );
  const [customToneDataUrl, setCustomToneDataUrl] = useState<string>(
    initialAlarm?.customToneDataUrl || ''
  );
  const [customToneFreq, setCustomToneFreq] = useState<number>(
    initialAlarm?.customToneFreq || 680
  );
  const [snoozeMinutes, setSnoozeMinutes] = useState<number>(
    initialAlarm ? initialAlarm.snoozeMinutes : 0
  );
  const [isStrictLockout, setIsStrictLockout] = useState<boolean>(
    initialAlarm ? initialAlarm.isStrictLockout : true
  );

  const [previewingTone, setPreviewingTone] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const toggleDay = (dayIndex: number) => {
    if (daysOfWeek.includes(dayIndex)) {
      setDaysOfWeek(daysOfWeek.filter((d) => d !== dayIndex));
    } else {
      setDaysOfWeek([...daysOfWeek, dayIndex].sort());
    }
  };

  const handlePreviewTone = (tId: AlarmToneId) => {
    if (previewingTone === tId) {
      stopAlarmSound();
      setPreviewingTone(null);
    } else {
      playAlarmSound(tId, 0.5, {
        customDataUrl: customToneDataUrl,
        customFreq: customToneFreq,
      });
      setPreviewingTone(tId);
    }
  };

  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomToneDataUrl(reader.result);
        setCustomToneName(file.name);
        setToneId('custom_audio');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    stopAlarmSound();
    const hour24 = to24Hour(hour12, period);
    onSave({
      id: initialAlarm?.id,
      hour: hour24,
      minute,
      label: label.trim() || 'Alarm',
      daysOfWeek,
      isEnabled: true,
      targetTagId,
      toneId,
      customToneName: customToneName || undefined,
      customToneDataUrl: customToneDataUrl || undefined,
      customToneFreq,
      snoozeMinutes,
      isStrictLockout,
    });
    onClose();
  };

  const handleClose = () => {
    stopAlarmSound();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="alarm-editor-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-scrollbar"
    >
      <div
        style={{ backgroundColor: 'var(--sw-surface)', borderColor: 'var(--sw-primary)' }}
        className="border rounded-2xl max-w-lg w-full p-4 sm:p-6 text-white shadow-[0_10px_40px_rgba(0,0,0,0.6)] relative my-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-gray-800">
          <div className="flex items-center space-x-2.5">
            <div
              style={{
                backgroundColor: 'color-mix(in srgb, var(--sw-primary) 15%, transparent)',
                color: 'var(--sw-primary)',
                borderColor: 'color-mix(in srgb, var(--sw-primary) 40%, transparent)',
              }}
              className="p-2 rounded-xl border"
            >
              <AlarmClock className="w-5 h-5" />
            </div>
            <div>
              <h2 id="alarm-editor-title" className="text-base sm:text-lg font-bold text-white">
                {initialAlarm ? 'Edit Anti-Cheat Alarm' : 'New Anti-Cheat Alarm'}
              </h2>
              <p className="text-xs text-gray-400">12-Hour Schedule & Custom Tone</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close Alarm Editor"
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 12-Hour Time Picker with AM / PM */}
        <div className="py-5 flex items-center justify-center space-x-2.5 sm:space-x-4">
          {/* Hours (1-12) */}
          <div className="flex flex-col items-center">
            <input
              type="number"
              aria-label="Alarm Hour (1 to 12)"
              min="1"
              max="12"
              value={hour12}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) {
                  setHour12(Math.max(1, Math.min(12, val)));
                }
              }}
              style={{ backgroundColor: 'var(--sw-bg)' }}
              className="w-16 sm:w-20 text-center text-3xl sm:text-5xl font-black border border-gray-700 focus:border-[var(--sw-primary)] rounded-xl py-2 px-1 text-white outline-none transition"
            />
            <span className="text-[10px] text-gray-400 mt-1 uppercase font-semibold">
              Hour (1-12)
            </span>
          </div>

          <span
            style={{ color: 'var(--sw-primary)' }}
            className="text-3xl sm:text-5xl font-black animate-pulse pb-4"
          >
            :
          </span>

          {/* Minutes (00-59) */}
          <div className="flex flex-col items-center">
            <input
              type="number"
              aria-label="Alarm Minute (0 to 59)"
              min="0"
              max="59"
              value={minute.toString().padStart(2, '0')}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setMinute(isNaN(val) ? 0 : Math.max(0, Math.min(59, val)));
              }}
              style={{ backgroundColor: 'var(--sw-bg)' }}
              className="w-16 sm:w-20 text-center text-3xl sm:text-5xl font-black border border-gray-700 focus:border-[var(--sw-primary)] rounded-xl py-2 px-1 text-white outline-none transition"
            />
            <span className="text-[10px] text-gray-400 mt-1 uppercase font-semibold">Minute</span>
          </div>

          {/* AM / PM Toggle Buttons */}
          <div className="flex flex-col space-y-1.5 pb-4">
            <button
              type="button"
              onClick={() => setPeriod('AM')}
              style={
                period === 'AM'
                  ? { backgroundColor: 'var(--sw-primary)', color: 'var(--sw-bg)' }
                  : { backgroundColor: 'var(--sw-bg)' }
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-wider transition border ${
                period === 'AM'
                  ? 'border-transparent shadow-md'
                  : 'text-gray-400 border-gray-800 hover:text-white'
              }`}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => setPeriod('PM')}
              style={
                period === 'PM'
                  ? { backgroundColor: 'var(--sw-primary)', color: 'var(--sw-bg)' }
                  : { backgroundColor: 'var(--sw-bg)' }
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-wider transition border ${
                period === 'PM'
                  ? 'border-transparent shadow-md'
                  : 'text-gray-400 border-gray-800 hover:text-white'
              }`}
            >
              PM
            </button>
          </div>
        </div>

        {/* Repeat Days Selector */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
            Repeat Days
          </label>
          <div className="flex justify-between gap-1.5">
            {DAYS_SHORT.map((item) => {
              const isSelected = daysOfWeek.includes(item.dayIndex);
              return (
                <button
                  key={item.dayIndex}
                  type="button"
                  onClick={() => toggleDay(item.dayIndex)}
                  style={
                    isSelected
                      ? { backgroundColor: 'var(--sw-primary)', color: 'var(--sw-bg)' }
                      : { backgroundColor: 'var(--sw-bg)' }
                  }
                  className={`flex-1 h-9 rounded-xl text-xs font-bold transition flex items-center justify-center ${
                    isSelected
                      ? 'shadow-sm'
                      : 'text-gray-400 hover:text-white border border-gray-800'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Label Input */}
        <div className="mb-3.5">
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
            Alarm Label
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Master Bathroom Wake"
            style={{ backgroundColor: 'var(--sw-bg)' }}
            className="w-full border border-gray-700 focus:border-[var(--sw-primary)] rounded-xl py-2 px-3 text-sm text-white outline-none transition"
          />
        </div>

        {/* Physical Tag Selector */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center space-x-1.5">
              <QrCode className="w-3.5 h-3.5" style={{ color: 'var(--sw-primary)' }} />
              <span>Required Physical Barcode</span>
            </label>
            <span className="text-[11px]" style={{ color: 'var(--sw-accent)' }}>
              Must scan to dismiss
            </span>
          </div>

          <select
            value={targetTagId}
            onChange={(e) => setTargetTagId(e.target.value)}
            style={{ backgroundColor: 'var(--sw-bg)' }}
            className="w-full border border-gray-700 focus:border-[var(--sw-primary)] rounded-xl py-2 px-3 text-xs sm:text-sm text-white outline-none transition cursor-pointer"
          >
            {registeredTags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name} — {tag.location} ({tag.codeFormat})
              </option>
            ))}
          </select>
        </div>

        {/* Audio Tone Selector + Custom Tone Options */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Alarm Tone & Custom Sound
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{ color: 'var(--sw-primary)' }}
              className="text-[11px] font-bold flex items-center space-x-1 hover:underline"
            >
              <Upload className="w-3 h-3" />
              <span>Upload Audio File</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleAudioFileUpload}
              className="hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto no-scrollbar pr-0.5">
            {AVAILABLE_TONES.map((tone) => {
              const isSelected = toneId === tone.id;
              return (
                <div
                  key={tone.id}
                  onClick={() => setToneId(tone.id)}
                  style={{
                    backgroundColor: isSelected
                      ? 'color-mix(in srgb, var(--sw-primary) 12%, var(--sw-bg))'
                      : 'var(--sw-bg)',
                    borderColor: isSelected ? 'var(--sw-primary)' : '#1f2937',
                  }}
                  className="p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between"
                >
                  <div className="truncate mr-1.5">
                    <div className="font-bold text-white truncate">{tone.name}</div>
                    <div className="text-[10px] text-gray-400 truncate">
                      {tone.id === 'custom_audio' && customToneName
                        ? customToneName
                        : tone.intensity}
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={`Preview ${tone.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreviewTone(tone.id);
                    }}
                    className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 transition shrink-0"
                    title="Preview Tone"
                  >
                    {previewingTone === tone.id ? (
                      <Square className="w-3 h-3 fill-current" />
                    ) : (
                      <Play className="w-3 h-3 fill-current" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Custom Frequency Synth Slider when 'custom_synth' is active */}
          {toneId === 'custom_synth' && (
            <div
              style={{ backgroundColor: 'var(--sw-bg)' }}
              className="mt-2.5 p-3 rounded-xl border border-gray-800"
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-gray-300 font-semibold flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" style={{ color: 'var(--sw-primary)' }} />
                  <span>Custom Synth Pitch</span>
                </span>
                <span className="font-mono font-bold" style={{ color: 'var(--sw-primary)' }}>
                  {customToneFreq} Hz
                </span>
              </div>
              <input
                type="range"
                min="200"
                max="2000"
                step="20"
                value={customToneFreq}
                onChange={(e) => {
                  const f = parseInt(e.target.value) || 680;
                  setCustomToneFreq(f);
                  if (previewingTone === 'custom_synth') {
                    playAlarmSound('custom_synth', 0.5, { customFreq: f });
                  }
                }}
                style={{ accentColor: 'var(--sw-primary)' }}
                className="w-full h-1.5 bg-gray-700 rounded-lg cursor-pointer"
              />
            </div>
          )}

          {/* Custom Audio File Upload Box when 'custom_audio' is active */}
          {toneId === 'custom_audio' && (
            <div
              style={{ backgroundColor: 'var(--sw-bg)' }}
              className="mt-2.5 p-3 rounded-xl border border-gray-800 flex items-center justify-between"
            >
              <div className="flex items-center space-x-2 truncate pr-2">
                <Music className="w-4 h-4 shrink-0" style={{ color: 'var(--sw-primary)' }} />
                <span className="text-xs text-gray-300 truncate">
                  {customToneName || 'No custom audio file selected yet'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{ backgroundColor: 'var(--sw-primary)', color: 'var(--sw-bg)' }}
                className="py-1 px-2.5 rounded-lg text-[11px] font-bold shrink-0"
              >
                Choose File
              </button>
            </div>
          )}
        </div>

        {/* Anti-Cheat Strict Lockout Switch */}
        <div
          style={{ backgroundColor: 'var(--sw-bg)' }}
          className="mb-5 p-3 border border-gray-800 rounded-xl flex items-center justify-between"
        >
          <div className="flex items-start space-x-2.5 pr-2">
            <ShieldAlert className="w-4 h-4 text-[#FF5C5C] shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-white">Strict Anti-Cheat Lockout</div>
              <div className="text-[11px] text-gray-400 leading-tight">
                Blocks volume decrease and forces full-screen lock until barcode scan.
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Toggle Strict Anti-Cheat Lockout"
            onClick={() => setIsStrictLockout(!isStrictLockout)}
            style={{
              backgroundColor: isStrictLockout ? 'var(--sw-primary)' : '#374151',
            }}
            className="w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors shrink-0"
          >
            <div
              style={{ backgroundColor: 'var(--sw-bg)' }}
              className={`w-4 h-4 rounded-full shadow-md transform transition-transform ${
                isStrictLockout ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-gray-700 hover:bg-gray-800 text-gray-300 text-xs sm:text-sm font-semibold transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{ backgroundColor: 'var(--sw-secondary)', color: 'var(--sw-bg)' }}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center space-x-1.5 hover:opacity-95"
          >
            <Check className="w-4 h-4" />
            <span>Save Alarm</span>
          </button>
        </div>
      </div>
    </div>
  );
};
