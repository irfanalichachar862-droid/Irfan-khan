import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Lock,
  Maximize2,
  Minimize2,
  QrCode,
  ShieldAlert,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import jsQR from 'jsqr';
import { AlarmItem, RegisteredTag, advanceChainStep, verifyBarcodeMatch } from '../utils/antiCheatRules';
import { playAlarmSound, stopAlarmSound, playTestBeep, setMasterVolume } from '../utils/audioSynthesizer';

interface LockoutRingingModalProps {
  alarm: AlarmItem;
  targetTag?: RegisteredTag;
  chainInfo?: {
    chainId: string;
    chainName: string;
    stepIndex: number;
    totalSteps: number;
  };
  onDismiss: (nextChainAlarm?: { triggerMs: number; tagId: string; stepIndex: number }) => void;
}

export const LockoutRingingModal: React.FC<LockoutRingingModalProps> = ({
  alarm,
  targetTag,
  chainInfo,
  onDismiss,
}) => {
  const [isCameraActive, setIsCameraActive] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [scanStatusType, setScanStatusType] = useState<'error' | 'success' | 'info'>('info');
  const [volume, setVolume] = useState<number>(1.0);
  const [showVolumeAlert, setShowVolumeAlert] = useState<boolean>(false);
  const [showExitAlert, setShowExitAlert] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [attemptCount, setAttemptCount] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start alarm audio on mount
  useEffect(() => {
    playAlarmSound(alarm.toneId as any || 'loud_siren', 1.0);
    return () => {
      stopAlarmSound();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [alarm.toneId]);

  // Initialize camera scanner
  useEffect(() => {
    let active = true;

    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play();
          startScanningLoop();
        }
      } catch (err: any) {
        console.warn('Camera access error:', err);
        setCameraError('Camera unavailable or permission denied. You can use the Quick Scan simulator below.');
      }
    }

    initCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startScanningLoop = () => {
    const scanFrame = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current;
        if (canvas) {
          const video = videoRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });

            if (code && code.data) {
              handleBarcodeScanned(code.data);
              return; // Stop scan loop on detected code
            }
          }
        }
      }
      animFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animFrameRef.current = requestAnimationFrame(scanFrame);
  };

  const handleBarcodeScanned = (scannedCode: string) => {
    if (!targetTag) {
      // Any code dismisses if no tag bound
      handleSuccess();
      return;
    }

    const isMatch = verifyBarcodeMatch(scannedCode, targetTag.codeHash, targetTag.codeValue);

    if (isMatch) {
      handleSuccess();
    } else {
      setAttemptCount((prev) => prev + 1);
      setScanStatus(`Wrong code "${scannedCode.substring(0, 15)}..."! Required: ${targetTag.name}`);
      setScanStatusType('error');
      playTestBeep(false);

      // Reset scanner after 2.5s
      setTimeout(() => {
        setScanStatus(null);
        startScanningLoop();
      }, 2500);
    }
  };

  const handleSuccess = () => {
    stopAlarmSound();
    playTestBeep(true);
    setScanStatus('Verification Verified! Good morning!');
    setScanStatusType('success');

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4ADEDE', '#64CCC5', '#7DE2D1', '#FFFFFF'],
      });
    } catch (_) {}

    setTimeout(() => {
      onDismiss();
    }, 1200);
  };

  // Anti-Cheat Volume Guard
  const handleVolumeChange = (newVol: number) => {
    if (alarm.isStrictLockout && newVol < 0.85) {
      // Trigger Volume Lockout
      setShowVolumeAlert(true);
      setMasterVolume(1.0);
      setVolume(1.0);
      playTestBeep(false);
      setTimeout(() => setShowVolumeAlert(false), 3000);
    } else {
      setVolume(newVol);
      setMasterVolume(newVol);
    }
  };

  // Anti-Cheat Back/Home Interception
  const handleAttemptExit = () => {
    setShowExitAlert(true);
    playTestBeep(false);
    setTimeout(() => setShowExitAlert(false), 3500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lockout-dialog-title"
      className="fixed inset-0 z-50 bg-[#0B0E11] text-white flex flex-col justify-between overflow-hidden select-none"
    >
      {/* Blinking Top Guard Bar */}
      <div className="bg-red-500/20 border-b border-red-500/40 px-4 py-2 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2 text-red-400 font-bold">
          <ShieldAlert className="w-4 h-4 animate-pulse text-red-500" />
          <span>SCANWAKE ANTI-CHEAT LOCKOUT ENGAGED</span>
        </div>
        <div className="flex items-center space-x-3 text-gray-400">
          <span className="text-[#4ADEDE]">VOLUME GUARD: ON</span>
          <span className="hidden sm:inline text-gray-500">|</span>
          <span className="text-red-400">EXIT: LOCKED</span>
        </div>
      </div>

      {/* Main Lockout Header */}
      <div className="px-4 py-4 text-center max-w-xl mx-auto w-full">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#1C232B] border border-[#4ADEDE]/40 text-[#4ADEDE] text-xs font-semibold uppercase tracking-wider mb-2">
          <Lock className="w-3.5 h-3.5" />
          <span>Must Scan Physical Barcode</span>
        </div>

        <h1 id="lockout-dialog-title" className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center justify-center gap-2">
          <span className="text-[#4ADEDE]">{alarm.label || 'Morning Wake'}</span>
        </h1>

        <div className="mt-2 text-sm text-gray-300">
          {targetTag ? (
            <div className="flex flex-col items-center">
              <span className="text-base font-bold text-[#7DE2D1]">
                Target: {targetTag.name}
              </span>
              <span className="text-xs text-gray-400">
                Location: {targetTag.location} ({targetTag.codeFormat})
              </span>
            </div>
          ) : (
            <span className="text-[#4ADEDE]">Scan any registered household QR code</span>
          )}
        </div>

        {chainInfo && (
          <div className="mt-2 inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded bg-[#64CCC5]/20 text-[#7DE2D1] text-xs font-medium border border-[#64CCC5]/40">
            <Zap className="w-3 h-3" />
            <span>
              Chain Step {chainInfo.stepIndex + 1} of {chainInfo.totalSteps} ({chainInfo.chainName})
            </span>
          </div>
        )}
      </div>

      {/* Camera / Barcode Scanner Viewport */}
      <div className="flex-1 px-4 max-w-md mx-auto w-full flex flex-col items-center justify-center relative">
        <div className="relative w-full aspect-square max-w-[320px] rounded-2xl overflow-hidden bg-[#1C232B] border-2 border-[#4ADEDE] shadow-[0_0_30px_rgba(74,222,222,0.25)] flex items-center justify-center">
          {/* Real Camera Preview */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Fallback if no camera */}
          {cameraError && (
            <div className="absolute inset-0 p-4 bg-[#1C232B]/90 flex flex-col items-center justify-center text-center">
              <Camera className="w-12 h-12 text-gray-500 mb-2" />
              <p className="text-xs text-gray-400 mb-4">{cameraError}</p>
            </div>
          )}

          {/* Animated Laser Reticle */}
          <div className="absolute inset-4 pointer-events-none border border-[#4ADEDE]/40 rounded-xl flex flex-col justify-between">
            {/* Corner Markers */}
            <div className="flex justify-between">
              <div className="w-6 h-6 border-t-2 border-l-2 border-[#4ADEDE]" />
              <div className="w-6 h-6 border-t-2 border-r-2 border-[#4ADEDE]" />
            </div>
            {/* Laser Line */}
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#4ADEDE] to-transparent animate-pulse shadow-[0_0_10px_#4ADEDE]" />
            <div className="flex justify-between">
              <div className="w-6 h-6 border-b-2 border-l-2 border-[#4ADEDE]" />
              <div className="w-6 h-6 border-b-2 border-r-2 border-[#4ADEDE]" />
            </div>
          </div>

          {/* Scanning status banner */}
          {scanStatus && (
            <div
              className={`absolute bottom-3 left-3 right-3 py-2 px-3 rounded-lg text-xs font-semibold text-center backdrop-blur-md ${
                scanStatusType === 'error'
                  ? 'bg-red-500/80 text-white'
                  : 'bg-emerald-500/90 text-white'
              }`}
            >
              {scanStatus}
            </div>
          )}
        </div>

        {/* Quick Simulator Test Scan Button */}
        {targetTag && (
          <div className="mt-4 w-full max-w-[320px]">
            <button
              onClick={() => handleBarcodeScanned(targetTag.codeValue)}
              className="w-full py-2.5 px-4 bg-[#1C232B] hover:bg-[#26303B] active:bg-[#32404f] border border-[#4ADEDE]/50 text-[#4ADEDE] rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2"
            >
              <QrCode className="w-4 h-4" />
              <span>Simulate Scan: [{targetTag.name}]</span>
            </button>
            <p className="text-[11px] text-gray-400 text-center mt-1.5">
              Testing on desktop? Tap button to simulate physical tag match.
            </p>
          </div>
        )}
      </div>

      {/* Volume Guard & Lockout Indicators */}
      <div className="px-4 py-3 max-w-md mx-auto w-full">
        {/* Anti-Cheat Volume Guard Warning Toast */}
        {showVolumeAlert && (
          <div className="mb-2 p-3 bg-red-500/90 text-white rounded-xl text-xs font-bold flex items-center space-x-2 animate-bounce">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Anti-Cheat Guard: Volume override active! Volume snapped to 100%.</span>
          </div>
        )}

        {/* Anti-Cheat Exit Attempt Warning Toast */}
        {showExitAlert && (
          <div className="mb-2 p-3 bg-red-600 text-white rounded-xl text-xs font-bold flex items-center space-x-2 animate-bounce">
            <Lock className="w-4 h-4 shrink-0" />
            <span>LOCKOUT ENGAGED: Back button and app switching are disabled. Scan barcode to unlock!</span>
          </div>
        )}

        <div className="bg-[#1C232B] rounded-xl p-3 border border-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <div className="flex items-center space-x-1.5">
              <Volume2 className="w-4 h-4 text-[#4ADEDE]" />
              <span>Alarm Volume (Guard Protected)</span>
            </div>
            <span className="font-mono text-[#4ADEDE] font-bold">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-full accent-[#4ADEDE] h-2 bg-gray-700 rounded-lg cursor-pointer"
          />
          <p className="text-[10px] text-gray-400 mt-1">
            Attempting to lower below 85% triggers strict anti-cheat volume reset.
          </p>
        </div>
      </div>

      {/* Simulated Android Hardware / Navigation Bar */}
      <div className="bg-[#07090b] border-t border-gray-800/80 px-8 py-3 flex items-center justify-around">
        <button
          onClick={handleAttemptExit}
          className="p-2 text-gray-400 hover:text-red-400 active:scale-95 transition"
          title="Back Button (Anti-Cheat Intercepted)"
        >
          <div className="w-0 h-0 border-y-8 border-y-transparent border-r-[14px] border-r-current" />
        </button>
        <button
          onClick={handleAttemptExit}
          className="p-2 text-gray-400 hover:text-red-400 active:scale-95 transition"
          title="Home Button (Anti-Cheat Intercepted)"
        >
          <div className="w-4 h-4 rounded-full border-2 border-current" />
        </button>
        <button
          onClick={handleAttemptExit}
          className="p-2 text-gray-400 hover:text-red-400 active:scale-95 transition"
          title="Recents Button (Anti-Cheat Intercepted)"
        >
          <div className="w-3.5 h-3.5 border-2 border-current rounded-sm" />
        </button>
      </div>
    </div>
  );
};
