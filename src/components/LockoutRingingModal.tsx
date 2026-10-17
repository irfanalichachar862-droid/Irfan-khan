import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  KeyRound,
  Lock,
  ShieldAlert,
  Volume2,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import jsQR from 'jsqr';
import { AlarmItem, RegisteredTag, verifyBarcodeMatch } from '../utils/antiCheatRules';
import {
  playAlarmSound,
  stopAlarmSound,
  playTestBeep,
  setMasterVolume,
} from '../utils/audioSynthesizer';

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
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [scanStatusType, setScanStatusType] = useState<'error' | 'success' | 'info'>('info');
  const [volume, setVolume] = useState<number>(1.0);
  const [showVolumeAlert, setShowVolumeAlert] = useState<boolean>(false);
  const [showExitAlert, setShowExitAlert] = useState<boolean>(false);
  const [manualCodeInput, setManualCodeInput] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  // Start alarm audio on mount
  useEffect(() => {
    playAlarmSound((alarm.toneId as any) || 'loud_siren', 1.0, {
      customDataUrl: alarm.customToneDataUrl,
      customFreq: alarm.customToneFreq,
    });
    return () => {
      stopAlarmSound();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [alarm.toneId, alarm.customToneDataUrl, alarm.customToneFreq]);

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
        setCameraError(
          'Live camera feed blocked. Capture QR photo with your phone camera or enter your physical tag code below.'
        );
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
      if (
        videoRef.current &&
        videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA
      ) {
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
              return;
            }
          }
        }
      }
      animFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animFrameRef.current = requestAnimationFrame(scanFrame);
  };

  const handlePhotoCaptureScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height);
        if (code && code.data) {
          handleBarcodeScanned(code.data);
        } else {
          setScanStatus('No valid QR code found in photo. Ensure tag is well-lit.');
          setScanStatusType('error');
          playTestBeep(false);
        }
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleBarcodeScanned = (scannedCode: string) => {
    if (!targetTag) {
      handleSuccess();
      return;
    }

    const isMatch = verifyBarcodeMatch(scannedCode, targetTag.codeHash, targetTag.codeValue);

    if (isMatch) {
      handleSuccess();
    } else {
      setScanStatus(
        `Code mismatch! Required physical tag: ${targetTag.name} (${targetTag.location})`
      );
      setScanStatusType('error');
      playTestBeep(false);

      setTimeout(() => {
        setScanStatus(null);
        startScanningLoop();
      }, 2500);
    }
  };

  const handleSuccess = () => {
    stopAlarmSound();
    playTestBeep(true);
    setScanStatus('Physical Tag Verified! Alarm Dismissed.');
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
      {/* Top Guard Bar */}
      <div className="bg-red-500/20 border-b border-red-500/40 px-4 py-2 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2 text-red-400 font-bold">
          <ShieldAlert className="w-4 h-4 animate-pulse text-red-500" />
          <span>SCANWAKE ANTI-CHEAT LOCKOUT ENGAGED</span>
        </div>
        <div className="flex items-center space-x-3 text-gray-400">
          <span style={{ color: 'var(--sw-primary)' }}>VOLUME GUARD: ON</span>
          <span className="hidden sm:inline text-gray-500">|</span>
          <span className="text-red-400">EXIT: LOCKED</span>
        </div>
      </div>

      {/* Main Lockout Header */}
      <div className="px-4 py-3 text-center max-w-xl mx-auto w-full">
        <div
          style={{
            backgroundColor: 'var(--sw-surface)',
            color: 'var(--sw-primary)',
            borderColor: 'color-mix(in srgb, var(--sw-primary) 40%, transparent)',
          }}
          className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-wider mb-1.5"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Must Scan Physical Barcode</span>
        </div>

        <h1
          id="lockout-dialog-title"
          style={{ color: 'var(--sw-primary)' }}
          className="text-2xl sm:text-4xl font-black tracking-tight"
        >
          {alarm.label || 'Morning Wake'}
        </h1>

        <div className="mt-1.5 text-sm text-gray-300">
          {targetTag ? (
            <div className="flex flex-col items-center">
              <span
                style={{ color: 'var(--sw-accent)' }}
                className="text-sm sm:text-base font-bold"
              >
                Target: {targetTag.name}
              </span>
              <span className="text-xs text-gray-400">
                Location: {targetTag.location} ({targetTag.codeFormat})
              </span>
            </div>
          ) : (
            <span style={{ color: 'var(--sw-primary)' }}>
              Scan any registered household QR code
            </span>
          )}
        </div>

        {chainInfo && (
          <div className="mt-1.5 inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded bg-[#64CCC5]/20 text-[#7DE2D1] text-xs font-medium border border-[#64CCC5]/40">
            <Zap className="w-3 h-3" />
            <span>
              Chain Step {chainInfo.stepIndex + 1} of {chainInfo.totalSteps} ({chainInfo.chainName})
            </span>
          </div>
        )}
      </div>

      {/* Camera / Barcode Scanner Viewport */}
      <div className="flex-1 px-4 max-w-md mx-auto w-full flex flex-col items-center justify-center relative">
        <div
          style={{ borderColor: 'var(--sw-primary)' }}
          className="relative w-full aspect-square max-w-[260px] sm:max-w-[300px] rounded-2xl overflow-hidden bg-[#1C232B] border-2 shadow-xl flex items-center justify-center"
        >
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          <canvas ref={canvasRef} className="hidden" />

          {cameraError && (
            <div className="absolute inset-0 p-4 bg-[#1C232B]/95 flex flex-col items-center justify-center text-center">
              <Camera className="w-10 h-10 text-gray-500 mb-2" />
              <p className="text-xs text-gray-300 mb-3">{cameraError}</p>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                style={{ backgroundColor: 'var(--sw-primary)', color: 'var(--sw-bg)' }}
                className="py-2 px-3.5 rounded-xl text-xs font-bold flex items-center space-x-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Capture QR with Camera</span>
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCaptureScan}
                className="hidden"
              />
            </div>
          )}

          {/* Animated Laser Reticle */}
          <div className="absolute inset-4 pointer-events-none border border-white/20 rounded-xl flex flex-col justify-between">
            <div className="flex justify-between">
              <div
                style={{ borderColor: 'var(--sw-primary)' }}
                className="w-6 h-6 border-t-2 border-l-2"
              />
              <div
                style={{ borderColor: 'var(--sw-primary)' }}
                className="w-6 h-6 border-t-2 border-r-2"
              />
            </div>
            <div
              style={{ backgroundColor: 'var(--sw-primary)' }}
              className="w-full h-0.5 animate-pulse"
            />
            <div className="flex justify-between">
              <div
                style={{ borderColor: 'var(--sw-primary)' }}
                className="w-6 h-6 border-b-2 border-l-2"
              />
              <div
                style={{ borderColor: 'var(--sw-primary)' }}
                className="w-6 h-6 border-b-2 border-r-2"
              />
            </div>
          </div>

          {scanStatus && (
            <div
              className={`absolute bottom-3 left-3 right-3 py-2 px-3 rounded-lg text-xs font-semibold text-center backdrop-blur-md ${
                scanStatusType === 'error'
                  ? 'bg-red-500/90 text-white'
                  : 'bg-emerald-500/90 text-white'
              }`}
            >
              {scanStatus}
            </div>
          )}
        </div>

        {/* Physical Barcode Code Verification Input */}
        <div className="mt-3 w-full max-w-[300px]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualCodeInput.trim()) {
                handleBarcodeScanned(manualCodeInput.trim());
              }
            }}
            className="flex space-x-2"
          >
            <div className="relative flex-1">
              <KeyRound className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={manualCodeInput}
                onChange={(e) => setManualCodeInput(e.target.value)}
                placeholder={
                  targetTag ? `Enter code (${targetTag.codeValue})` : 'Enter physical tag code'
                }
                className="w-full bg-[#1C232B] border border-gray-700 focus:border-[var(--sw-primary)] rounded-xl py-2 pl-8 pr-2.5 text-xs text-white font-mono outline-none"
              />
            </div>
            <button
              type="submit"
              style={{ backgroundColor: 'var(--sw-primary)', color: 'var(--sw-bg)' }}
              className="py-2 px-3.5 rounded-xl text-xs font-bold flex items-center space-x-1 shrink-0"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Verify</span>
            </button>
          </form>
        </div>
      </div>

      {/* Volume Guard & Lockout Indicators */}
      <div className="px-4 py-2.5 max-w-md mx-auto w-full">
        {showVolumeAlert && (
          <div className="mb-2 p-2.5 bg-red-500/90 text-white rounded-xl text-xs font-bold flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Anti-Cheat Guard: Volume override active! Volume locked at 100%.</span>
          </div>
        )}

        {showExitAlert && (
          <div className="mb-2 p-2.5 bg-red-600 text-white rounded-xl text-xs font-bold flex items-center space-x-2">
            <Lock className="w-4 h-4 shrink-0" />
            <span>
              LOCKOUT ENGAGED: Back button and app switching are disabled until barcode is verified!
            </span>
          </div>
        )}

        <div className="bg-[#1C232B] rounded-xl p-3 border border-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
            <div className="flex items-center space-x-1.5">
              <Volume2 className="w-4 h-4" style={{ color: 'var(--sw-primary)' }} />
              <span>Alarm Volume (Guard Protected)</span>
            </div>
            <span
              style={{ color: 'var(--sw-primary)' }}
              className="font-mono font-bold"
            >
              {Math.round(volume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            style={{ accentColor: 'var(--sw-primary)' }}
            className="w-full h-2 bg-gray-700 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* Hardware Navigation Guard Bar */}
      <div className="bg-[#07090b] border-t border-gray-800/80 px-8 py-2.5 flex items-center justify-around">
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
