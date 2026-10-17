import React from 'react';
import {
  BatteryCharging,
  Bell,
  Camera,
  CheckCircle2,
  Clock,
  Layers,
  Power,
  RotateCcw,
  Shield,
  ShieldAlert,
  Volume2,
  X,
  Zap,
} from 'lucide-react';

interface SystemGuardsModalProps {
  onClose: () => void;
}

export const SystemGuardsModal: React.FC<SystemGuardsModalProps> = ({ onClose }) => {
  const guards = [
    {
      title: 'SYSTEM_ALERT_WINDOW (Overlay Guard)',
      status: 'Enforced',
      statusColor: 'text-[#4ADEDE]',
      icon: <Layers className="w-5 h-5 text-[#4ADEDE]" />,
      desc: 'Draws full-screen anti-cheat lockout window over lockscreen and prevents bypassing via Home button.',
    },
    {
      title: 'SCHEDULE_EXACT_ALARM & USE_EXACT_ALARM',
      status: 'Enforced',
      statusColor: 'text-[#4ADEDE]',
      icon: <Clock className="w-5 h-5 text-[#4ADEDE]" />,
      desc: 'Invokes AlarmManager.setExactAndAllowWhileIdle to guarantee zero-drift wakeups during Android Doze mode.',
    },
    {
      title: 'FOREGROUND_SERVICE (Media Playback)',
      status: 'Foreground High Priority',
      statusColor: 'text-[#64CCC5]',
      icon: <Volume2 className="w-5 h-5 text-[#64CCC5]" />,
      desc: 'Hosts USAGE_ALARM MediaPlayer with AudioAttributes.FLAG_AUDIBILITY_ENFORCED and volume lock listener.',
    },
    {
      title: 'Anti-Sleep & Doze Bypass (WAKE_LOCK)',
      status: 'Granted',
      statusColor: 'text-[#7DE2D1]',
      icon: <Power className="w-5 h-5 text-[#7DE2D1]" />,
      desc: 'Partial wake lock acquired across AlarmReceiver and RingingService to prevent CPU sleep until QR scanned.',
    },
    {
      title: 'Reboot Recovery (BOOT_COMPLETED)',
      status: 'Persistent in Room DB',
      statusColor: 'text-[#4ADEDE]',
      icon: <RotateCcw className="w-5 h-5 text-[#4ADEDE]" />,
      desc: 'Room DB tables preserve alarm configurations and active sequential chains across device restarts.',
    },
    {
      title: 'Offline ML Kit & CameraX Vision',
      status: 'Embedded / Zero-Latency',
      statusColor: 'text-[#7DE2D1]',
      icon: <Camera className="w-5 h-5 text-[#7DE2D1]" />,
      desc: '100% on-device barcode parsing. No network calls or cloud latency required in the morning.',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="system-guards-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-[#1C232B] border border-[#4ADEDE]/30 rounded-2xl max-w-xl w-full p-6 text-white shadow-2xl relative my-8">
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-[#4ADEDE]/10 text-[#4ADEDE] rounded-xl border border-[#4ADEDE]/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 id="system-guards-title" className="text-lg font-bold text-white">Android Anti-Cheat System Guards</h2>
              <p className="text-xs text-gray-400">Low-level OS services preventing dismissal loopholes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-3 max-h-[460px] overflow-y-auto pr-1">
          {guards.map((guard, index) => (
            <div
              key={index}
              className="p-3.5 rounded-xl bg-[#0B0E11] border border-gray-800 flex items-start space-x-3"
            >
              <div className="p-2 bg-[#1C232B] rounded-lg shrink-0 mt-0.5 border border-gray-800">
                {guard.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-white">{guard.title}</div>
                  <span className={`text-[11px] font-semibold ${guard.statusColor} flex items-center gap-1`}>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{guard.status}</span>
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-1 leading-relaxed">
                  {guard.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-5 bg-[#4ADEDE] hover:bg-[#64CCC5] text-[#0B0E11] font-bold text-xs rounded-xl transition"
          >
            Close Guard Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
