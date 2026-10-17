import React, { useState } from 'react';
import {
  AlarmClock,
  Check,
  Clock,
  Lock,
  Play,
  QrCode,
  ShieldAlert,
  Square,
  Volume2,
  X,
} from 'lucide-react';
import { AlarmItem, RegisteredTag } from '../utils/antiCheatRules';
import { AVAILABLE_TONES, AlarmToneId, playAlarmSound, stopAlarmSound } from '../utils/audioSynthesizer';

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
  const [hour, setHour] = useState<number>(initialAlarm ? initialAlarm.hour : 6);
  const [minute, setMinute] = useState<number>(initialAlarm ? initialAlarm.minute : 30);
  const [label, setLabel] = useState<string>(initialAlarm ? initialAlarm.label : 'Morning Wake');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(initialAlarm ? initialAlarm.daysOfWeek : [1, 2, 3, 4, 5]);
  const [targetTagId, setTargetTagId] = useState<string>(
    initialAlarm ? initialAlarm.targetTagId : registeredTags[0]?.id || ''
  );
  const [toneId, setToneId] = useState<AlarmToneId>(
    (initialAlarm?.toneId as AlarmToneId) || 'loud_siren'
  );
  const [snoozeMinutes, setSnoozeMinutes] = useState<number>(
    initialAlarm ? initialAlarm.snoozeMinutes : 0
  );
  const [isStrictLockout, setIsStrictLockout] = useState<boolean>(
    initialAlarm ? initialAlarm.isStrictLockout : true
  );

  const [previewingTone, setPreviewingTone] = useState<string | null>(null);

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
      playAlarmSound(tId, 0.4);
      setPreviewingTone(tId);
    }
  };

  const handleSave = () => {
    stopAlarmSound();
    onSave({
      id: initialAlarm?.id,
      hour,
      minute,
      label: label.trim() || 'Alarm',
      daysOfWeek,
      isEnabled: true,
      targetTagId,
      toneId,
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
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-[#1C232B] border border-[#4ADEDE]/30 rounded-2xl max-w-lg w-full p-6 text-white shadow-[0_10px_40px_rgba(0,0,0,0.6)] relative my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-[#4ADEDE]/10 text-[#4ADEDE] rounded-xl border border-[#4ADEDE]/30">
              <AlarmClock className="w-5 h-5" />
            </div>
            <div>
              <h2 id="alarm-editor-title" className="text-lg font-bold text-white">
                {initialAlarm ? 'Edit Anti-Cheat Alarm' : 'New Anti-Cheat Alarm'}
              </h2>
              <p className="text-xs text-gray-400">Scheduled via Android AlarmManager</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Time Picker */}
        <div className="py-6 flex items-center justify-center space-x-4">
          {/* Hours Input */}
          <div className="flex flex-col items-center">
            <div className="flex items-center space-x-1">
              <input
                type="number"
                min="0"
                max="23"
                value={hour}
                onChange={(e) => setHour(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                className="w-20 text-center text-4xl sm:text-5xl font-black bg-[#0B0E11] border border-gray-700 focus:border-[#4ADEDE] rounded-xl py-2 px-1 text-white outline-none transition"
              />
            </div>
            <span className="text-[11px] text-gray-400 mt-1 uppercase font-semibold">Hours (24h)</span>
          </div>

          <span className="text-4xl sm:text-5xl font-black text-[#4ADEDE] animate-pulse">:</span>

          {/* Minutes Input */}
          <div className="flex flex-col items-center">
            <div className="flex items-center space-x-1">
              <input
                type="number"
                min="0"
                max="59"
                value={minute.toString().padStart(2, '0')}
                onChange={(e) => setMinute(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                className="w-20 text-center text-4xl sm:text-5xl font-black bg-[#0B0E11] border border-gray-700 focus:border-[#4ADEDE] rounded-xl py-2 px-1 text-white outline-none transition"
              />
            </div>
            <span className="text-[11px] text-gray-400 mt-1 uppercase font-semibold">Minutes</span>
          </div>
        </div>

        {/* Repeat Days Selector */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
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
                  className={`flex-1 h-10 rounded-xl text-xs font-bold transition flex items-center justify-center ${
                    isSelected
                      ? 'bg-[#4ADEDE] text-[#0B0E11] shadow-[0_0_12px_rgba(74,222,222,0.3)]'
                      : 'bg-[#0B0E11] text-gray-400 hover:text-white border border-gray-800'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Label Input */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
            Alarm Label
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Master Bathroom Wake"
            className="w-full bg-[#0B0E11] border border-gray-700 focus:border-[#4ADEDE] rounded-xl py-2.5 px-3 text-sm text-white outline-none transition"
          />
        </div>

        {/* Physical Tag Selector */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center space-x-1.5">
              <QrCode className="w-3.5 h-3.5 text-[#4ADEDE]" />
              <span>Required Physical Barcode</span>
            </label>
            <span className="text-[11px] text-[#7DE2D1]">Must scan to dismiss</span>
          </div>

          <select
            value={targetTagId}
            onChange={(e) => setTargetTagId(e.target.value)}
            className="w-full bg-[#0B0E11] border border-gray-700 focus:border-[#4ADEDE] rounded-xl py-2.5 px-3 text-sm text-white outline-none transition cursor-pointer"
          >
            {registeredTags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name} — {tag.location} ({tag.codeFormat})
              </option>
            ))}
          </select>
        </div>

        {/* Audio Tone Selector */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
            Alarm Siren Tone (USAGE_ALARM)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_TONES.map((tone) => (
              <div
                key={tone.id}
                onClick={() => setToneId(tone.id)}
                className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                  toneId === tone.id
                    ? 'border-[#4ADEDE] bg-[#4ADEDE]/10 text-white'
                    : 'border-gray-800 bg-[#0B0E11] text-gray-400 hover:border-gray-700'
                }`}
              >
                <div className="truncate mr-2">
                  <div className="font-bold text-white truncate">{tone.name.split(' (')[0]}</div>
                  <div className="text-[10px] text-gray-400">{tone.intensity}</div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreviewTone(tone.id);
                  }}
                  className="p-1 rounded-md bg-gray-800 hover:bg-[#4ADEDE] hover:text-[#0B0E11] text-gray-300 transition shrink-0"
                  title="Test Sound"
                >
                  {previewingTone === tone.id ? (
                    <Square className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Anti-Cheat Strict Lockout Switch */}
        <div className="mb-6 p-3 bg-[#0B0E11] border border-gray-800 rounded-xl flex items-center justify-between">
          <div className="flex items-start space-x-2.5">
            <ShieldAlert className="w-4 h-4 text-[#FF5C5C] shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-white">Strict Anti-Cheat Lockout</div>
              <div className="text-[11px] text-gray-400 leading-tight">
                Blocks volume decrease and forces full-screen lock over keyguard.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsStrictLockout(!isStrictLockout)}
            className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
              isStrictLockout ? 'bg-[#4ADEDE]' : 'bg-gray-700'
            }`}
          >
            <div
              className={`bg-[#0B0E11] w-4 h-4 rounded-full shadow-md transform transition-transform ${
                isStrictLockout ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-gray-700 hover:bg-gray-800 text-gray-300 text-sm font-semibold transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#64CCC5] hover:bg-[#7DE2D1] text-[#0B0E11] text-sm font-bold transition flex items-center justify-center space-x-1.5 shadow-[0_0_15px_rgba(100,204,197,0.3)]"
          >
            <Check className="w-4 h-4" />
            <span>Save Alarm</span>
          </button>
        </div>
      </div>
    </div>
  );
};
